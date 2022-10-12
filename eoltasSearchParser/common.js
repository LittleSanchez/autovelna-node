async function sleep(ms) {
    return new Promise((res, rej) => {
        setTimeout(() => res(), ms);
    })
}

module.exports = {
    sleep
}