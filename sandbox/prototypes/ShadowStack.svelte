<script lang="ts">
    import moment from "moment";

    let {
        path = "Projects > Internal > Todo Flow",
        tasks = [
            { id: '1', title: 'Deep Work: Finalize Q4', duration: 90, startTime: moment().add(10, 'minutes'), status: 'todo', isAnchored: true },
            { id: '2', title: 'Email Triage', duration: 15, startTime: moment().add(100, 'minutes'), status: 'todo', isAnchored: false },
            { id: '3', title: 'Design Review', duration: 30, startTime: moment().add(115, 'minutes'), status: 'done', isAnchored: false },
            { id: '4', title: 'Team Sync', duration: 45, startTime: moment().add(145, 'minutes'), status: 'todo', isAnchored: false }
        ]
    } = $props();

    let focusedIndex = $state(0);
</script>

<div class="todo-flow-stack-container is-mobile" tabindex="0">
    <div class="todo-flow-timeline">
        {#each tasks as task, i (task.id)}
            <div
                class="todo-flow-task-card is-mobile"
                class:is-focused={focusedIndex === i}
                class:anchored={task.isAnchored}
                class:is-done={task.status === "done"}
                onclick={() => focusedIndex = i}
            >
                <div class="drag-handle">⠿</div>
                <div class="time-col">
                    <span class="mobile-only-time">{task.startTime.format("HH:mm")}</span>
                </div>
                <div class="content-col">
                    <div class="title-row">
                        <div class="title">{task.title}</div>
                        <div class="mobile-index-display">{i + 1} / {tasks.length}</div>
                    </div>
                    <div class="metadata">
                        <div class="duration">
                            <span class="mobile-duration">{task.duration}m</span>
                        </div>
                        <div class="anchor-col">
                            <button class="toggle-anchor-btn mobile-anchor-btn" class:is-active={task.isAnchored}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <!-- Shadow Footer -->
    <div class="todo-flow-stack-footer">
        <div class="footer-actions">
            <button class="action-btn secondary"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/></svg></button>
            <button class="action-btn primary"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
            <button class="action-btn secondary"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg></button>
        </div>
    </div>
</div>

<style>
    /* COPIED FROM architect-stack.css and shared styles */
    .todo-flow-stack-container {
        padding: 1rem 0.5rem;
        background: var(--background-primary);
        height: 100%;
        overflow-y: auto;
        position: relative;
    }

    .todo-flow-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 650px;
        margin: 0 auto;
        padding-bottom: 100px;
    }

    .todo-flow-task-card {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 0.85rem 1rem;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .todo-flow-task-card.is-focused {
        border-color: var(--interactive-accent);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .drag-handle {
        color: var(--text-muted);
        cursor: grab;
        padding-top: 2px;
    }

    .time-col {
        min-width: 50px;
    }

    .mobile-only-time {
        font-weight: 800;
        color: var(--interactive-accent);
        font-size: 0.9rem;
    }

    .content-col {
        flex: 1;
    }

    .title-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }

    .title {
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--text-normal);
        line-height: 1.3;
    }

    .mobile-index-display {
        font-size: 0.65rem;
        color: var(--text-muted);
        font-weight: 700;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }

    .metadata {
        margin-top: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .mobile-duration {
        background: rgba(var(--interactive-accent-rgb), 0.08);
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.85rem;
        color: var(--interactive-accent);
        font-weight: 700;
        border: 1px solid rgba(var(--interactive-accent-rgb), 0.2);
    }

    .mobile-anchor-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--background-secondary-alt);
        color: var(--text-muted);
        border: 1px solid var(--tf-glass-border);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .mobile-anchor-btn.is-active {
        background: var(--interactive-accent);
        color: white;
        border: none;
    }

    /* Shadow Footer Styles */
    .todo-flow-stack-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1.5rem;
        background: linear-gradient(transparent, var(--background-primary) 60%);
        display: flex;
        justify-content: center;
    }

    .footer-actions {
        display: flex;
        gap: 1.5rem;
        align-items: center;
    }

    .action-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .action-btn.primary {
        background: var(--interactive-accent);
        color: white;
        width: 54px;
        height: 54px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .action-btn.secondary {
        background: var(--background-secondary-alt);
        color: var(--text-muted);
        border: 1px solid var(--background-modifier-border);
    }
</style>
