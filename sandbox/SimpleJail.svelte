<script lang="ts">
    import ShadowDump from './prototypes/ShadowDump.svelte';
    import ShadowTriage from './prototypes/ShadowTriage.svelte';
    import ShadowStack from './prototypes/ShadowStack.svelte';

    let currentView = $state<'dump' | 'triage' | 'stack'>('dump');
</script>

<div class="lab-controls">
    <button class:active={currentView === 'dump'} onclick={() => currentView = 'dump'}>1. Dump Mode</button>
    <button class:active={currentView === 'triage'} onclick={() => currentView = 'triage'}>2. Triage Mode</button>
    <button class:active={currentView === 'stack'} onclick={() => currentView = 'stack'}>3. Stack Mode (Architect)</button>
</div>

<div class="view-container">
    {#if currentView === 'dump'}
        <ShadowDump onComplete={() => currentView = 'triage'} />
    {:else if currentView === 'triage'}
        <ShadowTriage title="Process: New Plugin Idea" />
    {:else}
        <ShadowStack />
    {/if}
</div>

<style>
    .lab-controls {
        padding: 10px;
        background: #222;
        display: flex;
        gap: 10px;
        justify-content: center;
        border-bottom: 1px solid #444;
        z-index: 100;
        position: relative;
    }
    button {
        padding: 8px 16px;
        background: #333;
        color: #ccc;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.85rem;
    }
    button.active {
        background: #75abd0;
        color: white;
        border-color: transparent;
    }
    .view-container {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: var(--background-primary);
    }
</style>
