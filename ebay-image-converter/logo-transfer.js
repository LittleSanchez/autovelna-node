const sharp = require("sharp");
const config = require("./configs");

const WORK_DIR = "bin";
const LOGO = "logo.png";

const COVERING_FILE_NAME = withWindowsPath(`${WORK_DIR}/covering.png`);
const OUT_DIR = "out";

// let inputFile = process.argv[process.argv.indexOf('-i') + 1];
// if (inputFile === process.argv[0]) return;

function withWindowsPath(path) {
    return process.platform === "win32" ? path.replace("/", "\\") : path;
}

function getFileExtension(fileName) {
    return fileName.split(".").pop();
}

function getFileNameWithoutExtension(fileName) {
    return fileName.split(".")[0];
}

async function getMetadata(fileName) {
    try {
        const metadata = await sharp(fileName).metadata();
        console.log(metadata);
    } catch (e) {
        console.error("An Error Occured: ", e);
    }
}

const loadImage = async (fileName) => {
    try {
        return await sharp(fileName);
    } catch (e) {
        console.log(e);
    }
};

const generateCovering = async (companyName) => {
    const { width, height, left, top } = config[companyName];
    console.log(config[companyName]);
    await sharp({
        create: {
            width,
            height,
            channels: 3,
            background: {
                r: 255,
                g: 255,
                b: 255,
            },
        },
    }).toFile(COVERING_FILE_NAME);
};

const resizeLogo = async (companyName, i) => {
    const bareLogo = getFileNameWithoutExtension(LOGO);
    const ext = getFileExtension(LOGO);
    const newLogoName = withWindowsPath(`${WORK_DIR}/${bareLogo}-tmp-${i}.${ext}`);
    const { width, height, left, top } = config[companyName];
    await sharp(withWindowsPath(`${WORK_DIR}/${LOGO}`))
        .resize(width, Number.parseInt(height * 0.75), {
            fit: "contain",
            position: "left top",
            background: {
                alpha: 1,
                r: 255,
                g: 255,
                b: 255,
            },
        })
        .toFile(newLogoName);
    return newLogoName;
};

const applyNewLogo = async (img, companyName, i, createTmpLogo = false) => {
    try {
        const { width, height, left, top } = config[companyName];
        // const newLogoName = await resizeLogo(companyName,i);
        let newLogoName = ''
        if (!createTmpLogo) {
            const bareLogo = getFileNameWithoutExtension(LOGO);
            const ext = getFileExtension(LOGO);
            newLogoName = withWindowsPath(`${WORK_DIR}/${bareLogo}-tmp.${ext}`);
        } else {
            console.log('Creating new logo: ');
            newLogoName = await resizeLogo(companyName,i);
            console.log('New logo created: ', newLogoName);
        }
        console.log("New logo", newLogoName);
        const result = await img.composite([
            {
                input: COVERING_FILE_NAME,
                left,
                top,
            },
            {
                input: newLogoName,
                left,
                top,
            },
        ]);
        return result;
    } catch (e) {
        console.log(e);
        if (!createTmpLogo) {
            console.log("Going to create new logo");
            return await applyNewLogo(img, companyName, i, true);
        }
        return undefined;
    }
};

const transferLogo = async (fileName, companyName, outputFileName, i) => {
    const ext = getFileExtension(fileName);
    const bareFileName = getFileNameWithoutExtension(fileName);
    const img = await loadImage(fileName);
    await generateCovering(companyName);
    const resultImg = await applyNewLogo(img, companyName, i);
    await resultImg.toFile(outputFileName);
};

module.exports = {
    transferLogo,
    OUT_DIR,
    WORK_DIR,
    getFileExtension,
    withWindowsPath,
};
