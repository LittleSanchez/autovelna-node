const { default: axios, AxiosError } = require("axios");
const { default: parse } = require("node-html-parser");
const { sleep } = require("./common");
const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');
const fs = require('fs');

const EOLTAS_SEARCH_ITEMS_SELECTOR = '.cont-product';

const EBAY_SEARCH_MAIN_PAGE_ID = 'gh-ac';
const EBAY_SEARCH_BTN_MAIN_PAGE_ID = 'gh-btn';
const EBAY_SEARCH_ITEMS_SELECTOR = '.srp-results .s-item';

const EBAY_PAGINATION_NEXT_SELECTOR = '.pagination__next'

const PRODUCT_FOR_TOKEN_EXTRACTION = "https://www.ebay.com/itm/354215431010?epid=1042051489&hash=item5278e28b62:g:9LIAAOSwaQxi8yMF"


const ITEM_SELECTOR = {
    attr: {
        selector: '.cont-product__cell.cell-attr',
        nameSelector: '.attr-el__title',
        valueSelector: '.attr-el__content',
        brand: {
            name: 'Brand name'
        },
        id: {
            name: 'Code'
        },
    },
    url: '.cont-product__cell.cell-title',
    name: '.cont-product__cell.cell-title',
    price: '.cont-product__cell.cell-price .attr-el__content',
    image_url: '.cont-product__cell.cell-img',
}

const ASPECTS_SELECTOR = {
    labels: '#viTabs_0_is .ux-labels-values__labels .ux-textspans',
    values: '#viTabs_0_is .ux-labels-values__values .ux-textspans',
}

// const SELLER_ITEM_SELECTOR = {
//     url: '.lvtitle a',
//     name: '.lvtitle a',
//     price: '.lvprice',
//     delivery_price: '.s-item__shipping.s-item__logisticsCost',
//     image_url: '.s-item__image-img',
// }

const search = async (page, q) => {
    await page.goto('https://ebay.com', { waitUntil: 'networkidle2' });

    await page.waitForSelector(`#${EBAY_SEARCH_MAIN_PAGE_ID}`);

    // await page.$eval(`#${EBAY_SEARCH_MAIN_PAGE_ID}`, );
    await page.evaluate((sel, val) => document.querySelector(`#${sel}`).value = val,
        EBAY_SEARCH_MAIN_PAGE_ID,
        q)

    await page.screenshot({
        path: 'pre-search.png'
    })

    await Promise.all([
        page.click(`#${EBAY_SEARCH_BTN_MAIN_PAGE_ID}`),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    // await sleep(5000);
    await page.screenshot({
        path: 'next-search.png'
    })
}

const getItems = async (page = puppeteer.Page.prototype, url) => {
    // const htmlData = await requestWithAgent(url);
    // const root = parse(htmlData);
    await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 100000
    });

    await page.waitForSelector(ITEM_SELECTOR.price, {
        timeout: 100000
    });
    const results = await page.evaluate(async (item_selector, items_selector) => {
        const BRAND_CODE_TRANSFORM = {
            'BOSCH': (code) => code.replace(/[.]+/g, ' ')
        }

        const BRAND_SPECIAL_NAME = {
            'BOSCH': '30'
        };

        const items = [...document.querySelectorAll(items_selector)];
        console.log("I got items with length: ", items.length);
        if (items.length === 0) {
            return await getItems(url);
        }
        // console.log('Found items: ', items);
        const results = [];
        for (let item of items) {
            let brand = '';
            let id = '';
            const attrs = [...item.querySelectorAll(item_selector.attr.selector)];
            console.log("Attributes: ", attrs.length);
            for (let attr of attrs) {
                const attrTitle = attr.querySelector(item_selector.attr.nameSelector)?.textContent;
                console.log("Current attr: ", attrTitle);
                if (attrTitle.includes(item_selector.attr.brand.name)) {
                    brand = attr.querySelector(item_selector.attr.valueSelector)?.textContent.trim();
                    continue;
                }
                if (attrTitle.includes(item_selector.attr.id.name)) {
                    id = attr.querySelector(item_selector.attr.valueSelector)?.textContent.trim();
                    continue;
                }
            }
            let name = item.querySelector(item_selector.name)?.textContent.trim().split(';')?.at(0);
            const newProduct = {
                url: item.querySelector(item_selector.url).getAttribute('href').trim(),
                price: item.querySelector(item_selector.price)?.textContent.trim().replace(/[^\d,]+/g, '').replace(/,/g, '.'),
                image_url: item.querySelector(item_selector.image_url).getAttribute('src').replace('/thumbs', '').replace('225', '500').trim(),
                brand_code: BRAND_CODE_TRANSFORM.BOSCH(id).trim(),
                brand_special_name: BRAND_SPECIAL_NAME.BOSCH.trim(),
                id: id.trim(),
                brand: brand.trim(),
            };
            newProduct.name = newProduct.brand.toUpperCase() + ' ' + name.toUpperCase() + ' ' + newProduct.brand_code.toUpperCase() + ' ' + 'NEW';
            newProduct.hash_token = btoa(`["${id}","${newProduct.brand_code}","${newProduct.brand_special_name}","${brand}",true]`).trim();
            results.push(newProduct);
            console.log('new : ', results[results.length - 1])
        }
        return results;
    }, ITEM_SELECTOR, EOLTAS_SEARCH_ITEMS_SELECTOR);

    return results;
}

const eoltasApiProductsPricesUrl = 'https://www.eoltas.lt/en-us/rest/product-price';

const eoltasApiProductsUrl = (category, manufacturers, page) => `https://www.eoltas.lt/en-us/rest/product-group/products?page=${page}&slug=${encodeURIComponent(category)}${manufacturers.map(x => '&categories_brands_form[brand][]=' + encodeURIComponent(x)).join('')}`

const eoltasApiRequest = async ({
    url,
    method,
    body = undefined,
}) => {
    return await axios(url, {
        method,
        data: body,
        headers: {
            'Accept': '*/*',
            'User-Agent': ' Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
}

const getEoltasAllProducts = async (startPage, maxPage, category, manufacturers) => {
    const products = [];
    console.log(eoltasApiProductsUrl(category, manufacturers, startPage));
    const firstRequest = await eoltasApiRequest({
        url: eoltasApiProductsUrl(category, manufacturers, startPage),
        method: 'GET'
    });
    console.log("Manufacturers: ", manufacturers.map(x => '&categories_brands_form[brand][]=' + encodeURIComponent(x)).join(''));
    console.log(`Request info: 
    Status: ${firstRequest.status}
    Body: ${firstRequest.data}
    Error: ${firstRequest?.error}`);
    if (firstRequest.status !== 200) {
        throw new AxiosError('Cannot GET to search products');
    }
    products.push(...firstRequest.data.products);
    const nbMaxPage = firstRequest.data.pager.nbPages;
    for (let i = startPage + 1; i <= Math.min(maxPage, nbMaxPage); i++) {
        const request = await eoltasApiRequest({
            url: eoltasApiProductsUrl(category, manufacturers, i),
            method: 'GET'
        });
        if (request.status !== 200) {
            throw new AxiosError('Cannot GET to search products');
        }
        console.log("Successful iteration of products: ", i);
        products.push(...request.data.products);
    }
    return products;
}

const getEoltasProductsPrices = async (products) => {
    const requestHashes = products.map(x => x.hash);
    const prices = [];
    for (let i = 0; i < requestHashes.length; i += 20) {
        const subsequenceLength = Math.min(requestHashes.length - i, 20);
        const subsequenceHashes = [...Array(subsequenceLength).keys()].map(x => x + i).map(x => requestHashes[x]);
        const subPricesResponse = await eoltasApiRequest({
            url: eoltasApiProductsPricesUrl,
            method: "POST",
            body: {
                products: subsequenceHashes
            }
        });
        console.log("Subprices: ", subPricesResponse.data);
        prices.push(...subPricesResponse.data);
        console.log("Successful prices iteration: ", i);
    }
    return prices;
}

const searchEoltas = async (startPage, maxPage) => {
    // const category = 'truck-parts/truck-air-system';
    const category = 'electrical-wiring-system/sensors';
    const manufacturers = ['BOSCH']
    // const manufacturers = [
    //     'VALEO',
    // ]

    console.log(`We searching eoltas with: 
    1. Category: ${category}
    2. Manufacturer: ${manufacturers}
    3. From page: ${startPage}
    4. To page: ${maxPage}`);
    // const manufacturers = undefined;
    let products = await getEoltasAllProducts(startPage, maxPage, category, manufacturers);
    // console.log("Products count: ", products);
    let productsPrices = await getEoltasProductsPrices(products);
    console.log("Product prices count: ", productsPrices.length);
    products = products.map(x => ({
        ...x,
        priceInfo: productsPrices.find(y => y.hash === x.hash).userPrice / 100
    }));
    return products;
}

const getItemDetails = async (htmlData) => {
    // await page.goto(url, { waitUntil: 'networkidle2' });
    try {
        // const { data: htmlData } = await axios.get(url);
        // console.log(htmlData);
        const root = parse(htmlData);
        const details = {
            sold: root.querySelector(ITEM_SELECTOR.sold)?.textContent ?? 'Not specified',
            saller: root.querySelector(ITEM_SELECTOR.seller)?.textContent ?? 'Not specified',
            category_id: [...root.querySelector(ITEM_SELECTOR.category_id)?.getAttribute('src')?.matchAll(/category=([\d]+)/g)][0][1],
        }
        const aspectLabels = [...root.querySelectorAll(ASPECTS_SELECTOR.labels)]?.map(x => x?.textContent);
        const aspectValues = [...root.querySelectorAll(ASPECTS_SELECTOR.values)]?.map(x => x?.textContent);

        // console.log("Labels: ", aspectLabels);
        // console.log("Values: ", aspectValues);

        const aspects = {}
        for (let i = 0; i < aspectLabels.length; i++) {
            aspects[aspectLabels[i].replace(':', '')] = [aspectValues[i]];
        }
        // console.log(aspects);
        details.aspects = aspects;
        // const details = await page.evaluate(async () => {
        //     return {
        //         sold: document.querySelector('.w2b .w2b-cnt .w2b-head')?.textContent ?? 'Not specified',
        //         saller: document.querySelector('.ux-section--nameAndAddress .ux-textspans')?.textContent ?? 'Not specified',
        //     }
        // })
        // console.log(details);
        return details;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

const sellerShopPage = (seller, s) => {
    return `https://www.ebay.com/sch/i.html?_dkr=1&iconV2Request=true&_ssn=${seller}&_pgn=${s ?? 1}`;
    // await page.goto(
    //     `https://www.ebay.com/sch/i.html?_dkr=1&iconV2Request=true&_ssn=${seller}&_pgn=${s ?? 1}`,
    //     { waitUntil: 'networkidle2' });
}

const nextItemsPage = async (page) => {
    let url = page.url();
    // if (+page.url().split('_pgn=')[1][1] > 8) throw new Exception("End of cycle")
    if (url.includes('_pgn')) {
        const matches = [...url.matchAll(/_pgn=([\d]+)/g)][0];
        console.log('Mat: ', matches);
        const currentPage = +matches[1];
        console.log('Mat: ', matches);
        const newPage = matches[0].replace(currentPage, +currentPage + 1);

        console.log(matches[0], currentPage, newPage);
        url = url.replace(matches[0], newPage)
    } else {
        url += "&_pgn=2";
    }
    console.log(url);

    await page.goto(
        url,
        { waitUntil: 'networkidle2' });
}

let browser = undefined;

const searchEbay = async (q, d) => {
    if (!browser)
        browser = await puppeteer.launch({
            headless: false,
        });

    const page = await browser.newPage();
    await search(page, q);

    //get Items

    const items = await getItems(page);

    console.log("details: ", d);
    if (d) {
        for (let i = 0; i < items.length; i++) {
            try {
                const details = await getItemDetails(page, items[i].url);
                items[i] = { ...items[i], ...details };
                console.log(items[i]);
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    // await sleep(10000);
    //writeFileSync('search-data.json', JSON.stringify(items));
    await page.close();
    return items;
};
// searchEbay('RAV ATF DEXRON D II 1L')

const requestWithAgent = async (url) => await axios.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36'
    }
})

const parallels = async (urls) => {
    axios.all(urls.map(url => requestWithAgent(url)));
}

const eoltasResultsPageUrl = (category, manufacturer, pageNumber) => `https://www.eoltas.lt/en-us/groups/${category}?page=${pageNumber}${manufacturer ? `&categories_brands_form[brand][]=${manufacturer}` : ''}`

const eoltasGetMaxPages = async (page) => {
    const selector = '.cont-pager .btn-pager';
    await page.waitForSelector(selector);
    const pagesCount = Number.parseInt(await page.evaluate(async (s) => {
        const buttons = [...document.querySelectorAll(s)]
        const button = buttons[buttons.length - 2];
        return button?.textContent;
    }, selector));
    console.log("Found pages count: ", pagesCount);
    return pagesCount;
}

const searchSeller = async (s, pages) => {
    // browser = puppeteer.Browser.prototype;
    if (!browser) {
        browser = await puppeteer.launch({
            headless: false,
        });
    }

    const category = 'electrical-wiring-system/sensors';
    // const category = 'truck-parts/truck-air-system';
    const manufacturer = 'BOSCH';
    // const manufacturer = undefined;
    let totalItems = []
    let pagesCount = undefined;
    try {
        const page = await browser.newPage('https://www.google.com')
        page
            .on('console', message =>
                console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
        // .on('pageerror', ({ message }) => console.log(message))
        // .on('response', response =>
        //     console.log(`${response.status()} ${response.url()}`))
        // .on('requestfailed', request =>
        //     console.log(`${request.failure().errorText} ${request.url()}`))
        console.log("Starting...");
        for (let i = s; i <= (pagesCount ? Math.min(pagesCount, pages) : s + 1); i++) {
            console.log(`Iteration ${i} out of ${(pagesCount ? Math.min(pagesCount, pages) : 2)}`);
            const pageUrl = eoltasResultsPageUrl(category, manufacturer, i);
            console.log("Current page url: ", pageUrl);
            const items = await getItems(page, pageUrl);
            if (!pagesCount) {
                pagesCount = await eoltasGetMaxPages(page)
            }
            if (items && items.length > 0) {
                for (let item of items) {
                    totalItems.push(item);
                }
            }
        }
    }
    catch (e) {
        console.error(e);
        throw e;
    }

    // if (d) {
    //     for (let i = 0; i < totalItems.length; i += 20) {
    //         try {
    //             const urls = [...Array(Math.min(20, totalItems.length - i)).keys()].map(x => x + i).map(x => totalItems[x].url);
    //             console.log(urls);
    //             const datas = await parallels(urls);
    //             console.log("DAATAAA: ", datas.length);
    //             const items_details = (await Promise.allSettled(datas.map(x => getItemDetails(x.data)))).map(x => x.value);
    //             console.log("ITEMS_DETAILS: ", items_details.length);
    //             await sleep(1500);
    //             for (let j = 0; j < Math.min(20, totalItems.length - i); j++) {
    //                 const details = items_details[j]
    //                 console.log("Details: ", details);
    //                 totalItems[i + j] = { ...totalItems[i + j], ...details };
    //                 console.log("Joined product: ", totalItems[i + j]);
    //             }
    //         }
    //         catch (e) {
    //             console.log("ERROR IN REQUEST, WAITING 5 SECONDS AND CONTINUE");
    //             console.error(e);
    //             i -= 20;
    //             await sleep(5000);
    //         }
    //     }
    // }
    // await page.close();
    // await sleep(10000);
    //writeFileSync('search-data.json', JSON.stringify(items));
    // console.log(totalItems);
    console.log("TOTAL ITEMS: ", totalItems);
    return totalItems;

}

const getOAuthCompatibilityTocken = async () => {
    if (!browser)
        browser = await puppeteer.launch({
            headless: false,
        });

    const page = await browser.newPage();
    const itemId = [...PRODUCT_FOR_TOKEN_EXTRACTION.matchAll(/itm\/([\d]+)/g)][0][1]
    let paused = false;
    let pausedRequests = [];

    let token = '';

    const nextRequest = () => { // continue the next request or "unpause"
        if (pausedRequests.length === 0) {
            paused = false;
        } else {
            // continue first request in "queue"
            (pausedRequests.shift())(); // calls the request.continue function
        }
    };

    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.url().includes('parts_compatibility/v1/compatible_products/')) {
            console.log('incomming request, ')
        } else {
            request.continue();
            return;
        }

        if (paused) {
            pausedRequests.push(() => request.continue());
        } else {
            paused = true; // pause, as we are processing a request now
            request.continue();
        }
    });

    page.on('requestfinished', async (request) => {
        if (request.url().includes('parts_compatibility/v1/compatible_products/')) {
            console.log('finished request, ');
        } else {
            nextRequest();
            return;
        }
        const response = await request.response();

        // const responseHeaders = response.headers();
        const requestHeaders = request.headers();

        token = requestHeaders?.authorization?.replace('Bearer ', '') ?? ''
        nextRequest(); // continue with next request
    });
    page.on('requestfailed', (request) => {
        // handle failed request
        nextRequest();
    });
    await page.goto(
        PRODUCT_FOR_TOKEN_EXTRACTION,
        { waitUntil: 'networkidle0' });
    console.log(token);
    await page.close();
    return token;
}

const TRODO_MANUFACTURER_IDS = {
    'MEAT_AND_DORIA': 'meat-doria'
}

const getTrodoSearchUrl = (mpn, manufacturer) => `https://www.trodo.lv/ru/catalogsearch/result?q=manufacturer=${manufacturer}&${mpn.replace(' ', '+')}&searchby=number`

const getEANcodesViaMPNTrodo = async (mpns) => {
    let eans = {};
    if (!mpns || mpns.length === 0) {
        return [];
    }
    for (let mpn of mpns) {
        try {

            const url = getTrodoSearchUrl(mpn, TRODO_MANUFACTURER_IDS.MEAT_AND_DORIA);
            const searchResultHtmlData = await requestWithAgent(url);
            const root = parse(searchResultHtmlData.data);
            const productUrl = root.querySelector('.product-name a')?.getAttribute('href');
            const productHtmlData = await requestWithAgent(productUrl);
            const productRoot = parse(productHtmlData.data);
            const productAttributes = [...productRoot.querySelectorAll('#product-attribute-specs-table tr')]
            for (const attribute of productAttributes) {
                const title = attribute.querySelector('.label')?.textContent;
                const value = attribute.querySelector('.data')?.textContent;
                if (title === 'EAN') {
                    eans = {
                        ...eans,
                        [mpn]: value,
                    }
                    break;
                }
            }
        }
        catch (e) {
            console.log("Error in mpn cycle: ", e);
        }
    }
    return eans;
}

const getEUAutoDalysSearchUrl = (mpn, manufacturer) => `https://www.euautodalys.lt/paieska-autodalys?keyword=${mpn}&supplier%5B%5D=${manufacturer}`

const getEANcodesViaMPNEUAutoDalys = async (mpns) => {
    let eans = {};
    if (!mpns || mpns.length === 0) {
        return [];
    }
    for (let mpn of mpns) {
        try {

            const url = getEUAutoDalysSearchUrl(mpn, TRODO_MANUFACTURER_IDS.MEAT_AND_DORIA);
            console.log('CONNECTING URL: ', url);
            const searchResultHtmlData = await requestWithAgent(url);
            const root = parse(searchResultHtmlData.data);
            const productUrl = root.querySelector('.cat_item .ga-click.name')?.getAttribute('href');
            const productHtmlData = await requestWithAgent(productUrl);
            const productRoot = parse(productHtmlData.data);
            const productAttributes = [...productRoot.querySelectorAll('.prod_char td')]
            const eanMatch = productAttributes.find(x => x.textContent.includes('EAN'))?.textContent?.matchAll(/[\d]+/g)
            if (eanMatch) {
                const ean = [...eanMatch][0][0]
                eans[mpn] = ean;
            }
        }
        catch (e) {
            console.log("Error in mpn cycle: ", e);
        }
    }
    return eans;
}


const getAlvadiSearchUrl = (mpn) => `https://alvadi.ee/ru/search/spares?code=${mpn}`;

const getEANcodesViaMPNAlvadi = async (mpns) => {
    let eans = {};
    if (!mpns || mpns.length === 0) {
        return [];
    }
    for (let mpn of mpns) {
        try {
            const url = getAlvadiSearchUrl(mpn);
            console.log('CONNECTING URL: ', url);
            const searchResultHtmlData = await requestWithAgent(url);
            fs.writeFileSync('SUKA.html', searchResultHtmlData.data.html.replace('\n', '').replace('\"', '"'))
            const root = parse('<div>' + searchResultHtmlData.data.html + '</div>');
            // console.log("Root active?: ", root.querySelector('li'));
            const correctItem = [...root.querySelectorAll('.autocompliter__item')].find(x => x.textContent.includes(mpn) && x.textContent.toLowerCase().includes('doria'));
            console.log('CorrectItem: ', correctItem.textContent);
            const productUrl = correctItem.querySelector('.overlink')?.getAttribute('href');
            console.log("product url: ", productUrl);
            const productHtmlData = await requestWithAgent(productUrl);
            const productRoot = parse(productHtmlData.data);
            const productAttributes = [...productRoot.querySelectorAll('.catalog-product-match__oem tr')]
            console.log("Product attributes: ", productAttributes.map(x => x.textContent))
            const eanMatches = productAttributes.filter(x => x.textContent.includes('EAN')).map(x => x?.textContent?.matchAll(/[\d]{11,14}/g));
            for (let eanMatch of eanMatches) {
                if (eanMatch) {
                    // console.log('Ean match: ', [...eanMatch])
                    const ean = [...eanMatch]?.at(0)?.at(0);
                    console.log("EAN: ", ean);
                    if (ean && ean.length === 12) {
                        eans[mpn] = ean;
                    }
                }
            }
        }
        catch (e) {
            console.log("Error in mpn cycle: ", e);
        }
    }
    return eans;
}


module.exports = {
    EBAY_SEARCH_MAIN_PAGE_ID,
    EBAY_SEARCH_BTN_MAIN_PAGE_ID,
    EBAY_SEARCH_ITEMS_SELECTOR,
    search,
    getItems,
    getItemDetails,
    sellerShopPage,
    nextItemsPage,
    searchEbay,
    searchSeller,
    getOAuthCompatibilityTocken,
    getEANcodesViaMPNTrodo,
    getEANcodesViaMPNEUAutoDalys,
    getEANcodesViaMPNAlvadi,
    searchEoltas,
}