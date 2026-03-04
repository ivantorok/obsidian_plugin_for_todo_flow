<!--
    [INTERACTION CONTRACT]
    - Performance Protocol: No 'backdrop-filter: blur' or transparency. Use solid backgrounds (#1e1e1e, #282828).
    - Contextual Logic: Breadcrumbs must handle deep nesting via ellipsis ('... / Parent / Current').
    - Sovereign Zones:
        - Zone A (Header): Fixed. Handles orientation.
        - Zone B (List): Scrollable. Primary content.
        - Zone C (Footer): Fixed Pill. Floating command bridge.
-->

<script lang="ts">
    import HighDensityLeanCard from './HighDensityLeanCard.svelte';
    import moment from 'moment';

    let {
        path = "Projects > Internal > Todo Flow",
        taskCount = 4,
        currentIndex = 0
    } = $props();

    const mockTasks = [
        { title: 'Deep Work: Finalize Q4', startTime: moment().add(10, 'minutes'), duration: 90, status: 'todo' as const, isAnchored: true },
        { title: 'Email Triage', startTime: moment().add(100, 'minutes'), duration: 15, status: 'todo' as const, isAnchored: false },
        { title: 'Design Review', startTime: moment().add(115, 'minutes'), duration: 30, status: 'done' as const, isAnchored: false },
        { title: 'Team Sync', startTime: moment().add(145, 'minutes'), duration: 45, status: 'todo' as const, isAnchored: false }
    ];
</script>

<div class="stack-view-structure">
    <header class="stack-header">
        <div class="breadcrumb">
            <span class="path-segment root">...</span>
            <span class="separator">/</span>
            <span class="path-segment">Projects</span>
            <span class="separator">/</span>
            <span class="path-segment active">{path.split(' > ').pop()}</span>
        </div>
        <div class="status-indicators">
            <span class="index">{currentIndex + 1} / {taskCount}</span>
            <span class="time">{moment().format('HH:mm')}</span>
        </div>
    </header>

    <main class="task-list">
        {#each mockTasks as task, i}
            <HighDensityLeanCard {...task} focused={i === currentIndex} />
        {/each}
        <!-- Spacer for footer -->
        <div class="footer-spacer"></div>
    </main>

    <footer class="stack-footer">
        <div class="footer-glass">
            <button class="action-btn secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export</span>
            </button>
            <button class="action-btn primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Add Task</span>
            </button>
            <button class="action-btn secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v.5"/></svg>
                <span>Undo</span>
            </button>
        </div>
    </footer>
</div>

<style>
    .stack-view-structure {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
        color: #dcddde;
        position: relative;
    }

    .stack-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #1e1e1e; /* Solid background for performance */
        border-bottom: 1px solid rgba(255, 255, 255, 0.08); /* Slightly more prominent border for separation */
        z-index: 10;
    }

    .breadcrumb {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: #999;
    }

    .path-segment.active {
        color: #fff;
        font-weight: 600;
    }

    .separator {
        opacity: 0.3;
    }

    .status-indicators {
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
    }

    .index {
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 8px;
        border-radius: 4px;
        color: #75abd0;
    }

    .task-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .footer-spacer {
        height: 100px;
        flex-shrink: 0;
    }

    .stack-footer {
        position: absolute;
        bottom: 24px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        padding: 0 20px;
        z-index: 20;
        pointer-events: none;
    }

    .footer-glass {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        background: #282828; /* Solid background for performance */
        padding: 8px 16px;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }

    .action-btn {
        background: none;
        border: none;
        color: #ccc;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.85rem;
    }

    .action-btn span {
        display: none; /* Mobile first: just icons or small text */
    }

    .action-btn:active {
        transform: scale(0.95);
        background: rgba(255, 255, 255, 0.05);
    }

    .action-btn.primary {
        background: #75abd0;
        color: #fff;
        padding: 10px 16px;
    }

    .action-btn.primary span {
        display: inline;
        font-weight: 600;
    }

    .action-btn.secondary {
        background: rgba(255, 255, 255, 0.05);
    }

    /* Simulate desktop/wide mobile where we might show labels */
    @media (min-width: 300px) {
        .action-btn.secondary span {
            display: none; /* Keep it tight for now */
        }
    }
</style>
