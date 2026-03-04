import { mount } from 'svelte';
import SimpleJail from './SimpleJail.svelte';

// Mock Obsidian Mobile Environment
document.body.classList.add('is-mobile', 'os-android', 'theme-dark');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

mount(SimpleJail, {
    target: document.getElementById('app')!,
    props: {}
});
