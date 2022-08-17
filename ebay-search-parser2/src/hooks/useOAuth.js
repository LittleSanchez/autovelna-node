import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { API_TOKEN } from "../consts/api";

export const AuthContext = createContext();

export const AuthContextProvider = ({children}) => {
    const [token, setToken] = useState();

    const fetchToken = async () => {
        const response = await axios.get(API_TOKEN);
        console.log("Token", response.data);
        // setToken(response.data.request_headers)
        setToken(response.data);
    }

    const update = () => fetchToken();

    useEffect(() => {update()}, [])
    return <AuthContext.Provider value={{
        token, 
        update
    }}>
        {children}
    </AuthContext.Provider>
}

const useOAuth = () => {
    return useContext(AuthContext);
}

export default useOAuth;