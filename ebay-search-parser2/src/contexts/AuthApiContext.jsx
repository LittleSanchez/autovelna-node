import { createContext, useContext, useState } from "react";

const initialState = {
    apiToken: undefined,
    setApiToken: (newToken) => {},
};

const AuthApiContext = createContext(initialState);

const AuthApiContextProvider = ({ children }) => {
    const [apiToken, setApiToken] = useState();
    return (
        <AuthApiContext.Provider
            value={{
                apiToken,
                setApiToken,
            }}>
            {children}
        </AuthApiContext.Provider>
    );
};

export const useAuthApi = () => {
    return useContext(AuthApiContext);
};

export default AuthApiContextProvider;