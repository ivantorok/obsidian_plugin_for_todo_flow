const { remote } = require('webdriverio');
const fs = require('fs');

(async () => {
    const browser = await remote({
        capabilities: {
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: ['--headless', '--disable-gpu']
            }
        }
    });

    try {
        // We need to use the wdio config but for simplicity we'll just run the test directly if possible
        // Actually, it's better to just run the test via wdio and have it log the _logs on failure.
        // I'll modify the test file temporarily to log window._logs on failure.
    } finally {
        await browser.deleteSession();
    }
})();
