import { mount } from 'svelte';
import StackViewStructure from './prototypes/StackViewStructure.svelte';

const protoTarget = document.getElementById('app');
if (protoTarget) {
    mount(StackViewStructure, { target: protoTarget, props: {} });
}
