# BUG-026: Stack View — Pink Background / Gradient Present
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
The Stack view renders with a pink/rose background or gradient that is visually inconsistent with the Dump and Triage views. The appearance should be uniform across all workflow stages.

## Current Behavior
Stack view (`LeanStackView.svelte` on mobile or `StackView.svelte`) renders a pink/rose tinted background or gradient effect.

## Expected Behavior
Stack view background matches the neutral background style used in Dump and Triage views. No stage-specific background color unless explicitly designed.

## Steps to Reproduce
1. Complete Triage and advance to Stack.
2. Observe the Stack view background color.

## Proposed Test Case (TDD)
- [ ] Visual / Manual: Verify background color matches Dump/Triage CSS token.

## Context / Constraints
- Components: `LeanStackView.svelte`, `StackView.svelte`, `styles.css`
- Check for hardcoded `background: pink` or CSS gradient in the `.stack-view` / `.lean-stack-view` selectors.
