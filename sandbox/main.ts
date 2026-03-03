import { mount } from 'svelte';
import StackView from '../src/views/StackView.svelte';
import { HistoryManager } from '../src/history.js';
import moment from 'moment';

// Mock Obsidian Mobile Environment
document.body.classList.add('is-mobile', 'os-android');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

const mockTasks = [
    { id: '1', title: 'Deep Work: Finalize Q4', duration: 90, startTime: moment().add(1, 'hour'), status: 'todo', isAnchored: true, children: [] },
    { id: '2', title: 'Email Triage', duration: 15, startTime: moment().add(2.5, 'hours'), status: 'todo', isAnchored: false, children: [] },
    { id: '3', title: 'Design Review', duration: 30, startTime: moment().add(3, 'hours'), status: 'done', isAnchored: false, children: [] },
    { id: '4', title: 'Team Sync', duration: 45, startTime: moment().add(4, 'hours'), status: 'todo', isAnchored: false, children: [] }
];

const historyManager = new HistoryManager();

const app = mount(StackView, {
    target: document.getElementById('app')!,
    props: {
        initialTasks: mockTasks,
        settings: {
            keys: {
                navUp: ['k', 'ArrowUp'],
                navDown: ['j', 'ArrowDown'],
                moveUp: ['K'],
                moveDown: ['J'],
                anchor: ['Shift+F'],
                durationUp: ['f', 'ArrowRight'],
                durationDown: ['d', 'ArrowLeft'],
                undo: ['u'],
                redo: ['U'],
                confirm: ['Enter'],
                cancel: ['Escape'],
                toggleDone: ['x'],
                createTask: ['c'],
                deleteTask: ['Backspace'],
                forceOpen: ['Shift+Enter'],
                goBack: ['h'],
                export: ['Shift+E'],
                rename: ['e'],
                archive: ['z'],
                quickAdd: [],
                editStartTime: ['s'],
                toggleHelp: ['?']
            },
            enableMobileView: true
        } as any,
        now: moment(),
        onOpenFile: (path: string) => console.log(`Opening ${path}`),
        onTaskUpdate: (task: any) => console.log('Update', task),
        onTaskCreate: (title: string) => {
            console.log('Create', title);
            return { id: Math.random().toString(), title, duration: 30, status: 'todo', isAnchored: false, children: [] };
        },
        historyManager,
        navState: {
            tasks: mockTasks,
            focusedIndex: 0,
            parentTaskName: null,
            canGoBack: false,
            rootPath: null,
            isMobile: true,
            viewMode: "architect"
        }
    }
});

export default app;
