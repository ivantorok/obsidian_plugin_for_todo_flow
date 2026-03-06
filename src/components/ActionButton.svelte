<script lang="ts">
    /**
     * @component ActionButton
     * @description A standard text-based button for primary and secondary actions in the Sovereign UX system.
     */
    interface Props {
        text: string;
        variant?: 'primary' | 'secondary' | 'danger';
        disabled?: boolean;
        class?: string;
        onclick?: (e: MouseEvent) => void;
    }

    let {
        text,
        variant = 'primary',
        disabled = false,
        class: className = '',
        onclick
    } = $props<Props>();
</script>

<button
    class="tf-action-btn variant-{variant} {className}"
    {disabled}
    onclick={onclick}
>
    {text}
</button>

<style>
    /* 
     * Sovereign UX: Flat & Performant
     * No glassmorphism. Explicit layout tokens.
     */
    .tf-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: var(--tf-touch-min-height, 44px);
        padding: 0 16px;
        border-radius: var(--tf-radius-card, 16px);
        font-family: inherit;
        font-weight: var(--tf-font-weight-title, 600);
        font-size: 1rem;
        letter-spacing: var(--tf-letter-spacing-tight, -0.01em);
        white-space: nowrap;
        cursor: pointer;
        transition: background-color 0.15s ease, opacity 0.15s ease, transform 0.1s ease;
        border: 1px solid transparent;
    }

    .tf-action-btn:active {
        transform: scale(0.98);
    }

    .tf-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    /* Variants */
    .variant-primary {
        background-color: var(--interactive-accent, #75abd0);
        color: var(--text-on-accent, #ffffff);
    }
    
    .variant-primary:hover:not(:disabled) {
        background-color: var(--interactive-accent-hover, #5e8fb2);
    }

    .variant-secondary {
        background-color: var(--background-secondary, #2a2a2a);
        color: var(--text-normal, #dddddd);
        border: 1px solid var(--border-color, #444);
    }
    
    .variant-secondary:hover:not(:disabled) {
        background-color: var(--background-modifier-hover, rgba(255, 255, 255, 0.08));
    }

    .variant-danger {
        background-color: var(--background-secondary, #2a2a2a);
        color: var(--text-error, #e57373);
        border: 1px solid var(--text-error, #e57373);
    }

    .variant-danger:hover:not(:disabled) {
        background-color: rgba(229, 115, 115, 0.1);
    }
</style>
