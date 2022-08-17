const { Axios, default: axios } = require('axios');
const { exec } = require('child_process');

const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const { OUT_DIR, transferLogo, WORK_DIR, getFileExtension } = require('./logo-transfer');
const { createWriteStream, rm, rmSync } = require('fs');

console.log(new Date().toISOString())

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
    const newImages = await proceedImages(companyName, images);
    res.send(newImages);
});

app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
})