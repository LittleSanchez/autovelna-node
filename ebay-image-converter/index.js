const { Axios, default: axios } = require('axios');
const { exec } = require('child_process');

const express = require('express')
const cors = require('cors');
const { createHash } = require('crypto');
const bodyParser = require('body-parser');
const { OUT_DIR, transferLogo, WORK_DIR, getFileExtension } = require('./logo-transfer');
const { createWriteStream, rm, rmSync } = require('fs');

console.log(new Date().toISOString())


const VERIFICATION_TOKEN = "t9v-t7i8o7_tiu-r7ihl37iGLg_L43423";
const ENDPOINT = "https://92d3-90-138-230-168.ngrok.io";


async function downloadFile(fileUrl, outputLocationPath) {
    const writer = createWriteStream(outputLocationPath);

    return axios.get(fileUrl, {
        responseType: 'stream',
    }).then(response => {

        //ensure that the user can call `then()` only when the file has
        //been downloaded entirely.

        return new Promise((resolve, reject) => {
            response.data.pipe(writer);
            let error = null;
            writer.on('error', err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error) {
                    resolve(true);
                }
                //no need to call the reject here, as it will have been called in the
                //'error' stream;
            });
        });
    });
}

const proceedImages = async (companyName, images) => {
    const __dir = `${companyName}-${new Date().toISOString()}`;
    const outputDir = `${OUT_DIR}/${__dir}`;
    exec(`mkdir ${outputDir}`, (err, stdout, stderr) => {
        if (err) {
            console.error(err)
        } else {
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
        }
    })
    exec(`mkdir ${WORK_DIR}/tmp`, (err, stdout, stderr) => {
        if (err) {
            console.error(err)
        } else {
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
        }
    })
    const newImages = [];
    for (let i = 0; i < images.length; i++) {
        const image = images[i];

        console.log("Currently working on ", image);
        const ext = getFileExtension(image);
        const inputFile = `${WORK_DIR}/tmp/tmp-dwnld-${i + 1}.${ext}`;
        const outputFile = `${outputDir}/${companyName}-${i + 1}.${ext}`;
        try {
            rmSync(inputFile);
        } catch (e) { }
        await downloadFile(image, inputFile);
        await transferLogo(inputFile, companyName, outputFile);
        console.log("Success");
        newImages.push(`http://localhost:${port}/images/${__dir}/${companyName}-${i + 1}.${ext}`);
    }
    try {
        rmSync(`${WORK_DIR}/tmp`);
    } catch (e) { }
    return newImages;
}

const app = express()

app.use(cors({
    origin: '*'
}));

app.use(bodyParser.json());

app.use('/images', express.static(__dirname + '/out'));

const port = 3253;

app.post('/', async (req, res) => {
    console.log(req.body);
    const { companyName, images } = req.body;
    if (!images || !companyName) res.sendStatus(200);
    const newImages = await proceedImages(companyName, images);
    res.send(newImages);
});


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
    console.log(`Example app listening on port http://localhost:${port}`)
})