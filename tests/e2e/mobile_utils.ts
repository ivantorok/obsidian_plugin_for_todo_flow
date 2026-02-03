import { browser } from '@wdio/globals';

/**
 * Emulates a mobile device in Obsidian by:
 * 1. Resizing the window to a mobile viewport.
 * 2. Adding the 'is-mobile' class to the body.
 * 3. Mocking app.isMobile to true.
 */
export async function emulateMobile() {
    // 1. Try to resize window, but don't fail if not supported
    try {
        // @ts-ignore
        await browser.setWindowSize(390, 844);
    } catch (e: any) {
        console.warn('[WDIO] Failed to set window size, continuing with CSS emulation:', e.message);
    }

    // 2. Inject CSS class and mock app.isMobile
    await browser.execute(() => {
        document.body.classList.add('is-mobile');
        document.body.classList.remove('is-desktop');

        // @ts-ignore
        if (window.app) {
            // @ts-ignore
            window.app.isMobile = true;
        }

        // Trigger a resize event to ensure Svelte/UI components update
        window.dispatchEvent(new Event('resize'));
    });
}

/**
 * Resets the environment to desktop.
 */
export async function resetToDesktop() {
    try {
        // @ts-ignore
        await browser.setWindowSize(1200, 800);
    } catch (e: any) {
        console.warn('[WDIO] Failed to reset window size:', e.message);
    }

    await browser.execute(() => {
        document.body.classList.remove('is-mobile');
        document.body.classList.add('is-desktop');

        // @ts-ignore
        if (window.app) {
            // @ts-ignore
            window.app.isMobile = false;
        }

        window.dispatchEvent(new Event('resize'));
    });
}
