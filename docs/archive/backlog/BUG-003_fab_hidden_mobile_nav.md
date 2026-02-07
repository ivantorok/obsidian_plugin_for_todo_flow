---
id: BUG-003
title: FAB Hidden Behind Mobile Navigation Bar
status: done
priority: high
type: bug
component: TriageView
platform: mobile
resolved: 2026-02-07
version: v1.2.13
---

# BUG-003: FAB Hidden Behind Mobile Navigation Bar

## Problem Statement
As a **mobile user**, I cannot tap the floating `+` button (FAB) in Triage View because it is hidden behind Obsidian's mobile navigation bar (back/forward/search/tabs/hamburger icons).

## Acceptance Criteria
- [x] The FAB is always visible and tappable on mobile devices
- [x] The FAB does not overlap with Obsidian's native mobile UI chrome
- [x] The solution works in both portrait and landscape orientations

## Resolution
**Fixed in v1.2.13** via CSS change in `TriageView.svelte`:
```css
bottom: calc(env(safe-area-inset-bottom, 0px) + 60px);
```

## Technical Notes
- Obsidian mobile reserves space at the bottom for its navigation bar
- ~~Current FAB uses `position: fixed; bottom: 20px;` which doesn't account for this~~
- Solution used: `env(safe-area-inset-bottom)` + 60px offset

## Related
- FEAT-001: Mobile Triage Addition (parent feature)
- UX_GOVERNANCE.md: Viewport Occlusion axiom
