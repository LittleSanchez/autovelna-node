import { createContext, useContext, useState } from "react";

const initialState = {
    fulfillmentPolicy: undefined,
    returnPolicy: undefined,
    paymentPolicy: undefined,
    inventoryLocation: undefined,
    setFulfillmentPolicy: (value) => {},
    setReturnPolicy: (value) => {},
    setPaymentPolicy: (value) => {},
    setInventoryLocation: (value) => {},
};

const OfferInfoContext = createContext(initialState);

const OfferInfoProvider = ({ children }) => {
    const [fulfillmentPolicy, setFulfillmentPolicy] = useState('');
    const [returnPolicy, setReturnPolicy] = useState('');
    const [paymentPolicy, setPaymentPolicy] = useState('');
    const [inventoryLocation, setInventoryLocation] = useState('');

    return (
        <OfferInfoContext.Provider
            value={{
                fulfillmentPolicy,
                returnPolicy,
                paymentPolicy,
                inventoryLocation,
                setFulfillmentPolicy,
                setReturnPolicy,
                setPaymentPolicy,
                setInventoryLocation,
            }}>
            {children}
        </OfferInfoContext.Provider>
    );
};

export const useOffer = () => {
    return useContext(OfferInfoContext);
};

export default OfferInfoProvider;
