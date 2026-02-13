# FEAT-003: Mobile Modal Capture Side-Channel

## Problem / Goal
Inline renaming on mobile causes Viewport Layout Shift (VKLS) issues. If a task is renamed to include a time, the "Optimistic Sort" can cause the focused task to jump out of view while the user is still typing.

## Current Behavior
Tapping a task title in the Stack View transforms the text into an `<input>` field.

## Expected Behavior
On mobile, tapping a task title should open a dedicated "Capture Modal" (Sheet/Drawer) that overlays the entire view. Focus is trapped inside the modal. The background list remains static until the modal is dismissed.

## Proposed Test Case (TDD)
- [ ] E2E Test: Tap task title -> Verify modal is open.
- [ ] E2E Test: Enter new title with time -> Dismiss modal -> Verify task has updated and moved to the correct position (only after dismissal).

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `ModalService` (if exists), `QuickAdd` patterns.
- **Architectural Patterns**: **Progressive Disclosure**, **Focused Sovereignty**.

## UX Governance Compliance
- **Rule Alignment**: **Sovereignty Buffer**, **Viewport Shifting (VKLS)**.

## Context / Constraints
- Involved files: `src/views/StackView.svelte`, `src/components/CaptureModal.svelte`.
