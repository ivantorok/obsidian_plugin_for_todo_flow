---
description: Architecture and UX Governance Audit
---

# Architecture Audit Skill

Use this skill to self-audit your **Implementation Plan** before writing code. This ensures alignment with the project's core principles and prevents logic duplication.

## Workflow

1. **Scan Existing Utilities**:
   - Run a `grep` or `find` for terms related to your new logic (e.g., "parse", "scroll", "touch").
   - Compare your plan against `src/utils/` and `src/services/`.

2. **UX Governance Check**:
   - Verify that your proposed hotkeys do not conflict with `docs/UX_GOVERNANCE.md`.
   - Ensure you have a plan for **Focus Sovereignty** (where does focus go after your action?).
   - If UI/Mobile is involved, ensure you are following the **Static Interaction Pattern** for Android.

3. **Dependency Audit**:
   - Check if you are introducing new dependencies that could be handled by existing ones (e.g., using `moment.js` instead of the project's preferred date utility).

4. **Svelte Rune Compliance**:
   - Ensure all new components use **Svelte 5 Runes** (`$state`, `$derived`, etc.) as mandated in the `DEVELOPER_GUIDE.md`.

## Expected Output
A short "Audit Summary" at the end of your implementation plan confirming:
- "No redundant utilities found/Existing utility X will be reused."
- "UX Governance rules A and B have been applied."
- "Svelte 5 Runes verified."
