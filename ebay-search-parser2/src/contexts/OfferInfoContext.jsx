import { createContext, useContext, useState } from "react";

const initialState = {
    fulfillmentPolicy: undefined,
    returnPolicy: undefined,
    paymentPolicy: undefined,
    inventoryLocation: undefined,
    categoryId: undefined,
    setFulfillmentPolicy: (value) => {},
    setReturnPolicy: (value) => {},
    setPaymentPolicy: (value) => {},
    setInventoryLocation: (value) => {},
    setCategoryId: (value) => {},
};

const OfferInfoContext = createContext(initialState);

const OfferInfoProvider = ({ children }) => {
    const [fulfillmentPolicy, setFulfillmentPolicy] = useState('');
    const [returnPolicy, setReturnPolicy] = useState('');
    const [paymentPolicy, setPaymentPolicy] = useState('');
    const [inventoryLocation, setInventoryLocation] = useState('');
    const [categoryId, setCategoryId] = useState('');


    return (
        <OfferInfoContext.Provider
            value={{
                fulfillmentPolicy,
                returnPolicy,
                paymentPolicy,
                inventoryLocation,
                categoryId,
                setFulfillmentPolicy,
                setReturnPolicy,
                setPaymentPolicy,
                setInventoryLocation,
                setCategoryId,
            }}>
            {children}
        </OfferInfoContext.Provider>
    );
};

export const useOffer = () => {
    return useContext(OfferInfoContext);
};

export default OfferInfoProvider;
