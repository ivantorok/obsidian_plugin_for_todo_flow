<script>
    import Card from '../../components/Card.svelte';
</script>

<Card title="Wrapper Title" variant="dump">
    <div data-testid="default-slot">Body Content</div>
    <div slot="actions" data-testid="actions-slot">Action Buttons</div>
</Card>
