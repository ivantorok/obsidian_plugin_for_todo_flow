<script lang="ts">
    import { formatDateRelative } from "../../utils.ts";
    import moment from "moment";
    import { type TaskNode } from "../../scheduler.js";

    let {
        task,
        now = moment()
    }: {
        task: TaskNode;
        now: moment.Moment;
    } = $props();
</script>

<div 
    class="lean-task-card touch-sovereign" 
    class:is-done={task.status === "done"}
    class:is-anchored={task.isAnchored}
>
    <div class="status-dot status-{task.status}"></div>
    <div class="task-title truncate">{task.title}</div>
    <div class="task-time">{formatDateRelative(task.startTime, now)}</div>
</div>

<style>
    @import "../../styles/lean-card.css";
</style>
