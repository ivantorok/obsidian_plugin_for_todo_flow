<script lang="ts">
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
    @import "../../src/styles/stack-shared.css";
    @import "../../src/styles/architect-stack.css";
    
    /* Make the isolated display take up full width for testing */
    .todo-flow-task-card {
        margin: 0;
        width: 100%;
        box-sizing: border-box;
    }
</style>
