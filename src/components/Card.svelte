<script lang="ts">
    let { title = undefined, variant = 'default' } = $props();
</script>

<div class="todo-flow-card variant-{variant}">
   {#if title}
       <h2 class="todo-flow-card-header">{title}</h2>
   {/if}

   <div class="todo-flow-card-body">
       <slot />
   </div>

   {#if $$slots.actions}
       <div class="todo-flow-card-actions">
           <slot name="actions" />
       </div>
   {/if}
</div>

<style>
   .todo-flow-card {
       display: flex;
       flex-direction: column;
       width: 100%;
       max-width: 600px; /* Default constraint */
       background: var(--background-secondary);
       border: 1px solid var(--background-modifier-border);
       border-radius: 8px;
       padding: 2rem;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
       transition: transform 0.2s, opacity 0.2s;
       gap: 1.5rem;
   }

   /* Headers */
   .todo-flow-card-header {
       text-align: center;
       color: var(--text-muted);
       font-weight: 500;
       margin: 0;
       font-size: 1.1rem;
       opacity: 0.9;
       text-transform: uppercase;
       letter-spacing: 0.05em;
   }

   /* Body */
   .todo-flow-card-body {
       flex: 1;
       width: 100%;
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
   }

   /* Actions Footer */
   .todo-flow-card-actions {
       display: flex;
       justify-content: center;
       gap: 1rem;
       margin-top: auto;
   }

   /* Variant: Triage overrides */
   .todo-flow-card.variant-triage {
       max-width: 400px;
       height: 300px;
       text-align: center;
   }

   /* Variant: Dump overrides */
   .todo-flow-card.variant-dump {
       /* Dump specific overrides if needed */
   }
</style>
