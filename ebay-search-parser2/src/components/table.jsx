import React from "react";
import { useState } from "react";
import { useProducts } from "../contexts/ProductsContext";
import useCompability from "../hooks/useCompability";
import useOAuth from "../hooks/useOAuth";
import { addProduct } from "../services/add-product";
import { fetchCompability } from "../services/server-requests";
import CompabilityTable from "./compability-table";
import "./table.css";

const COMPABILITY_CLOSED = -1;

const Table = ({ withDetails, ref, privateToken }) => {
    const {
        productsRaw,
        fetchAddProductById,
        fetchDeleteProductById,
        fetchPublishOfferById,
        fetchWithdrawOfferById,
    } = useProducts();
    const [compabilityProductId, setCompabilityProductId] =
        useState(COMPABILITY_CLOSED);
    const { compability, loading } = useCompability(compabilityProductId);
    const { token, update } = useOAuth();
    const handleCompabilityClick = (id) => {
        setCompabilityProductId(
            compabilityProductId === id ? COMPABILITY_CLOSED : id
        );
    };
    const handleAddProductClick = async (product) => {
        console.log(compabilityProductId);
        await addProduct({
            productData: product,
            productCompatibility: compability,
            token: privateToken,
        });
    };

    

    return (
        <div>
            
            <table id="mainTable" ref={ref}>
                <thead>
                    <tr>
                        <th></th>
                        <th>Ebay Product Id</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Category Id</th>
                        <th>Delivery price</th>
                        {withDetails && (
                            <>
                                <th>Seller</th>
                                <th>Sold</th>
                            </>
                        )}
                        <th>Total Price</th>
                        <th>Image</th>
                    </tr>
                </thead>
                <tbody>
                    {productsRaw &&
                        productsRaw
                            // .map((x) => ({
                            //     ...x,
                            //     id: [...x.url.matchAll(/itm\/([\d]+)/g)][0][1],
                            // }))
                            .map((x, i) => (
                                <>
                                    <tr key={i}>
                                        <td>
                                            <button
                                                onClick={() =>
                                                    handleCompabilityClick(x.id)
                                                }>
                                                {compabilityProductId !== x.id
                                                    ? "Show"
                                                    : "Hide"}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    fetchAddProductById(x.id)
                                                }>
                                                Add Right NOW
                                            </button>
                                            <button
                                                onClick={() =>
                                                    fetchDeleteProductById(x.id)
                                                }>
                                                Delete Right NOW
                                            </button>
                                            <button
                                                onClick={() =>
                                                    fetchPublishOfferById(x.id)
                                                }>
                                                Publish Right NOW
                                            </button>
                                            <button
                                                onClick={() =>
                                                    fetchWithdrawOfferById(x.id)
                                                }>
                                                Withdraw Right NOW
                                            </button>
                                            {compabilityProductId === x.id && (
                                                <button
                                                    onClick={() =>
                                                        handleAddProductClick(x)
                                                    }>
                                                    Add product
                                                </button>
                                            )}
                                        </td>
                                        <td>{x.id}</td>
                                        <td>
                                            <a href={x.url}>{x.name}</a>
                                        </td>
                                        <td>{x.price}</td>
                                        <td>{x.category_id}</td>
                                        <td>{x.delivery_price}</td>
                                        {withDetails && (
                                            <>
                                                <td>
                                                    {x?.saller ?? "loading"}
                                                </td>
                                                <td>{x?.sold ?? "loading"}</td>
                                            </>
                                        )}
                                        <td>
                                            $
                                            {+x.price.replace(/[^0-9.]/g, "") +
                                                +x.delivery_price.replace(
                                                    /[^0-9.]/g,
                                                    ""
                                                )}
                                        </td>
                                        <td>
                                            <img src={x.image_url} />
                                        </td>
                                    </tr>
                                    {compabilityProductId === x.id && (
                                        <tr>
                                            <td colSpan={withDetails ? 9 : 7}>
                                                {loading ? (
                                                    <p>Loading....</p>
                                                ) : (
                                                    <CompabilityTable
                                                        data={compability}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                    {/* {x.id && <AutoCompability id={x.id}/>} */}
                                </>
                            ))}
                </tbody>
            </table>
        </div>
    );
};

const AutoCompability = ({ id }) => {
    const { compability, loading, ready } = useCompability(id);
    return (
        <>
            {ready ? <CompabilityTable data={compability} /> : <h1>Loading</h1>}
        </>
    );
};
export default Table;
