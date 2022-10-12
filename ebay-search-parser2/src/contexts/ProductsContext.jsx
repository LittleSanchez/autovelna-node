import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import useOAuth from "../hooks/useOAuth";
import {
    addProduct,
    AxiosHeaders,
    BrowseAPI,
    deleteProduct,
    publishOffer,
    withdrawOffer,
} from "../services/add-product";
import { downloadFile } from "../services/downloadData";
import {
    fetchCompability,
    getConvertedImages,
    getData,
    getEans,
    getSellerData,
} from "../services/server-requests";
import { useAuthApi } from "./AuthApiContext";
import { useOffer } from "./OfferInfoContext";

export const REQUEST_TYPES = {
    search: "1",
    seller: "2",
};

const initialState = {
    productsRaw: [],
    productsApi: [],
    productsCompabitility: [],
    setProductsRaw: () => {},
    setProductsApi: () => {},
    setProductsCompatibility: () => {},
    setProductOffers: () => {},
    fetchProductRaw: (searchData, withDetails) => {},
    fetchSellerProductsRaw: (searchData, pagesCount, withDetails) => {},
    fetchEans: () => {},
    fetchConvertedImages: (searchData, currentRequest) => {},
    fetchProductsApiFromCurrentRaw: () => {},
    fetchAddProductById: (productId) => {},
    fetchAddAllProducts: () => {},
    fetchDeleteProductById: (productId) => {},
    fetchDeleteAllProducts: () => {},
    fetchPublishOfferById: (productId) => {},
    fetchPublishAllOffers: () => {},
    fetchWithdrawOfferById: (productId) => {},
    fetchWithdrawAllOffers: () => {},
};

const ProductsContext = createContext(initialState);

const ProductsContextProvider = ({ children }) => {
    const [productsRaw, setProductsRaw] = useState([]);
    const [productsApi, setProductsApi] = useState([]);
    const [productsCompabitility, setProductsCompatibility] = useState([]);
    const [productOffers, setProductOffers] = useState({});
    const [productListings, setProductListings] = useState({});

    const appendProductOffer = (productId, offerId) => {
        const newProductOffer = {
            [productId]: offerId,
        };
        setProductOffers({ ...productOffers, ...newProductOffer });
    };

    useEffect(() => {
        if (productsRaw && productsRaw.length > 0) {
            downloadFile(
                productsRaw,
                `search-results-${new Date()
                    .toISOString()
                    .replace(/:/g, "-")}.json`
            );
        }
    }, [productsRaw]);

    const offerRaw = useOffer();

    const { apiToken } = useAuthApi();
    const { token: compatibilityToken, update: updateCompatibilityToken } =
        useOAuth();

    useEffect(() => {
        console.log("Current Products State: ", {
            productsRaw,
            productsApi,
            productsCompabitility,
        });
    }, [productsRaw, productsApi, productsCompabitility]);

    const fetchProductRaw = async (searchData, withDetails) => {
        try {
            const productRawData = await getData(searchData, withDetails);
            console.log(productRawData);
            setProductsRaw(productRawData);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchSellerProductsRaw = async (
        searchData,
        startPage,
        pagesCount,
        withDetails
    ) => {
        try {
            setProductsRaw(
                await getSellerData(
                    searchData,
                    startPage,
                    pagesCount,
                    withDetails
                )
            );
        } catch (e) {
            console.error(e);
        }
    };

    const fetchConvertedImages = async (searchData, currentRequest) => {
        try {
            setProductsRaw(
                await getConvertedImages(
                    productsRaw,
                    currentRequest === REQUEST_TYPES.seller ? searchData : ""
                )
            );
        } catch (e) {
            console.error(e);
        }
    };

    const fetchEans = async () => {
        try {
            setProductsRaw(await getEans(productsRaw));
        } catch (e) {
            console.error(e);
        }
    };

    const fetchProductsApiFromCurrentRaw = async () => {
        try {
            if (!apiToken) return;
            console.log("Fetching from API, my token: ", apiToken);
            setProductsApi([]);
            for (let i = 0; i < productsRaw.length; i += 20) {
                setProductsApi([
                    ...productsApi,
                    ...(await axios.get(
                        BrowseAPI.getItems(
                            productsRaw
                                .slice(i, i + 20)
                                .map(
                                    (x) =>
                                        [
                                            ...x.url.matchAll(/itm\/([\d]+)/g),
                                        ][0][1]
                                )
                        ),
                        {
                            headers: AxiosHeaders(apiToken),
                        }
                    )),
                ]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAddProductById = async (productId) => {
        try {
            const productRaw = productsRaw.find((x) => x.id === productId);
            console.log("Starting on id: ", productRaw.hash_token);
            const productCompatibility = await fetchCompability(
                productRaw.hash_token,
                compatibilityToken
            );
            const offerId = await addProduct({
                productRaw: productRaw,
                productCompatibility: productCompatibility,
                offerRaw: offerRaw,
                token: apiToken,
            });
            // setProductOffers({
            //     ...productOffers,
            //     [productId]: offerId,
            // });
            return offerId;
        } catch (e) {
            console.error(e);
            return e;
        }
    };

    const fetchAddAllProducts = async () => {
        const successfulProducts = [];
        const erroredProducts = [];
        const offerIds = {};
        for (let i = 0; i < productsRaw.length; i += 20) {
            const tasks = [
                ...Array(Math.min(20, productsRaw.length - i)).keys(),
            ]
                .map((x) => x + i)
                .map((x) => fetchAddProductById(productsRaw[x].id));
            const result = (await Promise.allSettled(tasks)).map(
                (x) => x.value
            );
            for (let j = 0; j < 20; j++) {
                if (result[j] && typeof result[j] !== "object") {
                    console.log("Adding offer Id: ", result[j]);
                    offerIds[productsRaw[i + j].id] = result[j];
                    successfulProducts.push({
                        productRaw: productsRaw[i + j],
                        offerId: result[j],
                    });
                } else {
                    erroredProducts.push({
                        productRaw: productsRaw[i + j],
                        error: result[j],
                    });
                }
            }
        }
        // for (let product of productsRaw) {
        //     const offerId = await fetchAddProductById(product.id);
        //     if (offerId && typeof offerId !== "object") {
        //         console.log("Adding offer Id: ", offerId);
        //         offerIds[product.id] = offerId;
        //         successfulProducts.push({
        //             productRaw: product,
        //             offerId,
        //         });
        //     } else {
        //         erroredProducts.push({
        //             productRaw: product,
        //             error: offerId,
        //         });
        //     }
        // }
        console.log("All ready offers: ", offerIds);
        console.log("Successful Products: ", successfulProducts);
        console.log("Errored products: ", erroredProducts);
        await downloadFile(
            successfulProducts,
            `successful-${new Date().toISOString().replace(/:/g, "-")}.json`
        );
        await downloadFile(
            erroredProducts,
            `errored-${new Date().toISOString().replace(/:/g, "-")}.json`
        );
        setProductOffers(offerIds);
    };

    const fetchPublishOfferById = async (productId) => {
        try {
            console.log(
                `Extracting offerId with productId [${productId}], offerId - [${productOffers[productId]}], productOffers: `,
                productOffers
            );
            const listingId = await publishOffer({
                offerId: productOffers[productId],
                token: apiToken,
            });
            return listingId;
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPublishAllOffers = async () => {
        const successfulOffers = [];
        const erroredOffers = [];
        const listingIds = {};
        for (let i = 0; i < productsRaw.length; i += 20) {
            const tasks = [
                ...Array(Math.min(20, productsRaw.length - i)).keys(),
            ]
                .map((x) => x + i)
                .map((x) => fetchPublishOfferById(productsRaw[x].id));
            const result = (await Promise.allSettled(tasks)).map(
                (x) => x.value
            );
            for (let j = 0; j < 20; j++) {
                if (result[j] && typeof result[j] !== "object") {
                    console.log("Adding offer Id: ", result[j]);
                    listingIds[productsRaw[i + j].id] = result[j];
                    successfulOffers.push({
                        productRaw: productsRaw[i + j],
                        offerId: productOffers[productsRaw[i + j].id],
                        listingId: result[j],
                    });
                } else {
                    erroredOffers.push({
                        productRaw: productsRaw[i + j],
                        offerId: productOffers[productsRaw[i + j].id],
                    });
                }
            }
        }
        // for (let product of productsRaw) {
        //     const listingId = await fetchPublishOfferById(product.id);
        //     if (listingId) {
        //         listingIds[product.id] = listingId;
        //         successfulOffers.push({
        //             productRaw: product,
        //             offerId: productOffers[product.id],
        //             listingId: listingId,
        //         })
        //     } else {
        //         erroredOffers.push({
        //             productRaw: product,
        //             offerId: productOffers[product.id],
        //         })
        //     }
        // }
        await downloadFile(
            successfulOffers,
            `successful-offers-${new Date()
                .toISOString()
                .replace(/:/g, "-")}.json`
        );
        await downloadFile(
            erroredOffers,
            `errored-offers-${new Date().toISOString().replace(/:/g, "-")}.json`
        );
        setProductListings(listingIds);
    };
    const fetchWithdrawOfferById = async (productId) => {
        try {
            await withdrawOffer({
                offerId: productOffers[productId],
                token: apiToken,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const fetchWithdrawAllOffers = async () => {
        for (let product of productsRaw) {
            await fetchWithdrawOfferById(product.id);
        }
    };
    const fetchDeleteProductById = async (productId) => {
        try {
            await deleteProduct({
                productRaw: productsRaw.find((x) => x.id === productId),
                token: apiToken,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const fetchDeleteAllProducts = async () => {
        for (let product of productsRaw) {
            await fetchDeleteProductById(product.id);
        }
    };

    return (
        <ProductsContext.Provider
            value={{
                productsRaw,
                productsApi,
                productsCompabitility,
                setProductsRaw,
                setProductsApi,
                setProductsCompatibility,
                setProductOffers,
                fetchProductRaw,
                fetchSellerProductsRaw,
                fetchConvertedImages,
                fetchEans,
                fetchProductsApiFromCurrentRaw,
                fetchAddProductById,
                fetchAddAllProducts,
                fetchDeleteProductById,
                fetchDeleteAllProducts,
                fetchPublishOfferById,
                fetchPublishAllOffers,
                fetchWithdrawOfferById,
                fetchWithdrawAllOffers,
            }}>
            {children}
        </ProductsContext.Provider>
    );
};

export const useProducts = () => {
    return useContext(ProductsContext);
};

export default ProductsContextProvider;
