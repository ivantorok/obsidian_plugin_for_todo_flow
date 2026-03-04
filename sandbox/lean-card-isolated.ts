import { mount } from 'svelte';
import HighDensityLeanCard from './prototypes/HighDensityLeanCard.svelte';
import moment from 'moment';

const protoTarget = document.getElementById('app');
if (protoTarget) {
    const prototypes = [
        { title: 'Normal Task', startTime: moment(), duration: 30, status: 'todo', isAnchored: false },
        { title: 'Focused Task', startTime: moment().add(5, 'minutes'), duration: 20, status: 'todo', isAnchored: false, focused: true },
        { title: 'Anchored Task', startTime: moment().add(10, 'minutes'), duration: 15, status: 'todo', isAnchored: true },
        { title: 'Completed Task', startTime: moment().subtract(1, 'hour'), duration: 45, status: 'done', isAnchored: false }
    ];

    prototypes.forEach(props => {
        mount(HighDensityLeanCard, { target: protoTarget, props: props as any });
    });
}
