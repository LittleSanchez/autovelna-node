import axios from "axios";
import { useEffect, useState } from "react"
import { COMPABILITY_TEMPLATE_URL, OAUTH_PUBLIC_KEY } from "../consts/api";
import { fetchCompability } from "../services/server-requests";
import useOAuth from "./useOAuth";

const useCompability = (productId) => {
    const [compability, setCompability] = useState();
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    const { token, update } = useOAuth()

    useEffect(() => {
        if (!token) {
            update();
            return;
        }
        (async () => {
            setLoading(true);
            setReady(false);
        setCompability(await fetchCompability(productId, token));
            setLoading(false);
            setReady(true);
        })()
    }, [productId]);

    return {
        compability, loading, ready
    }
}

export default useCompability;