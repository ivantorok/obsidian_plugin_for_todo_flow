<script lang="ts">
    /**
     * @component HighDensityLeanCard (Prototype Reference)
     * 
     * ARCHITECTURE NOTE (The Prototype Bridge):
     * This component was extracted from the `sandbox/lean-card-isolated.html` prototype.
     * It is the designated UI for the Stack View's "Architect" list layout, aiming to
     * provide a high-density, mono-row visual. 
     * 
     * IMPLEMENTATION REQUIREMENT:
     * When wiring this into `ArchitectStackTemplate`, ensure you preserve the 
     * strict `flex-direction: row` layout. The precise monospace widths and 
     * ellipses handling on the title are critical for this "Sovereign UX" design.
     */
    import { moment } from 'obsidian';

    interface Props {
        title: string;
        startTime: any;
        duration: number;
        status: 'todo' | 'done';
        isAnchored: boolean;
        focused?: boolean;
    }

    let {
        title,
        startTime,
        duration,
        status,
        isAnchored,
        focused = false
    } = $props<Props>();

    const formatTime = (time: any) => time ? time.format('HH:mm') : '--:--';
    const formatDuration = (d: number) => {
        const h = Math.floor(d / 60);
        const m = d % 60;
        return h > 0 ? `${h}h${m}m` : `${m}m`;
    };
</script>

<div 
    class="todo-flow-task-card" 
    class:is-focused={focused} 
    class:anchored={isAnchored} 
    class:is-done={status === 'done'}
    data-status={status}
>
    <button class="time-col">
        {formatTime(startTime)}
    </button>
    <button class="duration-text clickable">
        {formatDuration(duration)}
    </button>
    <div class="title-row">
        <button class="title">
            {title}
        </button>
    </div>
</div>

<style>
    /* High-Density Lean Card (Sleek Mono-Row) Prototype Styles */
    .todo-flow-task-card {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        padding: 0 16px;
        height: 56px; /* High-density but still touch-friendly */
        white-space: nowrap;
        overflow: hidden;
        margin-bottom: 8px; /* spacing between cards */
        
        /* Base surface styles assuming a dark theme container */
        background: rgba(255, 255, 255, 0.03); 
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    }

    .time-col {
        flex: 0 0 auto;
        font-family: var(--font-monospace, 'JetBrains Mono', monospace);
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--text-muted, #888);
        padding: 0;
        background: transparent;
        border: none;
        cursor: pointer;
    }

    .duration-text {
        flex: 0 0 auto;
        font-family: var(--font-monospace, 'JetBrains Mono', monospace);
        color: var(--text-muted, #888);
        background: rgba(255, 255, 255, 0.08); /* subtle pill */
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85em;
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        margin: 0;
    }

    .title-row {
        flex: 1 1 auto;
        width: auto;
        overflow: hidden;
        display: flex;
        align-items: center;
        margin: 0;
    }

    .title {
        width: 100%;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        background: none;
        border: none;
        color: var(--text-normal, #ddd);
        font-size: 1rem;
        font-weight: 500;
        padding: 0;
        cursor: pointer;
        margin: 0;
    }

    /* States */
    .todo-flow-task-card.is-done .title,
    .todo-flow-task-card.is-done .time-col,
    .todo-flow-task-card.is-done .duration-text {
        opacity: 0.5;
    }
    
    .todo-flow-task-card.is-done .title {
        text-decoration: line-through;
    }

    .todo-flow-task-card.is-focused {
        background: rgba(117, 171, 208, 0.15);
        border: 1px solid var(--interactive-accent, #75abd0);
    }
    
    .todo-flow-task-card.anchored {
        border-left: 3px solid var(--interactive-accent, #75abd0);
        background: rgba(255, 255, 255, 0.05);
    }
</style>
