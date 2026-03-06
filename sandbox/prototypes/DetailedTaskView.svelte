<script lang="ts">
    /**
     * @component DetailedTaskView
     * @description A full-screen, tap-centric modal for deep task inspection.
     * Enforces strict tap/keyboard interaction (no gestures).
     */
    import SovereignInput from '../../src/components/SovereignInput.svelte';
    import ActionButton from '../../src/components/ActionButton.svelte';
    import IconButton from '../../src/components/IconButton.svelte';

    interface Props {
        taskTitle?: string;
        onClose?: () => void;
    }

    let { 
        taskTitle = "Prototype: Build Viewport-Aware Modal", 
        onClose 
    } = $props<Props>();

    let title = $state(taskTitle);
    let notes = $state("");
</script>

<div class="detailed-view-modal">
    <!-- Header: Fixed -->
    <header class="modal-header">
        <IconButton 
            icon="lucide-x" 
            label="Close" 
            onclick={onClose} 
        />
        <div class="header-title">Task Details</div>
        <div class="header-actions">
            <ActionButton text="Save" variant="primary" />
        </div>
    </header>

    <!-- Content: Scrollable -->
    <main class="modal-content">
        <section class="content-section">
            <label class="section-label">Title</label>
            <SovereignInput 
                bind:value={title} 
                placeholder="Task title..." 
                autofocus={true}
            />
        </section>

        <section class="content-section metadata-grid">
            <div class="metadata-item">
                <label class="section-label">Status</label>
                <div class="status-pill">In Progress</div>
            </div>
            <div class="metadata-item">
                <label class="section-label">Schedule</label>
                <div class="time-pill">Today, 14:00</div>
            </div>
        </section>

        <section class="content-section flex-grow">
            <label class="section-label">Notes</label>
            <textarea 
                bind:value={notes} 
                class="notes-input" 
                placeholder="Add detailed notes here..."
            ></textarea>
        </section>
    </main>

    <!-- Footer: Fixed -->
    <footer class="modal-footer">
        <ActionButton text="Archive" variant="danger" class="flex-1" />
        <ActionButton text="Complete" variant="primary" class="flex-2" />
    </footer>
</div>

<style>
    .detailed-view-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--background-primary, #1e1e1e);
        display: flex;
        flex-direction: column;
        z-index: 1000;
        color: var(--text-normal, #ddd);
    }

    /* Fixed Header */
    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: var(--background-secondary, #2a2a2a);
        border-bottom: 1px solid var(--border-color, #444);
        height: 56px;
        flex-shrink: 0;
    }

    .header-title {
        font-weight: 600;
        font-size: 1rem;
        color: var(--text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Scrollable Content */
    .modal-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 32px;
    }

    .content-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .section-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .metadata-grid {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 16px;
    }

    .status-pill, .time-pill {
        background: var(--background-secondary, #2a2a2a);
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--border-color, #444);
        font-size: 0.95rem;
        font-weight: 500;
    }

    .notes-input {
        width: 100%;
        min-height: 200px;
        background: transparent;
        border: none;
        color: var(--text-normal, #ddd);
        font-size: 1rem;
        line-height: 1.5;
        font-family: inherit;
        resize: none;
        outline: none;
        padding: 0;
    }

    /* Fixed Footer */
    .modal-footer {
        padding: 16px;
        background: var(--background-secondary, #2a2a2a);
        border-top: 1px solid var(--border-color, #444);
        display: flex;
        gap: 12px;
        flex-shrink: 0;
        padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .flex-grow { flex-grow: 1; }
</style>
