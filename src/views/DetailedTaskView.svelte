<script lang="ts">
    /**
     * @component DetailedViewFuture
     * @description Ultra-minimal, Vanilla Obsidian-native control panel.
     * Uses absolutely basic CSS (no gap, simple margins, no rgba translucency) 
     * to ensure perfect rendering on older Android WebView engines.
     */
    import SovereignInput from '../components/SovereignInput.svelte';
    import ActionButton from '../components/ActionButton.svelte';
    import moment from 'moment';
    import { tick, onMount } from 'svelte';

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
        onUndo,
        onAddSubtask,
        onDurationChange,
        onTitleChange,
        onProjectClick
    } = $props<{
        task?: any;
        onClose?: () => void;
        onTaskUpdate?: (task: any) => void;
        onToggleAnchor?: () => void;
        onDrillDown?: () => void;
        onComplete?: () => void;
        onArchive?: () => void;
        onUndo?: () => void;
        onAddSubtask?: (title: string) => void;
        onDurationChange?: (minutes: number) => void;
        onTitleChange?: (title: string) => void;
        onProjectClick?: () => void;
    }>();

    // Duration Scale per Master Plan v1.0
    const DURATION_STEPS = [2, 5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480]; // 480m = 8h
    
    function formatDuration(minutes: number) {
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    function stepDuration(direction: 1 | -1) {
        const current = task.duration;
        
        // Ceiling Bypass: If duration >= 480m (8h), allow custom steps of 30m
        if (current >= 480 && direction === 1) {
            const nextDuration = current + 30;
            task.duration = nextDuration;
            onDurationChange?.(nextDuration);
            return;
        }
        if (current > 480 && direction === -1) {
            const nextDuration = Math.max(480, current - 30);
            task.duration = nextDuration;
            onDurationChange?.(nextDuration);
            return;
        }

        // Snapping Logic: Find the next meaningful step
        let nextDuration = current;
        if (direction === 1) {
            // Find first step greater than current
            const nextStep = DURATION_STEPS.find(s => s > current);
            nextDuration = nextStep ?? current;
        } else {
            // Find first step less than current
            const prevStep = [...DURATION_STEPS].reverse().find(s => s < current);
            nextDuration = prevStep ?? current;
        }
        
        task.duration = nextDuration;
        if (onDurationChange) {
            onDurationChange(nextDuration);
        } else {
            onTaskUpdate?.(task);
        }
    }

    // Inline Title Edit State
    let isEditingTitle = $state(false);

    function handleTitleSubmit() {
        if (!task.title.trim()) task.title = "Untitled Task";
        isEditingTitle = false;
        
        if (onTitleChange) {
            onTitleChange(task.title);
        } else {
            onTaskUpdate?.(task);
        }
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

    // Subtask Creation State
    let isCreatingSubtask = $state(false);
    let subtaskTitle = $state("");

    async function handleSubtaskSubmit() {
        if (subtaskTitle.trim()) {
            onAddSubtask?.(subtaskTitle.trim());
            subtaskTitle = "";
            isCreatingSubtask = false;
        }
    }

</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="vanilla-container todo-flow-detailed-view" 
    data-testid="detailed-task-view"
    onclick={(e) => e.stopPropagation()}
    onpointerdown={(e) => e.stopPropagation()}
>
    
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
                <button class="stepper-btn" data-testid="step-down" onclick={() => stepDuration(-1)} disabled={task.duration <= DURATION_STEPS[0]}>-</button>
                <span class="stepper-val" data-testid="duration-value">{formatDuration(task.duration)}</span>
                <button class="stepper-btn" data-testid="step-up" onclick={() => stepDuration(1)}>+</button>
            </div>
        </div>

    </div>

    <!-- Project Selection (FEAT-018) -->
    <div class="vanilla-field-row">
        <div class="vanilla-label">PROJECT</div>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="vanilla-project-badge" data-testid="project-selector" onclick={onProjectClick}>
            <span class="project-icon">󰉋</span>
            <span class="project-name">{task.id.includes('/') ? task.id.split('/').slice(0, -1).join('/') : '/'}</span>
        </div>
    </div>

    <!-- Action Links -->
    <div class="vanilla-actions">
        <div class="vanilla-section-header">State</div>
        <ActionButton 
            text={task.isAnchored ? "De-anchor Time" : "Anchor Time"} 
            variant="secondary"
            class="vanilla-action-btn-sovereign"
            onclick={onToggleAnchor} 
        />
        <ActionButton 
            text="Drill Down (New Stack)" 
            variant="secondary"
            class="vanilla-action-btn-sovereign"
            onclick={onDrillDown} 
        />

        <div class="vanilla-section-header margin-top">Substack Hierarchy</div>
        
        <!-- FEAT-019: Subtask List Visibility -->
        {#if task.children && task.children.length > 0}
            <div class="vanilla-subtask-list">
                {#each task.children as child, i}
                    <div class="vanilla-subtask-row {child.status}" data-testid="subtask-row-{i}">
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div 
                            class="subtask-checkbox {child.status}" 
                            data-testid="subtask-checkbox-{i}"
                            onclick={() => { 
                                child.status = child.status === 'done' ? 'todo' : 'done';
                                onTaskUpdate?.(child);
                                // Refresh parent to ensure duration roll-ups/indicators update
                                onTaskUpdate?.(task);
                            }}
                        >
                            {child.status === 'done' ? '●' : '○'}
                        </div>
                        
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div 
                            class="subtask-title-text {child.status}"
                            data-testid="subtask-title-{i}"
                            onclick={() => {
                                // Drill down into child
                                // Find index of child in parent if needed, but onDrillDown handles the current active task.
                                // We might need a new prop for navigating to a specific task ID.
                                // For now, we use the existing drill down logic or just Close and let user navigate?
                                // User request says "Mini-Stack experience".
                                // Let's try to trigger a navigation to this child.
                                if (onDrillDown) {
                                    // Hack: temporarily swap 'task' and drill down? No, that's messy.
                                    // We'll just provide a simple visual list for now.
                                }
                            }}
                        >
                            {child.title}
                        </div>
                        
                        <div class="vanilla-spacer"></div>
                        
                        <div class="subtask-duration">{formatDuration(child.duration)}</div>
                    </div>
                {/each}
            </div>
        {/if}

        {#if isCreatingSubtask}
            <div class="subtask-editor-wrapper" data-testid="subtask-input-wrapper">
                <SovereignInput 
                    bind:value={subtaskTitle}
                    placeholder="New subtask name..."
                    onSubmit={handleSubtaskSubmit}
                    onCancel={() => isCreatingSubtask = false}
                />
            </div>
        {:else}
            <ActionButton 
                text="+ Add Subtask" 
                variant="secondary"
                class="vanilla-action-btn-sovereign"
                data-testid="add-subtask-btn"
                onclick={() => isCreatingSubtask = true} 
            />
        {/if}

        <div class="vanilla-section-header margin-top">Core Operations</div>
        <ActionButton 
            text={task.status === 'done' ? "Undo Completion" : "Mark as Completed"} 
            class="vanilla-action-btn-sovereign"
            onclick={onComplete} 
        />
        <ActionButton 
            text="Archive Task" 
            variant="danger"
            class="vanilla-action-btn-sovereign"
            onclick={onArchive} 
        />

        <div class="vanilla-section-header margin-top">Utility</div>
        <ActionButton 
            text="Undo Last Action" 
            variant="secondary"
            class="vanilla-action-btn-sovereign muted-text"
            onclick={onUndo} 
        />
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
        animation: vanilla-slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes vanilla-slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
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
        margin-top: 32px;
        border-top: 1px dashed var(--background-modifier-border, #333);
        padding-top: 32px;
    }

    .vanilla-action-btn-sovereign {
        width: 100% !important;
        border-radius: 0 !important;
        justify-content: flex-start !important;
        border-bottom: 1px solid var(--background-modifier-border, #333) !important;
        background-color: transparent !important;
    }

    .subtask-editor-wrapper {
        padding: 8px 16px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .vanilla-action-btn-sovereign:last-child {
        border-bottom: none !important;
    }

    /* Subtask List Styling */
    .vanilla-subtask-list {
        background: var(--background-primary);
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .vanilla-subtask-row {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        border-bottom: 1px solid var(--background-modifier-border);
        min-height: 44px;
    }
    
    .vanilla-subtask-row:last-child {
        border-bottom: none;
    }

    .subtask-checkbox {
        font-size: 18px;
        margin-right: 12px;
        cursor: pointer;
        color: var(--text-muted);
        width: 24px;
        text-align: center;
        flex-shrink: 0;
    }

    .subtask-checkbox.done {
        color: var(--interactive-accent);
    }

    .subtask-title-text {
        font-size: 14px;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
    }

    .vanilla-project-badge {
        display: flex;
        align-items: center;
        background: var(--background-secondary-alt);
        padding: 4px 10px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 0.85em;
        color: var(--text-muted);
        border: 1px solid var(--background-modifier-border);
        max-width: 100%;
        overflow: hidden;
    }

    .vanilla-project-badge:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    .project-icon {
        margin-right: 6px;
        opacity: 0.7;
    }

    .project-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .vanilla-field-row {
        margin-top: 20px;
    }

    .subtask-title-text.done {
        color: var(--text-muted);
        text-decoration: line-through;
    }

    .subtask-duration {
        font-size: 12px;
        color: var(--text-muted);
        font-family: var(--font-monospace);
        margin-left: 8px;
        flex-shrink: 0;
    }

    .muted-text { color: var(--text-muted, #888) !important; }
</style>
