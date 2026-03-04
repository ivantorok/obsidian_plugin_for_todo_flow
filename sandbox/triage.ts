import { mount } from 'svelte';
import TriageStructure from './prototypes/TriageStructure.svelte';

// Mock Obsidian Mobile Environment
document.body.classList.add('is-mobile', 'os-android', 'theme-dark');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

const protoTarget = document.getElementById('app');
if (protoTarget) {
    mount(TriageStructure, {
        target: protoTarget,
        props: {
            title: "Process: New Plugin Idea"
        }
    });
}
