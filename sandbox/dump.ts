import { mount } from 'svelte';
import StackViewStructure from './prototypes/StackViewStructure.svelte';

// Mock Obsidian Mobile Environment
document.body.classList.add('is-mobile', 'os-android', 'theme-dark');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

const protoTarget = document.getElementById('app');
if (protoTarget) {
    mount(StackViewStructure, {
        target: protoTarget,
        props: {
            path: "Projects > Internal > Todo Flow",
            taskCount: 4,
            currentIndex: 0
        }
    });
}
