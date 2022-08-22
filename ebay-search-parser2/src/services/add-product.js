import axios from "axios";
import { REDIRECT_URL } from "../consts/api";

const CURRENCY_NAMES = {
    EUR: 1,
    USD: 0.995
}

export const BrowseAPI = {
    getItem: (id) => `https://api.ebay.com/buy/browse/v1/item/v1|${id}|0?fieldgroups=PRODUCT`,
    getItems: (ids) => `https://api.ebay.com/buy/browse/v1/item?item_ids=${ids.map(x => `v1|${x}|0`).join(',')}`
}

export const InventoryAPI = {
    createOrReplaceInventoryItem: (sku) => `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`,
    createOrReplaceProductCompatibility: (sku) => `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}/product_compatibility`,
    createOffer: () => `https://api.ebay.com/sell/inventory/v1/offer`,
    getOffers: (sku) => `https://api.ebay.com/sell/inventory/v1/offer?sku=${sku}`,
    deleteOffer: (offerId) => `https://api.ebay.com/sell/inventory/v1/offer/${offerId}`,
    publishOffer: (offerId) => `https://api.ebay.com/sell/inventory/v1/offer/${offerId}/publish`,
    withdrawOffer: (offerId) => `https://api.ebay.com/sell/inventory/v1/offer/${offerId}/withdraw`,
}

const priceConvertion = (price, fromCurrency, toCurrency, percentage) => {
    let EURvalue = 0;
    switch(fromCurrency) {
        case CURRENCY_NAMES.USD:
            EURvalue = price / CURRENCY_NAMES.USD;
            break;
        default:
            EURvalue = price;
            break;
    }
    let targetValue = 0
    switch(toCurrency) {
        case CURRENCY_NAMES.USD:
            targetValue = EURvalue  * CURRENCY_NAMES.USD;
            break;
        default:
            targetValue = EURvalue;
            break;
    }
    return targetValue;
}

export const SKU = (mpn) => `av-${mpn.replace(/[\s/]+/g, '_')}`;

export const AxiosHeaders = (token) => ({
    "Authorization": 'Bearer ' + token,
    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_DE',
    'Content-Language': 'de-DE'
})

const convertCompatibilities = (rawCompatibilities) => {
    const properties = rawCompatibilities?.compatibleProducts?.members?.map(x => x.productProperties) ?? undefined;
    const result = {
        compatibleProducts: []
    }
    if (!properties) return result;
    for (let prop of properties) {
        const newCompatibility = {
            note: '',
            productFamilyProperties: {}
        };
        const keys = Object.keys(prop);
        const values = Object.values(prop);
        for (let i = 0; i < keys.length; i++) {
            newCompatibility.productFamilyProperties[keys[i].toLowerCase()] = values[i];
        }
        const newCompatibilitySeparatedByYear = newCompatibility.productFamilyProperties.year.split('\u000b').map((x, i) => ({
            ...newCompatibility,
            productFamilyProperties: {
                ...newCompatibility.productFamilyProperties,
                year: x
            }
        }))
        for (const nCSBY of newCompatibilitySeparatedByYear) {
            result.compatibleProducts.push(nCSBY)
        }
    }
    return result;
}

const generateInventoryItem = async (productRawData, productApidata) => {
    const inventoryItem = {
        product: {
            brand: productRawData?.aspects.Hersteller[0],
            mpn: productRawData?.aspects.Herstellernummer[0],//productApidata?.mpn,
            imageUrls: [
                productRawData.image_url
            ],
            aspects: productRawData?.aspects,
            title: productRawData?.name?.substring(0, 80),
        },
        condition: 'NEW'//productRawData?.aspects.Condition[0].toUpperCase(),
        // availability: {
        //     shipToLocationAvailability: {
        //         quantity: 1,
        //     }
        // }
    }
    const aspectsKeys = Object.keys(inventoryItem.product.aspects);
    const aspectsValues = Object.values(inventoryItem.product.aspects);
    for (let i = 0; i < aspectsKeys.length; i++) {
        inventoryItem.product.aspects[aspectsKeys[i]] = [...aspectsValues[i].map(x => x.substring(0, 65),)]
    }
    return inventoryItem;
}

const generateoffer = async (productRaw, inventoryItem, offerRaw) => {
    const priceAffection = 0.95;
    return {
        "sku": SKU(inventoryItem.product.mpn),
        "marketplaceId": "EBAY_DE",
        "format": "FIXED_PRICE",
        "listingDescription": `${inventoryItem.product.title}`,
        "availableQuantity": 100,
        "quantityLimitPerBuyer": 10,
        "pricingSummary": {
            "price": {
                "value":  `${priceConvertion(+productRaw.price.replace('$', ''), CURRENCY_NAMES.USD, CURRENCY_NAMES.EUR) * priceAffection}`,
                "currency": "EUR"
            }
        },
        "listingPolicies": {
            "fulfillmentPolicyId": offerRaw.fulfillmentPolicy,
            "paymentPolicyId": offerRaw.paymentPolicy,
            "returnPolicyId": offerRaw.returnPolicy,
        },
        "categoryId": productRaw.category_id,
        "merchantLocationKey": offerRaw.inventoryLocation,
    }

}

const redirectRequest = async (options) => {
    const response = await axios.post(REDIRECT_URL, options);
    console.log("REDIRECT RESPONSE: ", response)
    return response;
}

const fetchDataWithId = async (productId, headers) => {
    const { data } = await axios.get(BrowseAPI.getItem(productId), {
        headers: headers
    })
    return data;
}

const fetchCreateInventoryItem = async (inventoryItem, sku, headers) => {
    console.log("Fetching Inventory Item Response")
    const response = await redirectRequest({
        data: inventoryItem,
        headers: headers,
        url: InventoryAPI.createOrReplaceInventoryItem(sku),
        method: 'PUT'
    })
    // const response = await axios.put(InventoryAPI.createOrReplaceInventoryItem(sku), inventoryItem, {
    //     headers: headers,
    // });
    console.log("Create Inventory Item Response: ", response.status, response.data);
    return response.data;
}

const fetchAddProductCompatibility = async (productCompatibility, sku, headers) => {
    const response = await redirectRequest({
        data: productCompatibility,
        headers: headers,
        url: InventoryAPI.createOrReplaceProductCompatibility(sku),
        method: 'PUT'
    });

    console.log("Create Product Compatibility Response: ", response.status, response.data)
    return response.data;
}

const fetchCreateOffer = async (offerData, sku, headers) => {
    const response = await redirectRequest({
        data: offerData,
        headers: headers,
        url: InventoryAPI.createOffer(),
        method: 'POST'
    });

    console.log("Create Offer Response: ", response.status, response.data)
    return response.data;
}

const fetchGetOfferId = async (sku, headers) => {
    const response = await redirectRequest({
        data: {},
        headers: headers,
        url: InventoryAPI.getOffers(sku),
        method: 'GET'
    });

    console.log("Create Product Compatibility Response: ", response.status, response.data)
    return response.data;
}

const fetchDeleteOffer = async (offerId, headers) => {
    const response = await redirectRequest({
        data: {},
        headers: headers,
        url: InventoryAPI.deleteOffer(offerId),
        method: 'DELETE'
    });

    console.log("Create Product Compatibility Response: ", response.status, response.data)
    return response.data;
}
const fetchPublishOffer = async (offerId, headers) => {
    const response = await redirectRequest({
        data: {},
        headers: headers,
        url: InventoryAPI.publishOffer(offerId),
        method: 'POST'
    });

    console.log("Publish Offer Response: ", response.status, response.data)
    return response.data;
}
const fetchWithdrawOffer = async (offerId, headers) => {
    const response = await redirectRequest({
        data: {},
        headers: headers,
        url: InventoryAPI.withdrawOffer(offerId),
        method: 'POST'
    });

    console.log("Withdraw Offer Response: ", response.status, response.data)
    return response.data;
}

export const addProduct = async ({ productRaw, productCompatibility, offerRaw, token }) => {

    console.log("Product data: ", productRaw);
    const convertedCompatibilities = convertCompatibilities(productCompatibility);
    console.log("Product compatibility: ", convertedCompatibilities);
    // const productApiData = await fetchDataWithId(productData.id, AxiosHeaders(token));
    // console.log("Product API Details: ", productApiData)
    const inventoryItem = await generateInventoryItem(productRaw);
    console.log("Generated Inventory item: ", inventoryItem);

    await fetchCreateInventoryItem(inventoryItem, SKU(inventoryItem.product.mpn), AxiosHeaders(token))
    await fetchAddProductCompatibility(convertedCompatibilities, SKU(inventoryItem.product.mpn), AxiosHeaders(token))
    console.log("Raw offer data: ", offerRaw);
    const offerData = await generateoffer(productRaw, inventoryItem, offerRaw);
    console.log("Ready offer data: ", offerData);
    const { data } = await fetchCreateOffer(offerData, SKU(inventoryItem.product.mpn), AxiosHeaders(token));
    return data.offerId;
}

export const deleteProduct = async ({ productRaw, token }) => {
    const mpn = productRaw?.aspects.Herstellernummer[0];
    console.log("MPN: ", mpn)
    const sku = SKU(mpn);
    console.log("SKU: ", sku);
    const offerResponse = await fetchGetOfferId(sku, AxiosHeaders(token));
    const offerId = offerResponse.data.offers[0].offerId;
    console.log("OFFER ID: ", offerId);
    await fetchDeleteOffer(offerId, AxiosHeaders(token))

}

export const publishOffer = async ({ offerId, token }) => {
    await fetchPublishOffer(offerId, AxiosHeaders(token));
}

export const withdrawOffer = async ({ offerId, token }) => {
    await fetchWithdrawOffer(offerId, AxiosHeaders(token));
}