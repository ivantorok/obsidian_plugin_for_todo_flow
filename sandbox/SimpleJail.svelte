<script lang="ts">
    import ShadowDump from './prototypes/ShadowDump.svelte';
    import ShadowTriage from './prototypes/ShadowTriage.svelte';
    import ShadowStack from './prototypes/ShadowStack.svelte';
    import TriageViewHardShell from '../src/views/TriageViewHardShell.svelte';
    import DumpViewHardShell from '../src/views/DumpViewHardShell.svelte';
    import PrimitivesStorybook from './prototypes/PrimitivesStorybook.svelte';
    import DetailedTaskView from './prototypes/DetailedTaskView.svelte';


    let currentView = $state<'primitives' | 'dump' | 'dump_hardshell' | 'triage' | 'hardshell' | 'stack' | 'detailed'>('primitives');

</script>

<div class="lab-controls">
    <button class:active={currentView === 'primitives'} onclick={() => currentView = 'primitives'}>0. Primitives Lab</button>
    <button class:active={currentView === 'dump'} onclick={() => currentView = 'dump'}>1. Dump Mode</button>
    <button class:active={currentView === 'dump_hardshell'} onclick={() => currentView = 'dump_hardshell'}>1b. Dump Mode (Hard Shell)</button>
    <button class:active={currentView === 'triage'} onclick={() => currentView = 'triage'}>2. Triage Mode (Shadow)</button>
    <button class:active={currentView === 'hardshell'} onclick={() => currentView = 'hardshell'}>2b. Triage Mode (Hard Shell)</button>
    <button class:active={currentView === 'stack'} onclick={() => currentView = 'stack'}>3. Stack Mode (Architect)</button>
    <button class:active={currentView === 'detailed'} onclick={() => currentView = 'detailed'}>4. Detailed View (Modal)</button>

</div>

<div class="view-container">
    {#if currentView === 'primitives'}
        <PrimitivesStorybook />
    {:else if currentView === 'dump'}
        <ShadowDump onComplete={() => currentView = 'triage'} />
    {:else if currentView === 'dump_hardshell'}
        <DumpViewHardShell 
            app={{}} 
            folder="sandbox" 
            logger={{ info: () => {} }} 
            onComplete={() => currentView = 'triage'} 
        />
    {:else if currentView === 'triage'}
        <ShadowTriage title="Process: New Plugin Idea" />
    {:else if currentView === 'hardshell'}
        <TriageViewHardShell 
            tasks={[{ title: "Process: New Plugin Idea", id: "task1" }]}
            app={{}}
            onComplete={() => console.log('Complete')}
        />
    {:else if currentView === 'stack'}
        <ShadowStack />
    {:else if currentView === 'detailed'}
        <DetailedTaskView onClose={() => currentView = 'stack'} />
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
