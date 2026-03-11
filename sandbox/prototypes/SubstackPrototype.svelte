<script lang="ts">
    import { moment } from 'obsidian';
    import { formatDuration, formatDateRelative } from "../../src/utils.ts";

    interface TaskNode {
        id: string;
        title: string;
        duration: number;
        status: 'todo' | 'done';
        isAnchored: boolean;
        startTime: any;
        children: TaskNode[];
    }

    // Mock Data
    const rootTasks: TaskNode[] = [
        { id: '1', title: 'Plan Session v45', duration: 15, status: 'todo', isAnchored: true, startTime: moment().set({hour: 9, minute: 0}), children: [] },
        { 
            id: '2', 
            title: 'Substack Prototype Implementation', 
            duration: 0, // Will be rolled up
            status: 'todo', 
            isAnchored: false, 
            startTime: moment().set({hour: 9, minute: 15}), 
            children: [
                { id: '2-1', title: 'Scaffold Svelte Component', duration: 10, status: 'todo', isAnchored: false, startTime: moment().set({hour: 9, minute: 15}), children: [] },
                { id: '2-2', title: 'Implement Drill-down Logic', duration: 20, status: 'todo', isAnchored: false, startTime: moment().set({hour: 9, minute: 25}), children: [] },
                { 
                    id: '2-3', 
                    title: 'Recursive Rollup Test', 
                    duration: 0, 
                    status: 'todo', 
                    isAnchored: false, 
                    startTime: moment().set({hour: 9, minute: 45}), 
                    children: [
                        { id: '2-3-1', title: 'Deep Child 1', duration: 5, status: 'todo', isAnchored: false, startTime: moment().set({hour: 9, minute: 45}), children: [] },
                        { id: '2-3-2', title: 'Deep Child 2', duration: 5, status: 'todo', isAnchored: false, startTime: moment().set({hour: 9, minute: 50}), children: [] }
                    ]
                }
            ] 
        },
        { id: '3', title: 'Review Backlog', duration: 30, status: 'todo', isAnchored: false, startTime: moment().set({hour: 10, minute: 15}), children: [] }
    ];

    let history: { tasks: TaskNode[], parentTitle: string | null }[] = $state([]);
    let currentTasks = $state(rootTasks);
    let parentTitle = $state(null);

    function getRollupDuration(task: TaskNode): number {
        if (task.children.length === 0) return task.duration;
        return task.children.reduce((acc, child) => acc + getRollupDuration(child), 0);
    }

    function drillDown(task: TaskNode) {
        if (task.children.length === 0) return;
        history.push({ tasks: currentTasks, parentTitle });
        currentTasks = task.children;
        parentTitle = task.title;
    }

    function goBack() {
        if (history.length === 0) return;
        const prev = history.pop();
        currentTasks = prev.tasks;
        parentTitle = prev.parentTitle;
    }

    let now = moment();
</script>

<div class="substack-prototype-container">
    <div class="prototype-header">
        {#if parentTitle}
            <button class="back-btn" onclick={goBack}>← Back</button>
            <h2 class="parent-breadcrumb">{parentTitle}</h2>
        {:else}
            <h2 class="parent-breadcrumb">Daily Stack (Root)</h2>
        {/if}
    </div>

    <div class="todo-flow-timeline mode-architect">
        {#each currentTasks as task}
            <div class="todo-flow-task-card" class:anchored={task.isAnchored}>
                <div class="time-col">
                    {formatDateRelative(task.startTime, now)}
                </div>
                
                <div class="duration-text">
                    {formatDuration(getRollupDuration(task))}
                </div>

                <div class="title-row">
                    <span class="title">{task.title}</span>
                    {#if task.children.length > 0}
                        <button class="substack-indicator" onclick={() => drillDown(task)}>
                            <span class="count">{task.children.length}</span>
                            <span class="chevron">›</span>
                        </button>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    @import "../../src/styles/stack-shared.css";

    .substack-prototype-container {
        padding: 2rem;
        background: var(--background-primary);
        color: var(--text-normal);
        max-width: 600px;
        margin: 0 auto;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .prototype-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 1rem;
    }

    .back-btn {
        background: transparent;
        border: 1px solid var(--interactive-accent);
        color: var(--interactive-accent);
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .back-btn:hover {
        background: rgba(117, 171, 208, 0.1);
    }

    .parent-breadcrumb {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--text-muted);
    }

    .title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex: 1;
        min-width: 0;
    }

    .substack-indicator {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .substack-indicator:hover {
        border-color: var(--interactive-accent);
        background: rgba(117, 171, 208, 0.1);
    }

    .substack-indicator .count {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-muted);
    }

    .substack-indicator .chevron {
        font-size: 1.2rem;
        color: var(--interactive-accent);
        line-height: 1;
    }
</style>
