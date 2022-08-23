import { useRef } from "react";
import { useEffect, useState } from "react";
import { utils, writeFile } from "xlsx";
import "../App.css";
import ClipboardWrapper from "../components/clipboard-wrapper";
import FileLoader from "../components/fileLoader";
import Loading from "../components/loading";
import Policies from "../components/policies";
import Table from "../components/table";
import { useAuthApi } from "../contexts/AuthApiContext";
import { REQUEST_TYPES, useProducts } from "../contexts/ProductsContext";
import { downloadFile } from "../services/downloadData";

function Home() {
    const tableRef = useRef();
    const { apiToken, setApiToken } = useAuthApi();
    const [currentRequest, setCurrentRequest] = useState(null);
    const [startPage, setStartPage] = useState(1);
    const [pagesCount, setPagesCount] = useState(1);
    const [withDetails, setWithDetails] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchData, setSearchData] = useState(undefined);

    const {
        productsRaw,
        setProductsRaw,
        fetchProductRaw,
        fetchSellerProductsRaw,
        fetchConvertedImages,
        fetchProductsApiFromCurrentRaw,
        fetchAddAllProducts,
        fetchDeleteAllProducts,
        fetchPublishAllOffers,
        fetchWithdrawAllOffers,
    } = useProducts();

    useEffect(() => {
        document.body.style.overflowY = loading ? "hidden" : "auto";
    });

    console.log(withDetails);

    const handleConvertImages = async () => {
        setLoading(true);
        await fetchConvertedImages(searchData, currentRequest);
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!searchData || searchData === "" || !apiToken) return;
        setLoading(true);
        switch (currentRequest) {
            case REQUEST_TYPES.search:
                await fetchProductRaw(searchData, withDetails);
                break;
            case REQUEST_TYPES.seller:
                await fetchSellerProductsRaw(
                    searchData,
                    startPage,
                    pagesCount,
                    withDetails
                );
                break;
            default:
                console.log("Nothing selected");
                break;
        }
        await fetchProductsApiFromCurrentRaw();
        setLoading(false);
    };

    const handleExport = () => {
        const wb = utils.table_to_book(document.getElementById("mainTable"));
        writeFile(wb, `${searchData}_book.xlsx`);
    };

    const handleAddAll = async () => {
        await fetchAddAllProducts();
        downloadFile(
            {
                startPage,
                pagesCount,
                finishedDate: new Date().toISOString(),
            },
            `info-${new Date().toISOString().replace(/:/g, "-")}`
        );
    };
    const handleDeleteAll = async () => {
        await fetchDeleteAllProducts();
    };

    const handlePublishAll = async () => {
        await fetchPublishAllOffers();
    };

    const handleWithdrawAll = async () => {
        await fetchWithdrawAllOffers();
    };

    const handleProductsFileLoaded = async (data) => {
        console.log("Data: ", JSON.parse(data));
        setProductsRaw(JSON.parse(data));
    };
    const handleOffersFileLoaded = async (data) => {
        console.log("Data: ", JSON.parse(data));
        const obj = JSON.parse(data);
        const productsOffer = {};
        for (let item of obj) {
            productsOffer[item.productRaw.id] = item.offerId;
        }
        console.log("Products Offer: ", productsOffer);
        setProductsRaw(obj.map((x) => x.productRaw));
    };

    const handleInstantPublish = async () => {
        await handleConvertImages();
        setTimeout(async () => {
            await handleAddAll();
            setTimeout(async () => {
                await handlePublishAll();
            }, 1500);
        }, 1500);
    };

    const handleInstantOffer = async () => {
        await handleConvertImages();
        setTimeout(async () => {
            await handleAddAll();
        }, 1500);
    }

    return (
        <div className="App">
            <Loading loading={loading} />
            <div style={styles.spaceBox}>
                <div>
                    <div style={styles.centerBox}>
                        <input
                            type="text"
                            value={searchData}
                            onChange={(e) => setSearchData(e.target.value)}
                        />
                        <button onClick={() => handleSearch()}>Search</button>
                    </div>
                    <div style={styles.centerBox}>
                        <input
                            id="details"
                            name="details"
                            type="number"
                            checked={startPage}
                            onChange={(e) => setStartPage(e.target.value)}
                        />
                        <label for="details">Start from page</label>
                    </div>
                    <div style={styles.centerBox}>
                        <input
                            id="details"
                            name="details"
                            type="number"
                            checked={pagesCount}
                            onChange={(e) => setPagesCount(e.target.value)}
                        />
                        <label for="details">Number of pages</label>
                    </div>
                    <div style={styles.centerBox}>
                        <input
                            id="details"
                            name="details"
                            type="checkbox"
                            checked={withDetails}
                            onChange={(e) => setWithDetails(e.target.checked)}
                        />
                        <label for="details">
                            Check for details (takes much more time)
                        </label>
                    </div>
                    <div>
                        <FileLoader
                            name={"file_load_produts_raw"}
                            title="Load Raw Products"
                            onFileLoad={handleProductsFileLoaded}
                        />
                    </div>
                    <div>
                        <FileLoader
                            name={"file_load_product_offers"}
                            title="Load Product Offers"
                            onFileLoad={handleOffersFileLoaded}
                        />
                    </div>
                    {/* <div>
                        <FileLoader title="Load Successful Products" onFileLoad={handleSuccessfulFileLoaded}/>
                    </div>
                    <div>
                        <FileLoader title="Load Errored Products" onFileLoad={handleErroredFileLoaded}/>
                    </div> */}
                    <button onClick={() => handleAddAll()}>Add All</button>
                    <button onClick={() => handleDeleteAll()}>
                        Delete All
                    </button>
                    <button onClick={() => handlePublishAll()}>
                        Publish All
                    </button>
                    <button onClick={() => handleWithdrawAll()}>
                        Withdraw All
                    </button>
                    <button onClick={() => handleInstantPublish()}>
                        Instant Publish All
                    </button>
                    <button onClick={() => handleInstantOffer()}>
                        Instant Offer All
                    </button>
                </div>
                <div>
                    <div>
                        <input
                            type="radio"
                            name="request-type"
                            id="request-type-1"
                            value={REQUEST_TYPES.search}
                            onChange={(e) =>
                                e.target.checked
                                    ? setCurrentRequest(e.target.value)
                                    : undefined
                            }
                        />
                        <label for="request-type-1">Search request</label>
                        <input
                            type="radio"
                            name="request-type"
                            id="request-type-2"
                            value={REQUEST_TYPES.seller}
                            onChange={(e) =>
                                e.target.checked
                                    ? setCurrentRequest(e.target.value)
                                    : undefined
                            }
                        />
                        <label for="request-type-2">Seller request</label>
                        <div>
                            <button onClick={() => handleConvertImages()}>
                                Convert images
                            </button>
                        </div>
                        <div>
                            <label htmlFor="private_token">
                                Your DevAPI Private token
                            </label>
                            <input
                                type="text"
                                name="private_token"
                                id=""
                                value={apiToken}
                                onChange={(e) => setApiToken(e.target.value)}
                            />
                        </div>
                        <Policies />
                    </div>
                </div>
            </div>
            <div style={styles.centerBox}>
                <button onClick={() => handleExport()}>Export</button>
            </div>
            <h1>Hello world!</h1>
            <ClipboardWrapper>
                <Table
                    apiToken={apiToken}
                    withDetails={withDetails}
                    ref={tableRef}
                    items={productsRaw}
                />
            </ClipboardWrapper>
        </div>
    );
}

const styles = {
    centerBox: { display: "flex", justifyContent: "flex-start" },
    spaceBox: {
        display: "flex",
        justifyContent: "space-around",
    },
};

export default Home;
