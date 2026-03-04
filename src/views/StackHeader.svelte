<script lang="ts">
    import moment from "moment";
    import type { StackUIState } from "./ViewTypes.js";

    let {
        navState = $bindable(),
        internalCanGoBack,
        onGoBack,
        navigationHistory,
        internalParentTaskName,
        isSyncing,
    }: {
        navState: StackUIState;
        internalCanGoBack: boolean;
        onGoBack: () => void;
        navigationHistory: any[];
        internalParentTaskName: string | null;
        isSyncing: boolean;
    } = $props();
</script>

<div class="todo-flow-stack-header">
    <div class="header-left">
        {#if internalCanGoBack}
            <button
                class="back-nav-btn"
                onclick={onGoBack}
                title="Go back to parent"
                data-testid="back-nav-btn"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><line x1="19" y1="12" x2="5" y2="12"
                    ></line><polyline points="12 19 5 12 12 5"
                    ></polyline></svg
                >
            </button>
        {/if}

        <div class="breadcrumb-trail">
            {#if navigationHistory.length > 0}
                <span class="breadcrumb-item root" onclick={onGoBack}
                    >...</span
                >
                <span class="breadcrumb-separator">/</span>
            {/if}
            {#if internalParentTaskName}
                <span
                    class="breadcrumb-item active"
                    data-testid="header-parent-name"
                    >{internalParentTaskName}</span
                >
            {/if}
        </div>
    </div>

    <div class="header-right">
        <span
            class="sync-sentry"
            class:is-active={isSyncing}
            data-testid="sync-sentry"
            data-is-active={isSyncing}
            title={isSyncing
                ? "Obsidian Sync Active"
                : "Obsidian Sync Idle"}>☁️</span
        >
        <button
            class="mode-toggle-btn"
            class:is-active={navState.viewMode === "focus"}
            onclick={() =>
                (navState.viewMode =
                    navState.viewMode === "focus" ? "architect" : "focus")}
            title={navState.viewMode === "focus"
                ? "Switch to Architect View"
                : "Switch to Focus View"}
        >
            {#if navState.viewMode === "focus"}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><line x1="8" y1="6" x2="21" y2="6"></line><line
                        x1="8"
                        y1="12"
                        x2="21"
                        y2="12"
                    ></line><line x1="8" y1="18" x2="21" y2="18"
                    ></line><line x1="3" y1="6" x2="3.01" y2="6"
                    ></line><line x1="3" y1="12" x2="3.01" y2="12"
                    ></line><line x1="3" y1="18" x2="3.01" y2="18"
                    ></line></svg
                >
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                    ></rect><line x1="3" y1="9" x2="21" y2="9"
                    ></line><line x1="9" y1="21" x2="9" y2="9"
                    ></line></svg
                >
            {/if}
        </button>
        <span class="header-index" title="Current Task Position">
            {navState.focusedIndex + 1} <span class="index-separator">/</span>
            {navState.tasks.length}
        </span>
        <span class="header-time">{moment().format("HH:mm")}</span>
        
        {#if navState.isReorderMode}
            <button 
                class="reorder-done-btn" 
                onclick={() => navState.isReorderMode = false}
                data-testid="reorder-done-btn"
            >
                DONE
            </button>
        {/if}
    </div>
</div>

<style>
    .todo-flow-stack-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
        flex-shrink: 0;
    }

    .header-left, .header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .back-nav-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        border-radius: 4px;
    }

    .back-nav-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    .breadcrumb-trail {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .breadcrumb-item.root {
        cursor: pointer;
    }

    .breadcrumb-item.root:hover {
        color: var(--text-normal);
    }

    .breadcrumb-item.active {
        font-weight: 600;
        color: var(--text-normal);
    }

    .sync-sentry {
        font-size: 0.9rem;
        opacity: 0.3;
        transition: opacity 0.3s;
    }

    .sync-sentry.is-active {
        opacity: 0.9;
        filter: drop-shadow(0 0 2px var(--interactive-accent));
    }

    .mode-toggle-btn {
        background: none;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        transition: all 0.2s;
    }

    .mode-toggle-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
        border-color: var(--background-modifier-border-hover);
    }

    .mode-toggle-btn.is-active {
        color: var(--interactive-accent);
        background: var(--background-modifier-hover);
        border-color: var(--interactive-accent);
    }

    .header-index {
        font-size: 0.85rem;
        color: var(--text-muted);
        font-family: var(--font-monospace);
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--background-secondary-alt);
        padding: 2px 8px;
        border-radius: 4px;
    }

    .index-separator {
        opacity: 0.3;
    }

    .header-time {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-normal);
        font-family: var(--font-monospace);
        min-width: 45px;
        text-align: right;
    }

    .reorder-done-btn {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        margin-left: 0.5rem;
    }

    .reorder-done-btn:hover {
        background: var(--interactive-accent-hover);
    }
</style>
