const { parentPort, workerData } = require('worker_threads');

(async () => {
    const { extensionPath, extensionName, userInfo, changedTo, memberList } = workerData;

    try {
        // Dynamically require the extension
        const Extension = require(extensionPath);
        const handler = Extension.handler;

        if (typeof handler !== 'function')
            throw new Error(`Handler for extension ${extensionName} is not a function`);

        // Execute the handler with provided arguments
        await handler(userInfo, changedTo, memberList);

        // Communicate success back to the main thread
        parentPort.postMessage({ status: true });
        
    } catch (err) {
        console.error('[ExtensionWorker] [ERROR]', extensionName, '\n', err);
        parentPort.postMessage({ status: false });
    }
})();