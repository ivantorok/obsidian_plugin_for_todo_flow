# Todo Flow: Full Protocol Boot (Session Starter)

Use this prompt to initialize a new coding session with Antigravity to ensure high-stability and architectural alignment.

---

Initialize session with a **Full Protocol Boot**:
1.  **Backlog Audit**: Review `docs/BACKLOG.md` and `docs/backlog/*.md` to identify the next priority task.
2.  **KI Synchronization**: Review `docs/KNOWLEDGE_BASE.md` and `docs/UX_GOVERNANCE.md` for patterns relevant to the chosen task.
3.  **Build & Baseline**: Run `npm run build` followed by the **Golden Suite** (`npm run test:quick`) to confirm a 100% stable baseline before any changes.
    > [!IMPORTANT]
    > E2E tests target the compiled `main.js`. Always build before verifying a baseline or fix.
4.  **Architectural Handshake**: Propose an `implementation_plan.md`. Agreement on the data flow and UI state changes MUST happen before coding starts.

---

### Why we use this:
- **Zero Regression**: Confirms the code is healthy *before* work starts.
- **Context Loading**: Ensures the agent is aware of "Tribal Knowledge" (e.g., Android sticky buttons, gesture shadowing).
- **Alignment**: Prevents wasted implementation time by agreeing on the architecture first.
