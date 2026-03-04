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

<div class="todo-flow-stack-footer">
    <div class="footer-actions">
        <button
            class="action-btn secondary undo-btn"
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
            class="action-btn primary plus-btn"
            onclick={onQuickAdd}
            title="Add Task"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
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
            class="action-btn secondary export-btn"
            onclick={onExport}
            title="Export completed tasks"
            style="display:none;"
        >
            <!-- Hide export for now to match the 3-button shadow stack, or keep it depending on UX. The prototype had 3 buttons. -->
        </button>

        <button
            class="action-btn secondary redo-btn"
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
    </div>

    {#if showHelp}
        <HelpModal {keys} {settings} />
    {/if}
</div>

<style>
    /* Shadow Footer Styles */
    .todo-flow-stack-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 64px));
        background: linear-gradient(transparent, var(--background-primary) 60%);
        display: flex;
        justify-content: center;
        pointer-events: none; /* Let clicks pass through the gradient */
    }

    .footer-actions {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        pointer-events: auto; /* Re-enable clicks for buttons */
    }

    .action-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .action-btn:hover {
        transform: translateY(-2px);
    }

    .action-btn.primary {
        background: var(--interactive-accent);
        color: white;
        width: 54px;
        height: 54px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .action-btn.primary:hover {
        background: var(--interactive-accent-hover);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    .action-btn.secondary {
        background: var(--background-secondary-alt);
        color: var(--text-muted);
        border: 1px solid var(--background-modifier-border);
    }

    .action-btn.secondary:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }
</style>
