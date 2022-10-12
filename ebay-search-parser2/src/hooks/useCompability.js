import axios from "axios";
import { useEffect, useState } from "react"
import { COMPABILITY_TEMPLATE_URL, OAUTH_PUBLIC_KEY } from "../consts/api";
import { useProducts } from "../contexts/ProductsContext";
import { fetchCompability } from "../services/server-requests";
import useOAuth from "./useOAuth";

const useCompability = (productId) => {
    const [compability, setCompability] = useState();
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    const { productsRaw } = useProducts();

    const { token, update } = useOAuth()

    useEffect(() => {
        if (!token) {
            update();
            return;
        }
        (async () => {
            setLoading(true);
            setReady(false);
            setCompability(await fetchCompability(productsRaw.find(x => x.id === productId).hash_token, token));
            setLoading(false);
            setReady(true);
        })()
    }, [productId, productsRaw, token, update]);

    return {
        compability, loading, ready
    }
}

export default useCompability;