# BUG-002: Mobile: Adding existing or new task fails

## Problem / Goal
On mobile devices, users are unable to add tasks (either new or existing) to the flow.

## Current Behavior
Interacting with the "Add Task" interface (including the new mobile-specific "+" button) does not result in a task being added on some physical mobile devices, even if it passes E2E emulation.

## Expected Behavior
Adding a task on mobile should work on physical devices, correctly creating the file (if new) and inserting it into the `CurrentStack.md`.

## Steps to Reproduce (for Bugs)
1. Open Todo Flow on physical Obsidian Mobile.
2. Tap the floating "+" button.
3. Observe that the modal opens (if it does), but completing the action does not add a task to the list.

## Proposed Test Case (TDD)
- [ ] E2E Test: Strengthen mobile-emulated smoke test to verify file creation in vault.

## Context / Constraints
- User reported: "Add task to stack still doesn't work on mobile. The task is nor created nor added to the stack"
- Potential issue with async file creation or `CurrentStack.md` persistence timing on mobile filesystems.
