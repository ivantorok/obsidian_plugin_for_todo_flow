---
id: BUG-003
title: FAB Hidden Behind Mobile Navigation Bar
status: backlog
priority: high
type: bug
component: TriageView
platform: mobile
---

# BUG-003: FAB Hidden Behind Mobile Navigation Bar

## Problem Statement
As a **mobile user**, I cannot tap the floating `+` button (FAB) in Triage View because it is hidden behind Obsidian's mobile navigation bar (back/forward/search/tabs/hamburger icons).

## Acceptance Criteria
- [ ] The FAB is always visible and tappable on mobile devices
- [ ] The FAB does not overlap with Obsidian's native mobile UI chrome
- [ ] The solution works in both portrait and landscape orientations

## Technical Notes
- Obsidian mobile reserves space at the bottom for its navigation bar
- Current FAB uses `position: fixed; bottom: 20px;` which doesn't account for this
- Possible solutions:
  1. Increase `bottom` offset (e.g., `bottom: 80px`) to clear the nav bar
  2. Use CSS `env(safe-area-inset-bottom)` for dynamic safe area handling
  3. Attach FAB to the view's content container instead of the viewport

## Related
- FEAT-001: Mobile Triage Addition (parent feature)
- UX_GOVERNANCE.md: Viewport Occlusion axiom
