const { default: axios } = require("axios");
const { default: parse } = require("node-html-parser");
const { sleep } = require("./common");
const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');
const fs = require('fs');


const EBAY_SEARCH_MAIN_PAGE_ID = 'gh-ac';
const EBAY_SEARCH_BTN_MAIN_PAGE_ID = 'gh-btn';
const EBAY_SEARCH_ITEMS_SELECTOR = '.srp-results .s-item';

const EBAY_PAGINATION_NEXT_SELECTOR = '.pagination__next'

const PRODUCT_FOR_TOKEN_EXTRACTION = "https://www.ebay.com/itm/354215431010?epid=1042051489&hash=item5278e28b62:g:9LIAAOSwaQxi8yMF"

const ITEM_SELECTOR = {
    url: '.s-item__image a',
    name: '.s-item__title',
    price: '.s-item__price',
    delivery_price: '.s-item__shipping.s-item__logisticsCost',
    image_url: '.s-item__image-img',
    category_id: '#desc_ifr',
    sold: '.w2b .w2b-cnt .w2b-head',
    seller: '.ux-section--nameAndAddress .ux-textspans',
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

const getItems = async (htmlData) => {
    const root = parse(htmlData);
    const items = [...root.querySelectorAll(EBAY_SEARCH_ITEMS_SELECTOR)];
    if (items.length) {
        fs.writeFileSync('lag.html', htmlData);
    }
    console.log('Found items: ', items);
    const results = [];
    for (let item of items) {
        results.push({
            id: [...item.querySelector(ITEM_SELECTOR.url).getAttribute('href').matchAll(/itm\/([\d]+)/g)][0][1],
            url: item.querySelector(ITEM_SELECTOR.url).getAttribute('href'),
            name: item.querySelector(ITEM_SELECTOR.name).textContent,
            price: item.querySelector(ITEM_SELECTOR.price).textContent,
            delivery_price: '$' + item.querySelector(ITEM_SELECTOR.delivery_price).textContent
                .replace(/[^0-9.]/g, ""),
            image_url: item.querySelector(ITEM_SELECTOR.image_url).getAttribute('src').replace('/thumbs', '').replace('225', '500'),
        })
        console.log('new : ', results[results.length - 1])
    }
    return results;

    // console.log(items);
    return items;
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
        const aspectLabels = [...root.querySelectorAll(ASPECTS_SELECTOR.labels)]?.map(x => x.textContent);
        const aspectValues = [...root.querySelectorAll(ASPECTS_SELECTOR.values)]?.map(x => x.textContent);

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

const parallels = async (urls) => {
    return axios.all(urls.map(url => axios.get(url, {
        headers: {
            'user-agent': 'Chrome/104.0.5112.101'
        }
    })))
}

const searchSeller = async (seller, p, d, s) => {



    // if (!browser)
    //     browser = await puppeteer.launch({
    //         headless: false,
    //     });

    // const page = await browser.newPage();
    // await search(page, q);
    //get Items
    let totalItems = []
    try {
        for (let i = s; i < p + s; i += 20) {
            const urls = [...Array(Math.min(20, p + s - i)).keys()].map(x => x + i + 1).map(x => sellerShopPage(seller, x));
            console.log(urls);
            const datas = await parallels(urls)
            // console.log("DAATAAA: ", datas[3].data.length);
            const items_blocks = await (await Promise.allSettled(datas.map(x => getItems(x.data)))).map(x => x.value);
            console.log("ITEMS_BLOCKS: ", items_blocks.map(x => x.length));
            // const url = sellerShopPage(page, seller, s ?? 1);

            // const items = await getItems(page);
            for (const items of items_blocks) {
                for (const item of items) {
                    console.log("New items found: ", items.length)
                    totalItems.push(item);
                    // totalItems = [...totalItems, ...items];
                    console.log(totalItems.length);
                }
            }
        }
    }
    catch (e) {
        console.error(e);
        throw e;
    }

    console.log("details: ", d);
    if (d) {
        for (let i = 0; i < totalItems.length; i += 20) {
            try {
                const urls = [...Array(Math.min(20, totalItems.length - i)).keys()].map(x => x + i).map(x => totalItems[x].url);
                console.log(urls);
                const datas = await parallels(urls);
                console.log("DAATAAA: ", datas.length);
                const items_details = (await Promise.allSettled(datas.map(x => getItemDetails(x.data)))).map(x => x.value);
                console.log("ITEMS_DETAILS: ", items_details.length);
                await sleep(1500);
                for (let j = 0; j < Math.min(20, totalItems.length - i); j++) {
                    const details = items_details[j]
                    console.log("Details: ", details);
                    totalItems[i + j] = { ...totalItems[i + j], ...details };
                    console.log("Joined product: ", totalItems[i + j]);
                }
            }
            catch (e) {
                console.log("ERROR IN REQUEST, WAITING 5 SECONDS AND CONTINUE");
                console.error(e);
                i -= 20;
                await sleep(5000);
            }
        }
    }
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
    getOAuthCompatibilityTocken
}