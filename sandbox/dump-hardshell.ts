import { mount } from 'svelte';
import Component from '../src/views/DumpViewHardShell.svelte';

// Mock Obsidian Mobile Environment
document.body.classList.add('is-mobile', 'os-android', 'theme-dark');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

const target = document.getElementById('app');
if (target) {
    mount(Component, {
        target,
        props: { app: {}, folder: "sandbox", logger: { info: () => {} } }
    });
}
