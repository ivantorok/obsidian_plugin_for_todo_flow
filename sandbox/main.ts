import { mount } from 'svelte';
import StackView from '../src/views/StackView.svelte';
import { HistoryManager } from '../src/history.js';
import moment from 'moment';

const mockTasks = [
    { id: '1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: '2', title: 'Task 2', duration: 15, status: 'todo', isAnchored: false, children: [] }
];

const historyManager = new HistoryManager();

const app = mount(StackView, {
    target: document.getElementById('app')!,
    props: {
        initialTasks: mockTasks,
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
            deleteTask: ['Backspace']
        },
        now: moment(),
        onOpenFile: (path: string) => alert(`Opening ${path}`),
        onTaskUpdate: (task: any) => console.log('Update', task),
        onTaskCreate: (title: string) => {
            console.log('Create', title);
            return { id: Math.random().toString(), title, duration: 30, status: 'todo', isAnchored: false, children: [] };
        },
        historyManager
    }
});

export default app;
