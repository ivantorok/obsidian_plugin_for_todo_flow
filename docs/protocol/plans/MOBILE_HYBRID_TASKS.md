# Task Checklist: Mobile Hybrid Model

- [/] Phase 0: Restoration & Unification [CRITICAL] 
    - [ ] Fix Rollup double-counting in `scheduler.ts` 
    - [ ] Unify `LeanStackView` into `StackView` class 
    - [ ] Harmonize `StackController` usage for all views 
    - [ ] Purge `parked` status from Svelte code 
- [/] FEAT-008: Implementation (Mobile Hybrid Build)
    - [ ] Implement Mode Toggle ($state) in StackView.svelte
    - [ ] Implement Sync Sentry (Internal Plugin Peek)
    - [ ] Implement Interaction-Idle Queue (Disk I/O debounce)
    - [ ] Implement Breadcrumb Hierarchy (Experimental)
    - [ ] Verify Native Back Gesture handoff
