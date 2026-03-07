import { mount } from 'svelte';
import Component from '../src/views/TriageViewHardShell.svelte';

// Mock Obsidian Mobile Environment
document.body.classList.add('is-mobile', 'os-android', 'theme-dark');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

const target = document.getElementById('app');
if (target) {
    mount(Component, {
        target,
        props: { tasks: [{ title: "Process: New Plugin Idea", id: "task1" }], app: {} }
    });
}
