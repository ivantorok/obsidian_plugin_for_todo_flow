<script lang="ts">
    import { fade } from 'svelte/transition';
    import { type KeybindingSettings } from '../keybindings';
    import { type TodoFlowSettings } from '../main';

    export let keys: KeybindingSettings;
    export let settings: TodoFlowSettings;

    function formatBinding(binding: string): string {
        if (!binding) return '';
        return binding
            .replace('ArrowUp', '↑')
            .replace('ArrowDown', '↓')
            .replace('ArrowLeft', '←')
            .replace('ArrowRight', '→')
            .replace('Enter', '⏎')
            .replace('Backspace', '⌫')
            .replace('Shift', '⇧')
            .replace('Cmd', '⌘')
            .replace('Ctrl', 'Ctrl')
            .replace('Alt', 'Opt')
            .replace('Meta', '⌘')
            .replace(/\+/g, '+');
    }
</script>

<div class="todo-flow-help-modal" transition:fade={{ duration: 100 }}>
    <div class="content">
        <h2>Keyboard Shortcuts</h2>
        <div class="grid">
            <div class="section">
                <h3>Navigation</h3>
                <div class="row">
                    <div class="keys-group">
                        {#each keys.navDown as binding}
                            <span class="key">{formatBinding(binding)}</span>
                        {/each}
                        /
                        {#each keys.navUp as binding}
                            <span class="key">{formatBinding(binding)}</span>
                        {/each}
                    </div>
                    <span>Move Focus</span>
                </div>
                <div class="row">
                   <div class="keys-group">
                       {#each keys.confirm as binding}
                           <span class="key">{formatBinding(binding)}</span>
                       {/each}
                       /
                       {#each keys.forceOpen as binding}
                           <span class="key">{formatBinding(binding)}</span>
                       {/each}
                   </div>
                   <span>Open / Drill Down</span>
                </div>
                <div class="row">
                    <div class="keys-group">
                        {#each keys.goBack as binding}
                            <span class="key">{formatBinding(binding)}</span>
                        {/each}
                    </div>
                    <span>Go Back</span>
                </div>
            </div>
            <div class="section">
                <h3>Actions</h3>
                <div class="row"><span class="key">{formatBinding(keys.toggleDone[0])}</span> <span>Toggle Done</span></div>
                <div class="row"><span class="key">{formatBinding(keys.createTask[0])}</span> <span>Create Task</span></div>
                <div class="row"><span class="key">{formatBinding(keys.rename[0])}</span> <span>Rename Task</span></div>
                <div class="row"><span class="key">{formatBinding(keys.editStartTime[0])}</span> <span>Set Start Time</span></div>
                <div class="row"><span class="key">{formatBinding(keys.deleteTask[0])}</span> <span>Delete Task</span></div>
                <div class="row"><span class="key">{formatBinding(keys.export[0])}</span> <span>Export to Note</span></div>
            </div>
            <div class="section">
                <h3>Organization</h3>
                <div class="row">
                    <div class="keys-group">
                        <span class="key">{formatBinding(keys.moveDown[0])}</span> / <span class="key">{formatBinding(keys.moveUp[0])}</span>
                    </div>
                    <span>Move Task</span>
                </div>
                <div class="row"><span class="key">{formatBinding(keys.anchor[0])}</span> <span>Toggle Anchor</span></div>
                <div class="row">
                    <div class="keys-group">
                        {#each keys.durationUp as binding}
                            <span class="key">{formatBinding(binding)}</span>
                        {/each}
                        /
                        {#each keys.durationDown as binding}
                            <span class="key">{formatBinding(binding)}</span>
                        {/each}
                    </div>
                    <span>Adjust Duration</span>
                </div>
                <div class="row">
                    <span class="key">{formatBinding(keys.undo[0])}</span> / <span class="key">{formatBinding(keys.redo[0])}</span>
                    <span>Undo / Redo</span>
                </div>
            </div>
            <div class="section">
                <h3>System</h3>
                <div class="row">
                    <span>Timing Mode</span>
                    <span class="status-badge" class:fixed={settings.timingMode === 'fixed'}>
                        {settings.timingMode === 'now' ? 'Dynamic (Now)' : 'Fixed (' + settings.fixedStartTime + ')'}
                    </span>
                </div>
                <div class="help-text">
                    Toggle via Command Palette: <b>"Toggle Timing Mode"</b>
                </div>
            </div>
        </div>
        <div class="footer">
            Press <span class="key">?</span> or <span class="key">Esc</span> to close
        </div>
    </div>
</div>

<style>
    .todo-flow-help-modal {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85); /* Gmail style dark overlay */
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(2px);
    }

    .content {
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        max-width: 600px;
        width: 90%;
        max-height: 90%;
        overflow-y: auto;
    }

    h2 {
        margin-top: 0;
        margin-bottom: 20px;
        text-align: center;
        color: var(--text-accent);
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
    }

    h3 {
        font-size: 0.9em;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 10px;
        color: var(--text-muted);
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 5px;
    }

    .row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 0.95em;
    }

    .key {
        font-family: monospace;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.85em;
        color: var(--text-normal);
    }

    .footer {
        text-align: center;
        margin-top: 20px;
        color: var(--text-muted);
        font-size: 0.9em;
    }

    .keys-group {
        display: flex;
        gap: 6px;
    }

    .status-badge {
        font-size: 0.85em;
        font-weight: bold;
        color: var(--text-accent);
    }
    .status-badge.fixed {
        color: var(--text-warning);
    }
    .help-text {
        font-size: 0.8em;
        color: var(--text-muted);
        margin-top: 10px;
        font-style: italic;
    }
</style>
