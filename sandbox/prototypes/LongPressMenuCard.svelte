<script lang="ts">
    import { moment } from 'obsidian';

    interface Props {
        title: string;
        startTime: any;
        duration: number;
        status: 'todo' | 'done';
        isAnchored: boolean;
        focused?: boolean;
        showMenu?: boolean;
    }

    let {
        title,
        startTime,
        duration,
        status,
        isAnchored,
        focused = false,
        showMenu = false
    } = $props<Props>();

    const formatTime = (time: any) => time ? time.format('HH:mm') : '--:--';
    const formatDuration = (d: number) => {
        const h = Math.floor(d / 60);
        const m = d % 60;
        return h > 0 ? `${h}h${m}m` : `${m}m`;
    };
</script>

<div class="task-container" class:menu-open={showMenu}>
    {#if showMenu}
    <div class="long-press-menu">
        <button class="menu-item-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <span>Open Details</span>
        </button>
        <button class="menu-item-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            <span>Reorder Mode</span>
        </button>
        <button class="menu-item-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path></svg>
            <span>{isAnchored ? 'Unanchor' : 'Anchor Time'}</span>
        </button>
        <div class="menu-item-row">
            <span class="row-label">Duration</span>
            <div class="row-actions">
                <button class="icon-btn" aria-label="Decrease Duration">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button class="icon-btn" aria-label="Increase Duration">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>
    </div>
    {/if}

    <div 
        class="todo-flow-task-card" 
        class:is-focused={focused} 
        class:anchored={isAnchored} 
        class:is-done={status === 'done'}
        class:blurred={showMenu && !focused}
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
</div>

<style>
    @import "../../src/styles/stack-shared.css";
    @import "../../src/styles/architect-stack.css";
    
    .task-container {
        position: relative;
        width: 100%;
        display: block;
    }

    /* Make the isolated display take up full width for testing */
    .todo-flow-task-card {
        margin: 0;
        width: 100%;
        box-sizing: border-box;
        transition: filter 0.2s ease, transform 0.2s ease;
    }

    .task-container.menu-open {
        z-index: 100;
    }

    .todo-flow-task-card.blurred {
        /* Optional: filter: blur(2px) opacity(0.5); */ /* we rely on overlay now */
    }

    .menu-open .todo-flow-task-card {
        transform: scale(0.98);
        box-shadow: 0 0 0 2px var(--interactive-accent);
        border-radius: 6px;
    }

    /* Long Press Menu Styles (Obsidian-Native Feel) */
    .long-press-menu {
        position: absolute;
        bottom: 100%; /* Position above the card */
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 8px; /* Space between menu and card */
        width: 240px;
        background-color: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        padding: 4px;
        z-index: 101;
        animation: menuPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        transform-origin: bottom center;
    }

    /* Small triangle pointing down to the card */
    .long-press-menu::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: var(--background-primary) transparent transparent transparent;
    }

    /* Fallback border for the triangle if needed */
    .long-press-menu::before {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -7px;
        border-width: 7px;
        border-style: solid;
        border-color: var(--background-modifier-border) transparent transparent transparent;
        z-index: -1;
    }

    @keyframes menuPop {
        0% { opacity: 0; transform: translateX(-50%) scale(0.95) translateY(10px); }
        100% { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
    }

    .menu-item-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        background: transparent;
        border: none;
        color: var(--text-normal);
        text-align: left;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.1s ease;
    }

    .menu-item-btn:hover, .menu-item-btn:active {
        background-color: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    .menu-item-btn svg {
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .menu-item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-top: 1px solid var(--background-modifier-border);
        margin-top: 4px;
        padding-top: 8px;
    }

    .row-label {
        font-size: 13px;
        color: var(--text-muted);
    }

    .row-actions {
        display: flex;
        gap: 6px;
    }

    .icon-btn {
        background-color: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .icon-btn:hover, .icon-btn:active {
        background-color: var(--interactive-accent);
        color: var(--text-on-accent, white);
        border-color: var(--interactive-accent);
    }
</style>
