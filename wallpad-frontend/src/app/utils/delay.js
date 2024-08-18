export default async function delay(ms) {
    await new Promise(done => {
        setTimeout(() => done(), ms);
    });
};