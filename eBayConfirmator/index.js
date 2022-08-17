console.log("Hello world");

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createHash } = require('crypto');
const { default: axios } = require('axios');

const VERIFICATION_TOKEN = "t9v-t7i8o7_tiu-r7ihl37iGLg_L43423";
const ENDPOINT = "https://eb3e-90-138-230-168.ngrok.io";

const app = express();

app.use(cors({
    origin: '*'
}))

app.use(bodyParser.json());

const port = 4444;

app.get('/', async (req, res) => {
    const challengeCode = req.query.challenge_code;
    if (!challengeCode) {
        res.send({})
        return;
    }
    console.log(challengeCode);
    const hash = createHash('sha256');
    hash.update(challengeCode);
    hash.update(VERIFICATION_TOKEN);
    hash.update(ENDPOINT);
    const responseHash = hash.digest('hex');
    console.log({
        challengeResponse: new Buffer.from(responseHash).toString()
    })
    res.json({
        challengeResponse: new Buffer.from(responseHash).toString()
    })
})

app.get('/accepted', async (req, res) => {
    console.log(req.body, req.query);
    res.redirect('https://www.ebay.com');
})

app.post('/accepted', async (req, res) => {
    console.log(req.body, req.query);
    res.redirect('https://www.ebay.com');
})

app.post('/redirect', async (req, res) => {
    console.log(req.body);
    try {

        const response = await axios({
            url: req.body.url,
            method: req.body.method,
            data: req.body.data,
            params: req.query,
            headers: req.body.headers
        });
        res.json({
            status: response.status,
            statusText: response.statusText,
            data: response.data
        });
    }
    catch (e) {
        console.log(e?.response?.data?.errors);
        res.json(e?.response?.data);
    }
})

app.listen(port, () => {
    console.log("Listeting on " + port);
})

