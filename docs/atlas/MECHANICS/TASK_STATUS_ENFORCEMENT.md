# Mechanic: Task Status Enforcement

To maintain **Focus Sovereignty** and minimize mental drag, the system enforces a strict binary state for tasks.

## 1. Sovereign States
Tasks MUST only have one of two persistent statuses:
*   **`todo`**: The task is active and requires energy.
*   **`done`**: The task is complete and has no further claim on focus.

## 2. Deprecated States (Forbidden)
*   **`parked`**: [REMOVED]. Replaced by strictly binary `todo`/`done` model. If a task is blocked, move it out of the current stack via the **Archive** action.

## 3. View-Level Actions (Not Statuses)
*   **Archiving**: This is a **Move** command. It removes the task from the current stack array but DOES NOT change the task's internal status. It remains `todo` in its original source file.
*   **Next (Skipping)**: Changes the loop position without modifying the task.

## 4. UI Expression
- Views must only provide visual indicators for "Todo" and "Done."
- The **Archive** action should be represented as a "Drawer" or "File" icon, indicating storage/movement rather than a state change.

## Technical Reference
- `src/scheduler.ts` (Type: `TaskStatus`)
- `docs/atlas/MECHANICS/CIRCULAR_LOOP.md`
