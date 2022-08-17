import AuthApiContextProvider from "./contexts/AuthApiContext";
import OfferInfoProvider from "./contexts/OfferInfoContext";
import ProductsContextProvider from "./contexts/ProductsContext";
import { AuthContextProvider } from "./hooks/useOAuth";
import Home from "./pages/Home";

const App = () => {
    return (
        <OfferInfoProvider>
            <AuthContextProvider>
                <AuthApiContextProvider>
                    <ProductsContextProvider>
                        <Home />
                    </ProductsContextProvider>
                </AuthApiContextProvider>
            </AuthContextProvider>
        </OfferInfoProvider>
    );
};

export default App;
