# UX-001: Mobile: Start Time editing is not discoverable

## Problem / Goal
Users are unsure how to change the starting time of a task on mobile. The current interaction (clicking the time column) might not be obvious.

## Current Behavior
To change start time, a user must tap the time value, which turns it into an input field. There is no visual cue (icon or secondary button) indicating this is an interactive element.

## Expected Behavior
Add a clear visual indicator or a dedicated action (e.g., in a context menu or a visible icon NEXT to the time) to signify that the start time can be adjusted.

## Proposed Solution
- Add an "edit" icon next to the start time in mobile view.
- Alternatively, include "Set Start Time" as an option if we implement a long-press menu.

## Proposed Test Case (TDD)
- [ ] UI Test: Verify visibility of the edit indicator on mobile.

## Context / Constraints
- Space is limited on mobile device screens.
