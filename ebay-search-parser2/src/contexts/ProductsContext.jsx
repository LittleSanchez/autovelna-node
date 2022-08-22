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

    const appendProductOffer = (productId, offerId) => {
        const newProductOffer = {
            [productId]: offerId,
        };
        setProductOffers({ ...productOffers, ...newProductOffer });
    };

    useEffect(() => {
        downloadFile(
            productsRaw,
            `search-results-${new Date().toISOString().replace(/:/g, "-")}.json`
        );
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
        pagesCount,
        withDetails
    ) => {
        try {
            setProductsRaw(
                await getSellerData(searchData, pagesCount, withDetails)
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
            console.log("Starting on id: ", productId);
            const productCompatibility = await fetchCompability(
                productId,
                compatibilityToken
            );
            const offerId = await addProduct({
                productRaw: productsRaw.find((x) => x.id === productId),
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
        for (let product of productsRaw) {
            const offerId = await fetchAddProductById(product.id);
            if (offerId && typeof offerId !== "object") {
                console.log("Adding offer Id: ", offerId);
                offerIds[product.id] = offerId;
                successfulProducts.push({
                    productRaw: product,
                    offerId,
                });
            } else {
                erroredProducts.push({
                    productRaw: product,
                    error: offerId,
                });
            }
        }
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
            await publishOffer({
                offerId: productOffers[productId],
                token: apiToken,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPublishAllOffers = async () => {
        for (let product of productsRaw) {
            await fetchPublishOfferById(product.id);
        }
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
