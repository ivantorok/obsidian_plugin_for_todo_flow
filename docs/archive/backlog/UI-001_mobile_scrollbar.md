# UI-001: Mobile: Visible scrollbar needed

## Problem / Goal
It is difficult to tell if more tasks are available off-screen in the Daily Stack view on mobile because the scrollbar is hidden or very subtle.

## Current Behavior
The `todo-flow-stack-container` uses standard overflow, which often hides scrollbars on mobile OSs until active scrolling occurs.

## Expected Behavior
A visible scrollbar or scroll indicator should be present to signify that the list is scrollable.

## Proposed Solution
- Use CSS to enforce a visible scrollbar track on mobile browsers.
- Ensure the background gradient in the footer doesn't completely block the scroll context.

## Proposed Test Case (TDD)
- [ ] UI Verification: Manual check on mobile device for scrollbar visibility.

## Context / Constraints
- Aesthetics: Must remain "Premium" and not look like a clunky legacy scrollbar.
- `StackView.svelte` styling.
