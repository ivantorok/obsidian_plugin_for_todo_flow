<script lang="ts">
    /**
     * @component SovereignInput
     * @description A scalable, viewport-aware text area for high-density input (Dump, Triage, Detail).
     * Enforces 'Option A' viewport logic (flex-shrink: 0, dynamic sizing).
     */
    interface Props {
        value: string;
        placeholder?: string;
        autofocus?: boolean;
        class?: string;
        onkeydown?: (e: KeyboardEvent) => void;
        onfocus?: (e: FocusEvent) => void;
        onblur?: (e: FocusEvent) => void;
        onSubmit?: () => void;
        onCancel?: () => void;
    }

    let {
        value = $bindable(),
        placeholder = 'What needs to be done?',
        autofocus = false,
        class: className = '',
        onkeydown,
        onfocus,
        onblur,
        onSubmit,
        onCancel
    } = $props<Props>();

    let textareaEl: HTMLTextAreaElement;

    // Auto-resize logic based on content
    const resize = () => {
        if (!textareaEl) return;
        textareaEl.style.height = 'auto'; // Reset to calculate naturally
        textareaEl.style.height = textareaEl.scrollHeight + 'px';
    };

    // Watch for external value changes and resize
    $effect(() => {
        value; // React to value changes
        resize();
    });

    // Handle autofocus on mount using an action or effect
    $effect(() => {
        if (autofocus && textareaEl) {
            // Slight delay sometimes needed in modals/popovers
            setTimeout(() => textareaEl.focus(), 50); 
        }
    });

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit?.();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel?.();
        }
        onkeydown?.(e);
    }
</script>

<textarea
    bind:this={textareaEl}
    bind:value
    class="tf-sovereign-input {className}"
    {placeholder}
    oninput={resize}
    onkeydown={handleKeyDown}
    onfocus={onfocus}
    onblur={onblur}
    rows="1"
></textarea>

<style>
    /*
     * Viewport-Aware Option A Constraints
     * The input acts as the primary content block. It must shrink to 0 
     * structurally but allow scroll/expansion within itself if needed,
     * pushing siblings (like action buttons) gracefully down.
     */
    .tf-sovereign-input {
        width: 100%;
        background: transparent;
        border: none;
        color: var(--text-normal, #ddd);
        font-size: 1.25rem; /* Large, readable type */
        line-height: 1.4;
        font-family: inherit;
        font-weight: 500;
        resize: none;
        overflow: hidden; /* Hide scrollbars, we auto-resize */
        outline: none;
        padding: 0;
        margin: 0;
        flex-shrink: 0; /* Crucial for preventing container collapse issues */
        min-height: 1.4em; /* Ensure at least one line is visible */
        
        /* Subtle transition for height jumps */
        transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .tf-sovereign-input::placeholder {
        color: var(--text-muted, #888);
        font-weight: 400;
    }

    .tf-sovereign-input:focus {
        border: none;
        box-shadow: none;
        /* The container holding this input should handle focus states (e.g., border glowing) */
    }
</style>
