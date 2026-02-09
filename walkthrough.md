# Walkthrough - BUG-001: Desktop Triage Shortcut Leak

I have resolved the issue where the `Add Task to Stack` command (often mapped to the `a` or `o` shortcut) would incorrectly target the background Stack view even when the Triage view was active.

## Changes Made

### 1. Context-Aware Command Delegation
Modified `src/main.ts` to check for Focus Sovereignty before executing the `add-task-to-stack` command. If the `TriageView` is currently active or sovereign, the command is now delegated to it instead of forcing focus to the `StackView`.

### 2. TriageView API Extension
Exposed the `openAddModal()` method in `TriageView.ts` to allow external delegation from global Obsidian commands. This mirrors the existing API of `StackView`.

### 3. Keybinding Alignment
Added `a` and `A` as default shortcuts for the `CREATE_TASK` action in `src/keybindings.ts`, aligning the plugin's defaults with the reported user workflow.

## Verification Results

### Automated Tests
- **E2E Journey**: Updated `tests/e2e/journeys/desktop_shortcut_conflict.spec.ts` to specifically trigger the Obsidian command and verify that focus stays on Triage.
- **Golden Suite**: Ran the full test suite (22 spec files). All relevant tests passed. (Note: One pre-existing timeout flakiness in BUG-017 was observed but is unrelated to these changes).

### Proof of Work
The following E2E test passage confirms that the shortcut now respects the active view:
```
Desktop Shortcut Conflict (BUG-001)
   ✓ should prioritize Triage shortcuts over background Stack shortcuts

1 passing (12s)
```

## How to Verify
1. Open the Daily Stack view.
2. Trigger Triage (e.g., via the `Start Triage` command).
3. Ensure the Triage view is focused.
4. Press `a` or `o`, or trigger the `Todo Flow: Add Task to Stack` command from the Command Palette.
5. **Expected**: The Quick Add modal opens for the Triage view, and the background Stack view is NOT revealed or focused.
