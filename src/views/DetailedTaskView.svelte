<script lang="ts">
    /**
     * @component DetailedTaskView
     * @description A fully immersive, 100% tap/keyboard-driven environment for a single TaskNode.
     * 
     * @architecture Viewport-Aware Option A
     * Unlike the main StackView which relies heavily on gestures, this view strictly prohibits them.
     * To accommodate the soft keyboard on mobile devices seamlessly, this component uses
     * 'Option A' logic: On focus of the primary `.title-input`, the parent container simulates
     * a shrinking viewport, and the `textarea` gracefully expands to command the remaining 
     * vertical real estate (`flex-shrink: 0`, `min-height` expansion). 
     * All action buttons are inherently pushed below the fold to eliminate visual clutter,
     * becoming accessible via scroll only if necessary.
     */
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

    function toggleAnchor() {
        isAnchored = !isAnchored;
    }

    function toggleStatus() {
        status = status === 'done' ? 'todo' : 'done';
    }

    const DURATION_STEPS = [2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480];

    function adjustDuration(direction: 1 | -1) {
        if (direction === 1) {
            const next = DURATION_STEPS.find(s => s > duration);
            if (next) duration = next;
        } else {
            const prev = [...DURATION_STEPS].reverse().find(s => s < duration);
            if (prev) duration = prev;
        }
    }
</script>

<div class="detailed-view-overlay" onclick={onClose}>
    <div class="detailed-view-container" onclick={(e) => e.stopPropagation()}>
        
        <!-- Original Simple Layout -->
        <div class="metadata">
            <span class="meta-item time">{formatTime(startTime)}</span>
            <span class="meta-item duration">{formatDuration(duration)}</span>
        </div>
        
        <textarea 
            class="title-input" 
            bind:value={title} 
            placeholder="What needs to be done?"
            rows="3"
            onfocus={() => document.getElementById('jail')?.classList.add('keyboard-active')}
            onblur={() => document.getElementById('jail')?.classList.remove('keyboard-active')}
        ></textarea>

        <!-- Dump of Obsidian-style Buttons -->
        <div class="button-dump">
            <div class="button-group">
                <button class="obsidian-btn" onclick={toggleAnchor}>
                    {isAnchored ? 'Deanchor' : 'Anchor'}
                </button>
                <button class="obsidian-btn" disabled={!isAnchored}>
                    Set Start Time
                </button>
            </div>

            <div class="button-group">
                <button class="obsidian-btn" onclick={() => adjustDuration(-1)}>- Duration</button>
                <button class="obsidian-btn" onclick={() => adjustDuration(1)}>+ Duration</button>
            </div>

            <div class="button-group">
                <button class="obsidian-btn" onclick={toggleStatus}>
                    {status === 'done' ? 'Mark as Todo' : 'Mark as Completed'}
                </button>
                <button class="obsidian-btn">Archive</button>
            </div>

            <div class="button-group">
                <button class="obsidian-btn">Drill Down to Sub-stack</button>
            </div>

            <div class="button-group">
                <button class="obsidian-btn danger">Undo Last Action</button>
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
        background: var(--background-primary);
        color: var(--text-normal);
        z-index: 2000;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .detailed-view-container {
        padding: 40px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .metadata {
        display: flex;
        gap: 12px;
        font-family: var(--font-monospace);
        font-size: 0.9rem;
    }

    .meta-item.time { color: var(--text-muted); }
    .meta-item.duration { color: var(--interactive-accent); font-weight: 600; }

    .title-input {
        width: 100%;
        background: transparent;
        border: none;
        color: var(--text-normal);
        font-family: var(--font-interface);
        font-size: 1.5rem;
        font-weight: 500;
        line-height: 1.4;
        resize: none;
        outline: none;
        padding: 0;
        flex-shrink: 0;
        min-height: 120px; /* Give it a bit more breathing room natively */
        transition: min-height 0.3s ease;
    }

    /* Simulate the viewport crunch elegantly */
    :global(.keyboard-active) .title-input {
        min-height: 180px; /* Expand to fill more of the available visual space but keep scroll safe */
    }

    /* Button Dump Styles */
    .button-dump {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 20px;
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 20px;
        padding-bottom: 40px; /* Safe padding for bottom of screen */
    }

    .button-group {
        display: flex;
        gap: 10px;
    }

    .obsidian-btn {
        flex: 1;
        background-color: var(--interactive-normal);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px; /* Obsidian native-ish */
        padding: 8px 16px;
        font-size: 14px;
        font-family: var(--font-interface);
        cursor: pointer;
        transition: background-color 0.15s ease;
    }

    .obsidian-btn:hover:not(:disabled) {
        background-color: var(--interactive-hover);
        border-color: var(--background-modifier-border-hover);
    }

    .obsidian-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .obsidian-btn.danger {
        color: var(--text-error, #f85149);
        border-color: rgba(248, 81, 73, 0.3);
    }

    .obsidian-btn.danger:hover {
        background-color: rgba(248, 81, 73, 0.1);
    }
</style>
