# Todo Flow: Antigravity Session Starter

Copy and paste this prompt at the beginning of every new development session to "Hydrate Context" and ensure I (the agent) am anchored to the project's unique architecture.

---

## The Hydration Prompt

> **Initialize session.**
> 1. **Codebase Synthesis**: Scan `src/services` and `src/utils` to index existing patterns.
> 2. **Rule Alignment**: Load and acknowledge `.agent/rules/consistency.md` and `docs/UX_GOVERNANCE.md`.
> 3. **Task Anchor**: I am working on **[Backlog ID/Feature Name]**.
> 4. **Senior Architect Directive**: Prioritize logic reuse. If a utility like `TaskQueryService` or the `Handshake Pattern` applies, you MUST use it.
> 5. **Output**: Generate an **Implementation Plan Artifact** using the **Architecture Audit Skill** before writing any code.

---

## Why use this for Todo Flow?

1.  **Prevents "Rogue Parsers"**: This project uses a very specific "Data Funnel" logic. If I start a session without this prompt, I might try to write a new Markdown parser instead of using the existing `TaskQueryService`.
2.  **Locks Focus Sovereignty**: It forces me to remember that Focus and Gestures are governed by strict rules in this codebase—preventing regressions in mobile/desktop parity.
3.  **Enforces TDD**: By demanding an Implementation Plan first, it gives you a chance to verify my test strategy (Vitest vs E2E) before I commit to code.

## Recommended Context Pins

Before sending the prompt, **Pin** these files for maximum accuracy:
- `docs/ARCHITECTURE.md`
- `docs/UX_GOVERNANCE.md`
- `docs/KNOWLEDGE_BASE.md`
- `src/types.ts`
