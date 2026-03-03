<script lang="ts">
    import LeanCard from './components/LeanCard.svelte';
    import { type TaskNode } from '../scheduler.js';
    import moment from 'moment';

    let { tasks, now = moment() }: { tasks: TaskNode[], now: moment.Moment } = $props();
</script>

<div class="lean-stack-container">
    {#each tasks as task}
        <LeanCard {task} {now} />
    {/each}
</div>

<style>
    .lean-stack-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--background-primary);
    }
</style>
