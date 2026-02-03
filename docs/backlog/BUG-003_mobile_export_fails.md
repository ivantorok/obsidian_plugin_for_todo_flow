# BUG-003: Mobile: Exporting fails

## Problem / Goal
The export functionality is broken on mobile devices.

## Current Behavior
Clicking the export button on mobile does nothing or fails to produce the exported file.

## Expected Behavior
Exporting should trigger a file download or a share sheet on mobile devices.

## Steps to Reproduce (for Bugs)
1. Open Todo Flow on Obsidian Mobile.
2. Navigate to a flow and click "Export".
3. Observe failure.

## Proposed Test Case (TDD)
- [ ] E2E Test: Verify export button triggers expected action in mobile environment.

## Context / Constraints
- Mobile browsers/Obsidian mobile have different file handling permissions and APIs.
