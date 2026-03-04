import { mount } from 'svelte';
import LongPressPrototypeWrapper from './prototypes/LongPressPrototypeWrapper.svelte';

const protoTarget = document.getElementById('app');

if (protoTarget) {
    mount(LongPressPrototypeWrapper, { target: protoTarget });
}
