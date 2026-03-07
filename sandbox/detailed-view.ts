import { mount } from 'svelte';
import Component from '../src/views/DetailedTaskView.svelte';
import moment from 'moment';

// Mock Obsidian Mobile Environment
document.body.classList.add('theme-dark', 'is-mobile', 'os-android');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

const target = document.getElementById('app');
if (target) {
    mount(Component, {
        target,
        props: {
            task: {
                id: 'prod-task',
                title: 'Production: Wired to src/views/',
                duration: 60,
                startTime: moment().add(1, 'hour'),
                isAnchored: true,
                status: 'todo'
            },
            onClose: () => { console.log("Closed"); },
            onTaskUpdate: (t) => { console.log("Task Update", t); },
            onToggleAnchor: () => { console.log("Toggle Anchor"); },
            onDrillDown: () => { console.log("Drill Down"); },
            onComplete: () => { console.log("Complete"); },
            onArchive: () => { console.log("Archive"); },
            onUndo: () => { console.log("Undo"); }
        }
    });
}
