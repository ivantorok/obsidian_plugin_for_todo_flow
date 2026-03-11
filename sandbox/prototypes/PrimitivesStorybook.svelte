<script lang="ts">
    import ActionButton from '../../src/components/ActionButton.svelte';
    import IconButton from '../../src/components/IconButton.svelte';
    import SovereignInput from '../../src/components/SovereignInput.svelte';
    import SubstackPrototype from './SubstackPrototype.svelte';

    let inputValue = $state("");
</script>

<div class="storybook">
    <h1>Sovereign UI Primitives</h1>
    <p class="subtitle">These primitives enforce the "Flat & Performant" aesthetic mandate.</p>

    <section>
        <h2>ActionButton</h2>
        <div class="component-row">
            <ActionButton text="Primary Action" variant="primary" />
            <ActionButton text="Secondary Action" variant="secondary" />
            <ActionButton text="Danger Action" variant="danger" />
            <ActionButton text="Disabled" disabled={true} />
        </div>
    </section>

    <section>
        <h2>IconButton</h2>
        <p class="note">Note: Icons rely on Obsidian's run-time environment. In the sandbox, they will appear empty unless the mock is updated, but the touch target and hover states are verifiable.</p>
        <div class="component-row">
            <IconButton icon="lucide-plus" label="Add" />
            <IconButton icon="lucide-undo" label="Undo" />
            <IconButton icon="lucide-trash" label="Delete" disabled={true} />
        </div>
    </section>

    <section>
        <h2>SovereignInput</h2>
        <p class="note">Option A logic: Type multiple lines to see <code>flex-shrink: 0</code> auto-resizing work and push content down.</p>
        <div class="input-container">
            <SovereignInput bind:value={inputValue} placeholder="Type a long task name here to test multi-line expanding..." />
            <div class="dummy-content">
                This content gets pushed down automatically.
            </div>
    <section>
        <h2>Substack Hierarchy (FEAT-016)</h2>
        <p class="note">Prototyping nested task navigation and recursive duration rollups.</p>
        <SubstackPrototype />
    </section>
</div>

<style>
    .storybook {
        padding: 40px;
        max-width: 800px;
        margin: 0 auto;
        color: var(--text-normal, #ddd);
        overflow-y: auto;
        height: 100%;
    }

    h1 {
        font-size: 2rem;
        margin-bottom: 0.2em;
        font-weight: 600;
        letter-spacing: -0.02em;
    }

    .subtitle {
        color: var(--text-muted, #888);
        margin-bottom: 40px;
        font-size: 1.1rem;
    }

    section {
        margin-bottom: 40px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 24px;
    }

    h2 {
        font-size: 1.2rem;
        margin-top: 0;
        margin-bottom: 16px;
        color: var(--interactive-accent, #75abd0);
    }

    .note {
        font-size: 0.85rem;
        color: var(--text-muted, #888);
        margin-bottom: 16px;
        font-style: italic;
    }

    .component-row {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        align-items: center;
    }

    .input-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: var(--background-primary, #1e1e1e);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid var(--border-color, #444);
    }

    .dummy-content {
        padding: 16px;
        background: rgba(117, 171, 208, 0.1);
        border: 1px dashed var(--interactive-accent, #75abd0);
        border-radius: 8px;
        color: var(--text-muted, #888);
        text-align: center;
    }
</style>
