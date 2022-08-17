import axios from "axios";
import { API_IMAGE_TRANSFER, API_SELLER_URL, API_URL, COMPABILITY_TEMPLATE_URL } from "../consts/api";

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

export const getSellerData = async (searchData, pagesCount, withDetails) => {
    try {
        const response = await axios.get(API_SELLER_URL, {
            params: {
                seller: searchData,
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
            companyName:companyName,
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

export const fetchCompability = async (productId, token) => {
    console.log("Sending request, id: ", productId);
    const response = await axios.get(COMPABILITY_TEMPLATE_URL(productId, 5000, 0), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US'
        }
    });
    console.log("Received request, id: ", productId);
    console.log(response.data);
    return response.data;
}