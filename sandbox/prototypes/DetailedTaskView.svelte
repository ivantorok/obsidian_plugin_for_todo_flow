<script lang="ts">
    import { moment } from 'obsidian';

    interface Props {
        title: string;
        startTime: any;
        duration: number;
        status: 'todo' | 'done';
        isAnchored: boolean;
        onClose: () => void;
    }

    let {
        title = $bindable(),
        startTime = $bindable(),
        duration = $bindable(),
        status = $bindable(),
        isAnchored = $bindable(),
        onClose
    } = $props<Props>();

    const formatTime = (time: any) => time ? time.format('HH:mm') : '--:--';
    const formatDuration = (d: number) => {
        const h = Math.floor(d / 60);
        const m = d % 60;
        return h > 0 ? `${h}h${m}m` : `${m}m`;
    };

    function toggleStatus() {
        status = status === 'done' ? 'todo' : 'done';
    }

    function toggleAnchor() {
        isAnchored = !isAnchored;
    }
</script>

<div class="detailed-view-overlay" onclick={onClose}>
    <div class="detailed-view-modal" onclick={(e) => e.stopPropagation()}>
        <!-- Header Metadata -->
        <div class="modal-header">
            <div class="metadata-badges">
                <button class="meta-badge time" aria-label="Edit Start Time">
                    {formatTime(startTime)}
                </button>
                <button class="meta-badge duration" aria-label="Edit Duration">
                    {formatDuration(duration)}
                </button>
            </div>
            <button class="close-btn" onclick={onClose}>&times;</button>
        </div>

        <!-- Content Area: Keyboard Safe -->
        <div class="modal-content">
            <textarea 
                class="title-input" 
                bind:value={title} 
                placeholder="What needs to be done?"
                rows="3"
            ></textarea>
        </div>

        <!-- Footer: Action Rail -->
        <div class="modal-footer">
            <div class="action-rail">
                <button class="rail-btn complete" class:is-done={status === 'done'} onclick={toggleStatus}>
                    {status === 'done' ? '↺ Undo' : '✓ Done'}
                </button>
                <button class="rail-btn archive">📦 Archive</button>
                <button class="rail-btn anchor" class:active={isAnchored} onclick={toggleAnchor}>
                    ⚓ {isAnchored ? 'Release' : 'Anchor'}
                </button>
            </div>
            
            <div class="secondary-actions">
                <button class="secondary-btn drill-down">📂 Sub-stack</button>
                <button class="secondary-btn delete">🗑 Delete</button>
            </div>
        </div>
    </div>
</div>

<style>
    @import "../../src/styles/stack-shared.css";
    @import "../../src/styles/design-tokens.css";

    .detailed-view-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center; /* Default Centered */
        justify-content: center;
        padding: 20px;
        z-index: 2000;
        transition: all 0.3s ease;
        box-sizing: border-box;
    }

    /* VIEWPORT AWARE SHIFT: When keyboard is active, move modal to top */
    :global(.keyboard-active) .detailed-view-overlay {
        align-items: flex-start;
        padding-top: 40px;
    }

    .detailed-view-modal {
        width: 100%;
        max-width: 360px;
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: modal-enter 0.2s cubic-bezier(0, 0, 0.2, 1);
        box-sizing: border-box;
    }

    @keyframes modal-enter {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .metadata-badges {
        display: flex;
        gap: 8px;
    }

    .meta-badge {
        font-family: var(--font-monospace);
        font-size: 0.85rem;
        font-weight: 600;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        cursor: pointer;
    }

    .meta-badge.duration {
        color: var(--interactive-accent);
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        padding: 0;
    }

    .modal-content {
        padding: 20px;
    }

    .title-input {
        width: 100%;
        background: transparent;
        border: none;
        color: var(--text-normal);
        font-family: var(--font-interface);
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.4;
        resize: none;
        outline: none;
        padding: 0;
    }

    .modal-footer {
        padding: 16px 20px;
        background: var(--background-secondary);
        border-top: 1px solid var(--background-modifier-border);
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .action-rail {
        display: flex;
        gap: 8px;
    }

    .rail-btn {
        flex: 1;
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 10px 4px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: background-color 0.2s ease;
    }

    .rail-btn.is-done {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border-color: var(--interactive-accent);
    }

    .rail-btn.active {
        color: var(--interactive-accent);
        border-color: var(--interactive-accent);
    }

    .secondary-actions {
        display: flex;
        justify-content: space-between;
    }

    .secondary-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 6px;
        transition: background-color 0.2s ease, color 0.2s ease;
    }

    .secondary-btn:hover {
        background: var(--background-modifier-border);
        color: var(--text-normal);
    }

    .secondary-btn.delete:hover {
        background: rgba(248, 81, 73, 0.1);
        color: var(--text-error, #f85149);
    }
</style>
