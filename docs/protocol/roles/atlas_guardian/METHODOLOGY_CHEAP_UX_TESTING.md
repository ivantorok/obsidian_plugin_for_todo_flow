# Methodology: Cheap & Rapid UI/UX Testing

**Author**: Atlas Guardian (AG)
**Context**: As requested during the 2026-02-22 Hungarian live testing session (Item #16), the Process Governor requested a formal but "cheap" methodology for continuous UI/UX validation to prevent the accumulation of `Death by 1000 Cuts` (STRAT-01) and interaction bugs (e.g., BUG-029).

This methodology relies on minimal friction, high-frequency internal checkpoints, and structured observation rather than expensive external focus groups.

## The Axioms
1. **You Are Not The User**: Local environment blindness is real.
2. **Speed Over Rigor**: A 5-minute messy test today is better than a pristine $5,000 focus group next month.
3. **Capture the Gap**: Record *what actually happens* vs. *what the architecture expects*.

---

## 1. The "Blind Alignment" Paradigm (Internal Sync)
Most bugs like `BUG-027` (wrong default mode) or `BUG-031` (text clipping) happen because the designer's mental model drifts from the implementation.

**The Test (5 Minutes):**
- **Trigger**: Every time a major UI component is changed (e.g., shipping Wave 1/2 of polish).
- **Execution**: The system opens the app in a fresh environment *without the developer using it first*.
- **The Protocol**: The developer (or an AI proxy) states aloud the predicted exact visual state and interaction chain before touching anything.
- **Example**: "I expect the app to open in List Mode. I expect tapping a card to do nothing, but holding a card to prime a drag."
- **The Gap**: Any deviation from the spoken prediction is instantly logged as an architectural friction point, not just a "bug."

## 2. The "Echo Chamber" Test (Asynchronous Guerrilla Testing)
Instead of live sessions which require coordination, rely on rapid, asynchronous drops.

**The Test (15 Minutes):**
- **Audience**: 1-3 highly trusted power users (e.g., the Hungarian cohort).
- **Format**: Provide a raw `.apk` or Obsidian plugin directory `main.js`. Do not provide a changelog or a "how to test" guide.
- **The Prompt**: "Use this to plan your next 3 tasks for today. Screen record it. Send me the video."
- **The Analysis (The DE steps in)**: Watch the screen recording at 0.5x speed. Look for:
    - *Hesitation* (Hovering over elements like the missing Dump "Finish" button).
    - *Mistakes* (Accidental drill-downs, swiping instead of scrolling).
    - *Workarounds* (User manually scrolling up because the editing element is hidden behind the header).

## 3. The "Thumb Sweep" (Physical Ergonomics)
Interaction sovereignty requires that the app feels physically natural.

**The Test (3 Minutes):**
- Load the app on the physical device size with the largest known layout (e.g., iPhone Max series).
- Operate the app using *only one hand, specifically the thumb*.
- **Pass Criteria**: Can the user scroll without accidental taps? Can they reach the Quick Add button without shifting their grip?
- *This test directly validates fixes like BUG-029.*

---
**Verdict**: A 15-minute Echo Chamber screen recording is the most resource-efficient mechanism we have. It requires zero live moderation and provides a permanent artifact that the DE and AG can debate asynchronously.
