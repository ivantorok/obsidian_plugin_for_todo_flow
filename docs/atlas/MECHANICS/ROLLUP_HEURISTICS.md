# Mechanic: Rollup Heuristics

Rollup determines the "Effective Duration" of a task by aggregating the work requirements of its hierarchy.

## The Principle
1. **Greedy Summation**: A task's `TotalDuration` is the sum of its **Base Duration** (own time) and the `TotalDuration` of all non-completed (`todo`) children.
2. **Exclusion Rule**: Tasks with status `done` or `archived` are excluded from the rollup.
3. **Recursive Integrity**: The rollup is calculated bottom-up. A Change in a grandchild's duration immediately ripples up to the root parent.

## The Logic (Math)
```typescript
Effective(Task) = OwnDuration + Sum(Effective(Child) for Child in Children if Child.status != 'done')
```

## UI Expression
- **Visual Simplicity**: In views where duration is visible (Stack, Triage), the UI displays the single aggregated `TotalDuration` sum only.
- **Non-Editable Sums**: Rollup durations are calculated values. Users edit the **Base Duration** of specific items, which then recalculates the parent's total.

## Technical Reference
- `getTotalGreedyDuration` in `src/scheduler.ts`
- `rollup_logic.test.ts`
