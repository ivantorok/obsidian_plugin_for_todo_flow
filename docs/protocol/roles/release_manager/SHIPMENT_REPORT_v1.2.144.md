# Shipment Report: v1.2.144

## Meta
- **Date**: 2026-03-07 14:30
- **Version**: v1.2.144
- **Success Score**: 100/100
- **Gatekeeper**: Release Manager (RM)

## Objective: Hoisting DetailedTaskView
The primary goal was to move the `DetailedTaskView` to the global `StackView` scope to ensure accessibility from both Architect (List) and Focus (Card) modes on mobile.

## Audit Checklist
- [x] MISSION_LOG.md v35 updated.
- [x] walkthrough.md reflects hoisting and Svelte 5 refactor.
- [x] VERIFICATION_REPORT.md (VO audit: 17/17 Specs GREEN).
- [x] Backlog Item: FEAT-014 (Hoisting).

## Verification Artifacts
- **Green Suite**: 17 Spec Files passed in 6m 5s.
- **Visuals**: Confirmed via mobile screenshots in `docs/screenshots/Photos-3-002`.

## Critical Risks & Resolution
- **Svelte 5 Runes Regressions**: Resolved runtime crashes in `StackView.svelte` caused by missing state variables (`activeComponent`, etc.).
- **Build Warnings**: Svelte 5 compiler warnings maintained at non-critical levels (21 warnings).
- **Git Hygiene**: Surgically scrubbed accidentally committed e2e screenshots and hardened `.gitignore`.

## Release Details
- **Tag**: `v1.2.144`
- **Link**: [Release v1.2.144](https://github.com/ivantorok/obsidian_plugin_for_todo_flow/releases/tag/v1.2.144)

## Handover to Process Governor
"The repository is at a stable, hoisted baseline. Recommended next task: **Focus Stack Hard Shell Retrofit (Session v36)** to align the Card view with the new ultra-minimal interaction grammar."
