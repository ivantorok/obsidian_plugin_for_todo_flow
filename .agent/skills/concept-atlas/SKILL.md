---
name: Concept Atlas Maintenance
description: Rules and workflows for maintaining the Concept Atlas and preventing duplication.
---

# Concept Atlas Maintenance Protocol

Use this skill to manage technical context and "Rules of the World" for the project.

## The "Atomic Feedback Loop"
When an observation (fix/feature/bug report) is received:
1.  **Contextualize**: Which `[[STAGE]]` is affected? (Dump, Triage, Stack)
2.  **Mechanic Audit**: Run `grep` on `MECHANICS/` for related behavior (e.g., "focus", "viewport").
3.  **Coherence Check**: 
    - If behavior is undocumented: Update/Create a Mechanic primitive FIRST.
    - If behavior is an exception: Detail it in the Stage file with a link to the Mechanic.
4.  **TDD Linkage**: Ensure test case descriptions reference the Atlas Mechanic.
5.  **Chronological Traceability**: All updates MUST include a `yyyy-mm-dd hh:mm:ss` timestamp to resolve future conflicts.

## Definition of Done (DoD)
- [ ] **Atlas Coherence**: The `[[Concept Atlas]]` has been updated/referenced for any logic changes.
- [ ] At least one new test covers the change and references the Atlas.
- [ ] Walkthrough reconcile Atlas truth with implementation.

## Helpful Commands
- **Search Mechanics**: `grep -r "concept" docs/atlas/MECHANICS/`
- **Find Related Scenes**: `grep -r "concept" docs/atlas/STAGES/`
