import axios from "axios";
import { API_EANS, API_IMAGE_TRANSFER, API_SELLER_URL, API_URL, COMPABILITY_TEMPLATE_URL, EOLTAS_COMPATIBILITY } from "../consts/api";
import { redirectRequest } from "./add-product";

export const getData = async (searchData, withDetails) => {
    try {
        const response = await axios.get(API_URL, {
            params: {
                q: searchData,
                d: withDetails ? true : undefined,
            },
        });
        return response.data;
    } catch (e) {
        console.error(e);
    } finally {
    }
};

export const getSellerData = async (searchData, startPage, pagesCount, withDetails) => {
    try {
        const response = await axios.get(API_SELLER_URL, {
            params: {
                seller: searchData,
                s: startPage,
                pages: pagesCount,
                d: withDetails ? true : undefined,
            },
        });
        return response.data;
    } catch (e) {
        console.error(e);
    } finally {
    }
};

export const getConvertedImages = async (data, companyName) => {
    console.log(data?.map((x) => x.image_url));
    try {
        const response = await axios.post(API_IMAGE_TRANSFER, {
            companyName: companyName,
            images: data?.map((x) => x.image_url),
        });
        return data.map((x, i) => ({
            ...x,
            image_url: response.data[i],
        }))
    } catch (e) {
        console.error(e);
    } finally {
    }
};

export const getEans = async (productsRaw) => {
    const mpns = productsRaw.map(x => x.brand_code);
    console.log("MPNs: ", mpns);
    if (!mpns || mpns.length === 0) {
        console.error("No MPNs to send");
        return;
    }
    try {
        const response = await axios.post(API_EANS, {
            mpns,
        });
        return productsRaw.map((x, i) => ({
            ...x,
            ean: response.data[x.brand_code]
        }));
    } catch (e) {
        console.error(e);
    }

}

export const fetchCompability = async (productHash, token) => {
    console.log("Sending request, id: ", productHash);
    const response = await redirectRequest({
        data: {},
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        url: EOLTAS_COMPATIBILITY(productHash),
        method: 'GET'
    })
    console.log("Received request, id: ", productHash);
    console.log(response.data.data);
    return response.data.data;
}