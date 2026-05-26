const { parentPort, workerData } = require('worker_threads');

(async () => {
    const { extensionPath, extensionName, userInfo, changedTo, memberList } = workerData;

    // `ctx` is passed as the 4th handler argument so extensions can push
    // ad-hoc lines into the wallpad's currently-displayed NotifyWindow.
    // Each `ctx.notify(...)` call sends a separate message to the main
    // thread, which forwards it via socket.io to the frontend. The worker
    // is *not* terminated by these — only the final 'done' message does.
    const ctx = {
        notify(message) {
            if (typeof message !== 'string' || !message.trim()) return;
            parentPort.postMessage({ type: 'notifyAppend', message: message.trim() });
        },
    };

    try {
        // Dynamically require the extension
        const Extension = require(extensionPath);
        const handler = Extension.handler;

        if (typeof handler !== 'function')
            throw new Error(`Handler for extension ${extensionName} is not a function`);

        // Execute the handler with provided arguments
        await handler(userInfo, changedTo, memberList, ctx);

        // Communicate success back to the main thread
        parentPort.postMessage({ type: 'done', status: true });

    } catch (err) {
        console.error('[ExtensionWorker] [ERROR]', extensionName, '\n', err);
        parentPort.postMessage({ type: 'done', status: false });
    }
})();
