<script lang="ts">
    /**
     * @component IconButton
     * @description A compact icon button intended for toolbars and footers.
     */
    import { setIcon } from 'obsidian';

    interface Props {
        icon: string;
        label: string;
        disabled?: boolean;
        class?: string;
        onclick?: (e: MouseEvent) => void;
    }

    let {
        icon,
        label,
        disabled = false,
        class: className = '',
        onclick
    } = $props<Props>();

    let buttonEl: HTMLButtonElement;

    // Use Obsidian's icon renderer
    $effect(() => {
        if (buttonEl) {
            buttonEl.empty();
            setIcon(buttonEl, icon);
        }
    });
</script>

<button
    bind:this={buttonEl}
    class="tf-icon-btn {className}"
    aria-label={label}
    title={label}
    {disabled}
    onclick={onclick}
>
    <!-- Icon injected by Obsidian setIcon -->
</button>

<style>
    /* Flat & Performant Icon Button */
    .tf-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: var(--tf-touch-min-height, 44px);
        min-height: var(--tf-touch-min-height, 44px);
        padding: 8px; /* Allow icon to breathe */
        border-radius: var(--tf-radius-pill, 9999px);
        background-color: transparent;
        color: var(--text-muted, #888);
        border: none;
        cursor: pointer;
        transition: color 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
    }

    .tf-icon-btn:active {
        transform: scale(0.92);
    }

    .tf-icon-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        transform: none;
    }

    .tf-icon-btn:hover:not(:disabled) {
        color: var(--text-normal, #ddd);
        background-color: var(--background-modifier-hover, rgba(255, 255, 255, 0.08));
    }
</style>
