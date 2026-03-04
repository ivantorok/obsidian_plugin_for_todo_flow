---
description: Logarithmic sequence mapping for rapid numeric adjustments (e.g., task durations).
---

# Concept: Logarithmic Increment Sequence

## Rationale
When an interface requires rapid adjustment of a value (like a task duration) without access to a keyboard or a complex picker, simple `+` and `-` buttons are ergonomically superior. However, a linear progression (e.g., constantly adding `15m`) is too slow for large changes.

To solve this, we use a concept modeled after logarithmic scaling but rounded to human-readable time chunks. This is specifically used in the `TaskContextMenu` (Local Stacking Interaction).

## The Sequence
The sequence defines absolute "snap points". Pressing `+` moves the value to the next highest snap point. Pressing `-` moves it to the next lowest.

**Sequence Map (in minutes):**
`[2, 5, 10, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480]`

*   Under 1 hour: Accelerated granularity (2m, 5m, 10m, 20m, 30m, 45m)
*   1 to 2 hours: 30-minute granularity (60m, 90m, 120m)
*   2 to 8 hours: 1-hour granularity (180m, ... 480m)

## Implementation Rules
1. If the current value is *between* two snap points (e.g., user manually typed `17m` earlier), pressing `+` should snap to `20m`. Pressing `-` should snap down to `10m`.
2. The sequence is capped globally at `480m` (8 hours).
3. The sequence bottoms out at `2m" (or `1m` depending on smallest task support).

*See also: `TaskContextMenu.svelte` for the UI implementation.*
