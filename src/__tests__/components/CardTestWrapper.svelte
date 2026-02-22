<script>
    import Card from "../../components/Card.svelte";
</script>

<Card title="Wrapper Title" variant="dump">
    {#snippet children()}
        <div data-testid="default-slot">Body Content</div>
    {/snippet}
    {#snippet actions()}
        <div data-testid="actions-slot">Action Buttons</div>
    {/snippet}
</Card>
