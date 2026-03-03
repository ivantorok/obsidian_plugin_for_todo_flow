import { mount } from 'svelte';
import SleekFocusCenterpiece from './prototypes/SleekFocusCenterpiece.svelte';
import moment from 'moment';

const protoTarget = document.getElementById('app');
if (protoTarget) {
    mount(SleekFocusCenterpiece, {
        target: protoTarget,
        props: {
            title: 'Deep Work: Finalize Q4 Focus Design',
            startTime: moment().add(1, 'hour'),
            duration: 90,
            status: 'todo',
            isAnchored: true,
            index: 0,
            total: 3
        }
    });

    mount(SleekFocusCenterpiece, {
        target: protoTarget,
        props: {
            title: 'Secondary Task (Not Anchored)',
            startTime: moment().subtract(10, 'minutes'),
            duration: 15,
            status: 'todo',
            isAnchored: false,
            index: 1,
            total: 3
        }
    });
}
