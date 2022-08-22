const { writeFile, writeFileSync } = require('fs');
const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');

const { search, getItems, getItemDetails, nextItemsPage, sellerShopPage, searchSeller, searchEbay, getOAuthCompatibilityTocken } = require('./ebay-search');

async function sleep(ms) {
    return new Promise((res, rej) => {
        setTimeout(() => res(), ms);
    })
}


// searchSeller('mas-autoteile', 5, false);



const app = express()

app.use(cors({
    origin: '*'
}));

app.use(bodyParser.json());

const port = 3213;

app.get('/', async (req, res) => {
    console.log("Params: ", req.query.q);
    const items = await searchEbay(req.query.q, req.query.d);
    console.log(items)
    res.send(JSON.stringify(items))
})

app.post('/', async (req, res) => {
    const { query, params, body } = req;
    console.log('params: ', query, params, body);
    const page = await browser.newPage();
    const details = await getItemDetails(page, req.body.url);
    res.send(JSON.stringify(details))
});

app.get('/seller', async (req, res) => {
    console.log("Params: ", req.query.seller);
    const items = await searchSeller(req.query.seller, +req.query.pages, req.query.d, +(req?.query?.s ?? 1));
    // console.log(items)
    console.log(items.length);
    res.send(JSON.stringify(items))
})

app.get('/compatibility_token', async (req,res) => {
    const result = await getOAuthCompatibilityTocken();
    res.send(JSON.stringify(result));
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})