# Consistency & Library Reuse Rule

To prevent "agent drift" and ensure architectural integrity, every agent working in this project MUST follow these guidelines.

## 0. Session Initialization Protocol
At the start of every new session or task, you MUST run `ls docs/backlog/` to identify the active task. You MUST output the "Architectural Handshake" summary before performing any file edits. This summary must include:
1. **Active Task**: The specific backlog item being addressed.
2. **Reuse Audit**: Citation of at least **two** existing reusable components or utilities (e.g., `TaskQueryService`, `FileLogger`, `StackController`).
**Failure to cite at least two existing reusable components will result in a rejected plan.**

## 1. Search Before Sowing
- **Logic Reuse**: Before implementing any new utility, search the `src/utils` and `src/services` folders.
- **Service Reuse**: Use `TaskQueryService` for any Markdown parsing or task retrieval. DO NOT write raw file parsers unless specifically directed.
- **Type Reuse**: Always check `src/types.ts` (or relevant `types.ts` in subdirectories) before creating new interfaces.

## 2. Architectural Pillars
- **Reactive Projection**: The UI is a projection of the disk. Always write to disk immediately upon interaction.
- **Focus Sovereignty**: Respect the rules in `docs/UX_GOVERNANCE.md`. Modals take absolute focus; `Escape` returns to the Stack.
- **The Handshake Pattern**: Use the centralized `ViewManager` to check for sovereignty before responding to global hotkeys.

## 3. Persistent Memory
- If you discover a non-obvious Obsidian API or a fix for a platform-specific bug (e.g., Android button lag), log it immediately in `docs/KNOWLEDGE_BASE.md`.
- Read `docs/KNOWLEDGE_BASE.md` before starting any hardware-specific or navigation-heavy task.

## 4. Verification Policy
- Do not mark a task as "complete" until you have verified it against the relevant E2E suite (`mobile_full_journey.spec.ts` or `desktop_full_journey.spec.ts`).
- If you modify UI, use the **Antigravity Browser** to record a visual proof of the change.
