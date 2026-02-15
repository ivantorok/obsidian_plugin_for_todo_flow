# Story Archive: Resolved Synthetic Stories

## 2026-02-15: The "Ghost in the Machine" Story (Story 11)
**Target Axiom:** *Deterministic Transitions & State Sovereignty*
> **The User:** "I just finished triaging my dump. I picked five really important things to work on and clicked 'Finish'. The app switched over to my 'Daily Stack' view like it always does, but... the list was empty! My five tasks were gone. It's like the app forgot everything I just told it during triage. I had to go back to my dump and start all over again. It feels like the hand-off between triaging and stacking is broken."

**Resolution**: Implemented "Direct Injection" in `main.ts` to pass IDs in-memory. Removed redundant `reload()` in `StackView.ts` to prevent disk race conditions.
