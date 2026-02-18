# Mechanic: Optimistic Sovereignty

To ensure a butter-smooth user experience on varied hardware, the system decouples immediate UI responsiveness from heavy background persistence.

## The Principle
1. **Optimistic First**: The UI projection (Svelte state) MUST update immediately upon user interaction, assuming the backing operation will succeed.
2. **Asynchronous Persistence**: Disk I/O or heavy metadata updates are delegated to a background task (using `vault.process`) to prevent main-thread saturation.
3. **Sovereign Buffering**: The user's input/gesture thread retains CPU priority. Recalculations or persistence events are yielded to ensure 60fps interaction.

## Constraints
- **Main Thread Locking**: On high-latency environments (e.g., 8GB RAM Linux/Android), synchronous disk sync is FORBIDDEN as it locks the UI render cycle.
- **Fail-Safe UI**: If the background persistence fails, the UI must provide a non-intrusive `Notice` and, where possible, offer a retry or a revert.

## Implementation References
- **Triage Addition**: Decouples FAB selection from disk write.
- **Duration Tuning**: Incremental duration changes trigger non-blocking metadata updates.
- **Reference**: `docs/MOBILE_TECHNICAL_CONSTRAINTS.md`
