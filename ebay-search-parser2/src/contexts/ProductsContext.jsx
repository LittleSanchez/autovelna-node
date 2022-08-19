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
            [productId]: offerId
        };
        setProductOffers({...productOffers, ...newProductOffer})
    }

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
            setProductsRaw(await getData(searchData, withDetails));
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
            return await addProduct({
                productRaw: productsRaw.find((x) => x.id === productId),
                productCompatibility: productCompatibility,
                offerRaw: offerRaw,
                token: apiToken,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAddAllProducts = async () => {
        const offerIds = {};
        for (let product of productsRaw) {
            const offerId = await fetchAddProductById(product.id);
            if (offerId){
                console.log("Adding offer Id: ", offerId);
                offerIds[product.id] = offerId;
            }
        }
        console.log("All ready offers: ", offerIds);
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
