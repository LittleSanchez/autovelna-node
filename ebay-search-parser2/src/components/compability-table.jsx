import React from "react";

const CompabilityTable = ({ data }) => {
    const additionalProperties = data?.additionalProperties ?? undefined;
    const properties =
        data?.compatibleProductMetadata?.compatibilityProperties ??
        undefined;
    const products = data?.compatibleProducts?.members ?? undefined;
    return (
        <table>
            <thead>
                <tr>
                    {additionalProperties &&
                        additionalProperties.map((x, i) => (
                            <th key={i}>{x.name}</th>
                        ))}
                    {properties &&
                        properties.map((x, i) => <th key={i}>{x.name}</th>)}
                </tr>
            </thead>
            <tbody>
                {products &&
                    products.map((x, i) => (
                        <tr key={i}>
                            {[...additionalProperties, ...properties].map(
                                (xx, ii) => (
                                    <td key={ii}>
                                        {x.productProperties[xx.name]}
                                    </td>
                                )
                            )}
                        </tr>
                    ))}
            </tbody>
        </table>
    );
};

export default CompabilityTable;
