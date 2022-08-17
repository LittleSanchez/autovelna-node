import { useEffect } from "react";
import { useOffer } from "../contexts/OfferInfoContext";

const Policies = () => {
    const {
        fulfillmentPolicy,
        returnPolicy,
        paymentPolicy,
        inventoryLocation,
        setFulfillmentPolicy,
        setPaymentPolicy,
        setReturnPolicy,
        setInventoryLocation,
    } = useOffer();

    useEffect(() => {
        console.log(fulfillmentPolicy);
    }, [fulfillmentPolicy]);
    useEffect(() => {
        console.log(returnPolicy);
    }, [returnPolicy]);
    useEffect(() => {
        console.log(paymentPolicy);
    }, [paymentPolicy]);
    return (
        <div>
            <div>
                <label htmlFor="fulfillment">Fulfillment Policy Id</label>
                <input
                    type="text"
                    name="fulfillment"
                    id=""
                    value={fulfillmentPolicy}
                    onChange={(e) => setFulfillmentPolicy(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="return">Return Policy Id</label>
                <input
                    type="text"
                    name="return"
                    id=""
                    value={returnPolicy}
                    onChange={(e) => {
                        setReturnPolicy(e.target.value);
                    }}
                />
            </div>
            <div>
                <label htmlFor="payment">Payment Policy Id</label>
                <input
                    type="text"
                    name="payment"
                    id=""
                    value={paymentPolicy}
                    onChange={(e) => setPaymentPolicy(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="inventory">Inventory Location Id</label>
                <input
                    type="text"
                    name="inventory"
                    id=""
                    value={inventoryLocation}
                    onChange={(e) => setInventoryLocation(e.target.value)}
                />
            </div>
        </div>
    );
};

export default Policies;
