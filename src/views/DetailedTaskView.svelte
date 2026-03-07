<script lang="ts">
    /**
     * @component DetailedViewFuture
     * @description Ultra-minimal, Vanilla Obsidian-native control panel.
     * Uses absolutely basic CSS (no gap, simple margins, no rgba translucency) 
     * to ensure perfect rendering on older Android WebView engines.
     */
    import SovereignInput from '../components/SovereignInput.svelte';
    import moment from 'moment';
    import { tick } from 'svelte';

    let {
        task = $bindable({ 
            id: 'demo-task', 
            title: 'Prototype: Build Control Panel',
            duration: 45,
            startTime: moment().add(30, 'minutes'),
            isAnchored: false,
            status: 'todo'
        }),
        onClose,
        onTaskUpdate,
        onToggleAnchor,
        onDrillDown,
        onComplete,
        onArchive,
        onUndo
    } = $props<{
        task?: any;
        onClose?: () => void;
        onTaskUpdate?: (task: any) => void;
        onToggleAnchor?: () => void;
        onDrillDown?: () => void;
        onComplete?: () => void;
        onArchive?: () => void;
        onUndo?: () => void;
    }>();

    // Duration Scale
    const DURATION_STEPS = [2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480];
    
    function formatDuration(minutes: number) {
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    function stepDuration(direction: 1 | -1) {
        let currentIndex = DURATION_STEPS.indexOf(task.duration);
        if (currentIndex === -1) {
            currentIndex = 0;
            for (let i = 0; i < DURATION_STEPS.length; i++) {
                if (DURATION_STEPS[i] >= task.duration) {
                    currentIndex = i;
                    break;
                }
            }
        }
        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < DURATION_STEPS.length) {
            task.duration = DURATION_STEPS[nextIndex];
            onTaskUpdate?.(task);
        }
    }

    // Inline Title Edit State
    let isEditingTitle = $state(false);

    function handleTitleSubmit() {
        if (!task.title.trim()) task.title = "Untitled Task";
        isEditingTitle = false;
        onTaskUpdate?.(task);
    }

    function handleTitleClick() {
        isEditingTitle = true;
    }

    // Time Editing
    function updateStartTime(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.value) {
            const [hours, minutes] = input.value.split(':');
            task.startTime = moment(task.startTime).hours(parseInt(hours)).minutes(parseInt(minutes));
            onTaskUpdate?.(task);
        }
    }

    let displayTime = $derived(task.startTime.format("HH:mm"));
    let inputTimeValue = $derived(task.startTime.format("HH:mm"));
</script>

<div class="vanilla-container">
    
    <!-- Header -->
    <div class="vanilla-header">
        <button class="vanilla-back-btn" onclick={onClose}>← Back</button>
        <span class="vanilla-header-title">Task Controls</span>
        <span class="vanilla-spacer"></span>
    </div>

    <!-- Properties -->
    <div class="vanilla-properties">
        
        <!-- Start Time -->
        <div class="vanilla-row">
            <span class="vanilla-label">Start Time</span>
            {#if task.isAnchored}
                <div class="time-editor-wrapper">
                    <input type="time" class="native-time-input hidden-input" value={inputTimeValue} onchange={updateStartTime} />
                    <span class="vanilla-value editable">{displayTime}</span>
                </div>
            {:else}
                <span class="vanilla-value unanchored">{displayTime}</span>
            {/if}
        </div>

        <!-- Title -->
        <div class="vanilla-row title-row">
            <span class="vanilla-label">Title</span>
            <div class="vanilla-title-wrapper">
                {#if isEditingTitle}
                    <div class="editor-wrapper">
                        <SovereignInput 
                            bind:value={task.title}
                            placeholder="Task name"
                            onSubmit={handleTitleSubmit}
                            onCancel={() => isEditingTitle = false}
                        />
                    </div>
                {:else}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="vanilla-task-title editable" onclick={handleTitleClick}>
                        {task.title}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Duration Stepper -->
        <div class="vanilla-row">
            <span class="vanilla-label">Duration</span>
            <div class="vanilla-stepper">
                <button class="stepper-btn" onclick={() => stepDuration(-1)} disabled={task.duration <= DURATION_STEPS[0]}>[ - ]</button>
                <span class="stepper-val">{formatDuration(task.duration)}</span>
                <button class="stepper-btn" onclick={() => stepDuration(1)} disabled={task.duration >= DURATION_STEPS[DURATION_STEPS.length - 1]}>[ + ]</button>
            </div>
        </div>

    </div>

    <!-- Action Links -->
    <div class="vanilla-actions">
        <div class="vanilla-section-header">State</div>
        <button class="vanilla-action-btn" onclick={onToggleAnchor}>
            {task.isAnchored ? "De-anchor Time" : "Anchor Time"}
        </button>
        <button class="vanilla-action-btn" onclick={onDrillDown}>Drill Down (New Stack)</button>

        <div class="vanilla-section-header margin-top">Core Operations</div>
        <button class="vanilla-action-btn primary-text" onclick={onComplete}>
            {task.status === 'done' ? "Undo Completion" : "Mark as Completed"}
        </button>
        <button class="vanilla-action-btn danger-text" onclick={onArchive}>Archive Task</button>

        <div class="vanilla-section-header margin-top">Utility</div>
        <button class="vanilla-action-btn muted-text" onclick={onUndo}>Undo Last Action</button>
    </div>

</div>

<style>
    /* 
     * Vanilla Obsidian Mobile CSS
     * Explicitly avoids: `gap`, complex `rgba()` composites, deeply nested flexboxes, 
     * heavy box-shadows, and tricky pseudo-element math.
     * Sticks strictly to block, inline-block, simple floats or basic un-gapped flex. 
     */

    .vanilla-container {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 2000;
        width: 100vw;
        height: 100vh;
        background: var(--background-primary, #1e1e1e);
        color: var(--text-normal, #dcddde);
        font-family: var(--font-interface, sans-serif);
        overflow-y: auto;
        padding-top: var(--safe-area-inset-top, 0px);
        box-sizing: border-box;
    }

    /* Standard Header */
    .vanilla-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid var(--background-modifier-border, #333);
        background: var(--background-secondary, #111);
    }

    .vanilla-back-btn {
        background: transparent;
        border: none;
        color: var(--text-muted, #888);
        font-size: 14px;
        padding: 8px 0;
        cursor: pointer;
        width: 60px;
        text-align: left;
    }

    .vanilla-header-title {
        font-size: 12px;
        font-weight: bold;
        color: var(--text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .vanilla-spacer {
        width: 60px;
    }

    /* Key-Value Properties Layout */
    .vanilla-properties {
        padding: 16px;
        background: var(--background-primary, #1e1e1e);
        border-bottom: 1px solid var(--background-modifier-border, #333);
    }

    .vanilla-row {
        margin-bottom: 20px;
        display: block; /* Avoid flex complexity */
    }
    
    .vanilla-row:last-child {
        margin-bottom: 0;
    }

    .title-row {
        margin-bottom: 24px;
    }

    .vanilla-label {
        display: block;
        color: var(--interactive-accent, #75abd0);
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
    }

    .vanilla-value {
        font-family: var(--font-monospace, monospace);
        color: var(--text-normal, #ddd);
        font-size: 15px;
        font-weight: bold;
    }

    .vanilla-value.unanchored {
        color: var(--text-muted, #888);
        font-weight: normal;
    }

    .vanilla-value.editable {
        border-bottom: 1px dashed var(--text-muted, #888);
    }

    /* Time Edit Overlay (Native wrapper) */
    .time-editor-wrapper {
        position: relative;
        display: inline-block;
    }

    .native-time-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 10;
        margin: 0;
        padding: 0;
        border: none;
    }

    /* Title Edit Wrapper */
    .vanilla-title-wrapper {
        min-height: 24px;
    }

    .vanilla-task-title {
        font-size: 16px;
        font-weight: 500;
        line-height: 1.4;
        color: var(--text-normal, #ddd);
        word-wrap: break-word;
    }

    .vanilla-task-title.editable {
        cursor: text;
        border-bottom: 1px dashed var(--background-modifier-border, #333);
        display: inline-block;
    }

    .editor-wrapper {
        margin-top: -6px; /* align SovereignInput with text baseline visually */
        margin-left: -8px;
        width: calc(100% + 16px);
    }

    /* Stepper Styling (Basic Inline Blocks) */
    .vanilla-stepper {
        display: inline-block;
    }

    .stepper-btn {
        background: transparent;
        border: none;
        color: var(--text-muted, #888);
        font-family: var(--font-monospace, monospace);
        font-size: 16px;
        font-weight: bold;
        padding: 4px 8px;
        margin: 0;
        cursor: pointer;
        outline: none;
        -webkit-tap-highlight-color: transparent;
    }

    .stepper-btn:hover:not(:disabled) {
        color: var(--interactive-accent, #75abd0);
    }

    .stepper-btn:active:not(:disabled) {
        color: var(--text-normal, #fff);
    }

    .stepper-btn:disabled {
        opacity: 0.3;
        cursor: default;
    }

    .stepper-val {
        display: inline-block;
        min-width: 60px;
        text-align: center;
        font-family: var(--font-monospace, monospace);
        color: var(--interactive-accent, #75abd0);
        font-weight: bold;
        font-size: 16px;
        margin: 0 4px;
    }

    /* Native-Style Action Menu */
    .vanilla-actions {
        background: var(--background-primary, #1e1e1e);
    }

    .vanilla-section-header {
        padding: 24px 16px 8px;
        font-size: 11px;
        font-weight: bold;
        color: var(--text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 1px;
        background: var(--background-secondary, #111);
        border-bottom: 1px solid var(--background-modifier-border, #333);
        border-top: 1px solid var(--background-modifier-border, #333);
    }

    .vanilla-section-header.margin-top {
        margin-top: 24px;
        border-top: 1px dashed var(--background-modifier-border, #333);
    }

    .vanilla-action-btn {
        display: block;
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--background-modifier-border, #333);
        padding: 16px;
        font-size: 15px;
        color: var(--text-normal, #ddd);
        cursor: pointer;
        outline: none;
        -webkit-tap-highlight-color: rgba(255,255,255,0.05); /* very basic highlight */
    }

    .vanilla-action-btn:last-child {
        border-bottom: none;
    }

    .vanilla-action-btn.primary-text { color: var(--interactive-accent, #75abd0); }
    .vanilla-action-btn.danger-text { color: #e87b7b; }
    .vanilla-action-btn.muted-text { color: var(--text-muted, #888); }
</style>
