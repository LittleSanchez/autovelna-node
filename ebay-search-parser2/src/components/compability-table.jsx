import React from "react";

const CompabilityTable = ({ data }) => {
    // const additionalProperties = data?.additionalProperties ?? undefined;
    // const properties =
    //     data?.compatibleProductMetadata?.compatibilityProperties ??
    //     undefined;
    // const products = data?.compatibleProducts?.members ?? undefined;
    const vehicles = Object.values(data.vehicles);
    const vehicleKeys = Object.keys(vehicles[0]).filter(x => !Array.isArray(vehicles[0][x]));
    console.log(vehicleKeys);
    return (
        <table>
            <thead>
                <tr>
                    {vehicles && vehicles.length > 0 &&
                        vehicleKeys.map((x, i) => <th key={i}>{x}</th>)}
                </tr>
            </thead>
            <tbody>
                {vehicles &&
                    vehicles.map((x, i) => (
                        <tr key={i}>
                            {vehicleKeys.map(
                                (xx, ii) => (
                                    <td key={ii}>
                                        {x[xx]}
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
