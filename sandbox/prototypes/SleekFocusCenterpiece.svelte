<script lang="ts">
    import { moment } from 'obsidian';
    import { formatDuration, formatDateRelative } from "../../src/utils.ts";

    interface Props {
        title: string;
        startTime: any;
        duration: number;
        status: 'todo' | 'done';
        isAnchored: boolean;
        index: number;
        total: number;
    }

    let {
        title,
        startTime,
        duration,
        status,
        isAnchored,
        index,
        total
    } = $props<Props>();
    
    let now = moment();
</script>

<div class="todo-flow-timeline mode-focus todo-flow-stack-container" data-ui-ready="true">
    <div 
        class="todo-flow-task-card focus-card is-focused"
        class:anchored={isAnchored}
        class:is-done={status === "done"}
    >
        <div class="index-display">
            #{index + 1} of {total}
        </div>
        <div class="focus-card-inner">
            <div class="focus-time-badge">
                {formatDateRelative(startTime, now)}
            </div>

            <h1 class="focus-title">{title}</h1>

            <div class="focus-metadata">
                <span class="focus-duration-text">{formatDuration(duration)}</span>
                {#if isAnchored}
                    <span class="focus-anchor-status">⚓ Anchored</span>
                {/if}
            </div>

            <div class="focus-actions">
                <button class="focus-action-btn complete">
                    {status === "done" ? "Undo" : "Complete"}
                </button>
                <button class="focus-action-btn">
                    Archive
                </button>
                <button class="focus-action-btn" class:is-anchored={isAnchored}>
                    {isAnchored ? "Release" : "Anchor"}
                </button>
            </div>
            
            <div class="focus-secondary-actions">
                <button class="focus-nav-btn" disabled={index === 0}>
                    ← Previous
                </button>
                <button class="focus-action-btn ghost">
                    Adjust Time
                </button>
                <button class="focus-nav-btn" disabled={index >= total - 1}>
                    Next →
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    @import "../../src/styles/stack-shared.css";
    
    /* Scoped container override for isolated testing */
    .todo-flow-stack-container {
        padding: 0;
        background: transparent;
        overflow: visible;
        width: 100%;
        box-sizing: border-box;
    }
    .todo-flow-timeline.mode-focus {
        height: auto;
    }
</style>
