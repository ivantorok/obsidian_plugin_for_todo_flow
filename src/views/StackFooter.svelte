<script lang="ts">
    import type { HistoryManager } from "../history.js";

    let {
        historyManager,
        showHelp,
        keys,
        settings,
        onUndo,
        onRedo,
        onQuickAdd,
        onExport,
    }: {
        historyManager: HistoryManager;
        showHelp: boolean;
        keys: any;
        settings: any;
        onUndo: () => void;
        onRedo: () => void;
        onQuickAdd: () => void;
        onExport: () => void;
    } = $props();

    // Import HelpModal dynamically or pass it as a prop?
    // Let's assume HelpModal is available or passed.
    import HelpModal from "./HelpModal.svelte";
</script>

<div class="footer-controls">
    <button
        class="icon-button undo-btn"
        onclick={onUndo}
        title="Undo (Ctrl+Z)"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v.5" /></svg
        >
    </button>

    <button
        class="icon-button plus-btn"
        onclick={onQuickAdd}
        title="Add Task"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><line x1="12" y1="5" x2="12" y2="19"></line><line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
            ></line></svg
        >
    </button>

    <button
        class="icon-button export-btn"
        onclick={onExport}
        title="Export completed tasks"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" /><polyline
                points="7 10 12 15 17 10"
            /><line x1="12" y1="15" x2="12" y2="3" /></svg
        >
    </button>

    <button
        class="icon-button redo-btn"
        onclick={onRedo}
        title="Redo (Ctrl+Y)"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v.5" /></svg
        >
    </button>

    {#if showHelp}
        <HelpModal {keys} {settings} />
    {/if}
</div>

<style>
    .footer-controls {
        position: fixed;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 1rem;
        background: var(--background-secondary-alt);
        padding: 0.6rem 1.2rem;
        border-radius: 2rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        border: 1px solid var(--background-modifier-border);
        backdrop-filter: blur(8px);
    }

    .icon-button {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .icon-button:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
        transform: translateY(-2px);
    }

    .plus-btn {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }

    .plus-btn:hover {
        background: var(--interactive-accent-hover);
        color: var(--text-on-accent);
    }
</style>
