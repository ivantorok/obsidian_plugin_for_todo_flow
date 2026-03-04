<script lang="ts">
    /**
     * @component TaskContextMenu
     * 
     * ARCHITECTURE NOTE (The Prototype Bridge):
     * This component was extracted from the `sandbox/long-press.html` prototype. It is the designated
     * UI for the Stack View's "Long Press" interaction, solving the conflict between drag-and-drop
     * and scrolling on mobile devices (by locking into Reorder Mode).
     * 
     * KNOWN TECHNICAL DEBT (Z-Index / Stacking Context):
     * This menu uses `position: absolute` and relies on `overflow` visibility. If placed inside a 
     * stacked list where parent cards have `overflow: hidden` or lower `z-index` contexts, the menu
     * will render *behind* subsequent items or be clipped. 
     * 
     * IMPLEMENTATION REQUIREMENT:
     * When wiring this into `ArchitectStackTemplate`, ensure the active `todo-flow-task-card` is 
     * elevated into a new stacking context (e.g., `z-index: 100`) to prevent clipping.
     * 
     * UX NOTE (Duration):
     * The `onScaleDuration` emission should be wired into the `LOGARITHMIC_DURATION_SEQUENCE` 
     * defined in the Concept Atlas.
     */
    import { onMount } from 'svelte';

    interface Props {
        isAnchored: boolean;
        targetElement: HTMLElement | null; // The task card Element to anchor to
        onOpenDetails: () => void;
        onToggleReorder: () => void;
        onToggleAnchor: () => void;
        onScaleDuration: (direction: 'up' | 'down') => void;
        onClose: () => void;
    }

    let {
        isAnchored,
        targetElement,
        onOpenDetails,
        onToggleReorder,
        onToggleAnchor,
        onScaleDuration,
        onClose
    } = $props<Props>();

    let menuElement: HTMLElement | null = $state(null);
    let positionClass = $state('position-top');

    onMount(() => {
        // Smart positioning logoc
        if (!targetElement) return;

        // Give Svelte a tick to render the menu so we can measure it
        setTimeout(() => {
            if (!menuElement || !targetElement) return;
            const menuRect = menuElement.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            const container = targetElement.closest('.todo-flow-stack-container') || document.body;
            const containerRect = container.getBoundingClientRect();

            // Check if there is enough space ABOVE the target element within the container
            // We want the bottom of the menu to sit just above the target (plus margin).
            const spaceAbove = targetRect.top - containerRect.top;
            const requiredSpace = menuRect.height + 12; // 12px for arrow/margin

            if (spaceAbove < requiredSpace) {
                positionClass = 'position-bottom';
            } else {
                positionClass = 'position-top';
            }
        }, 0);
    });

    function handleAction(actionFn: () => void, shouldClose = true) {
        actionFn();
        if (shouldClose) {
            onClose();
        }
    }
</script>

<div class="task-context-menu-wrapper" bind:this={menuElement} class:position-bottom={positionClass === 'position-bottom'} class:position-top={positionClass === 'position-top'}>
    <div class="long-press-menu">
        <button class="menu-item-btn" onclick={() => handleAction(onOpenDetails)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <span>Open Details</span>
        </button>
        <button class="menu-item-btn" onclick={() => handleAction(onToggleReorder)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            <span>Reorder Mode</span>
        </button>
        <button class="menu-item-btn" onclick={() => handleAction(onToggleAnchor)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path></svg>
            <span>{isAnchored ? 'Unanchor' : 'Anchor Time'}</span>
        </button>
        <div class="menu-item-row">
            <span class="row-label">Duration</span>
            <div class="row-actions">
                <button class="icon-btn" aria-label="Decrease Duration" onclick={() => handleAction(() => onScaleDuration('down'), false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button class="icon-btn" aria-label="Increase Duration" onclick={() => handleAction(() => onScaleDuration('up'), false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .task-context-menu-wrapper {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        /* Default to above */
        bottom: 100%;
        margin-bottom: 8px;
    }

    .task-context-menu-wrapper.position-top {
        bottom: 100%;
        top: auto;
        margin-bottom: 8px;
        margin-top: 0;
    }

    .task-context-menu-wrapper.position-bottom {
        top: 100%;
        bottom: auto;
        margin-top: 8px;
        margin-bottom: 0;
    }

    /* Long Press Menu Styles (Obsidian-Native Feel) */
    .long-press-menu {
        width: 240px;
        background-color: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        padding: 4px;
        animation: menuPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        transform-origin: bottom center;
        position: relative;
    }

    .position-bottom .long-press-menu {
        transform-origin: top center;
    }

    /* Arrow pointing down to the card */
    .position-top .long-press-menu::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: var(--background-primary) transparent transparent transparent;
    }

    .position-top .long-press-menu::before {
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

    /* Arrow pointing up to the card */
    .position-bottom .long-press-menu::after {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        margin-left: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: transparent transparent var(--background-primary) transparent;
    }

    .position-bottom .long-press-menu::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        margin-left: -7px;
        border-width: 7px;
        border-style: solid;
        border-color: transparent transparent var(--background-modifier-border) transparent;
        z-index: -1;
    }

    @keyframes menuPop {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
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
