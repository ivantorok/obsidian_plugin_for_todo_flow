# STRAT-01: Mobile Performance Optimization ("Death by 1000 Cuts")
**Capture Date**: 2026-02-16 08:35:48

## Problem / Goal
The current stack loading architecture performs redundant file I/O, and the application writes to a log file on every vault change ("smoke signal" logging). These behaviors degrade performance on mobile devices where file I/O is costly, leading to UI jank and battery drain. The goal is to eliminate redundant reads and disable production logging to ensure a smooth, "native-feeling" experience.

## Current Behavior
1.  **Double Read**: `StackLoader` reads a file to parse links -> `GraphBuilder` reads the SAME file again to parse properties. For 50 tasks, this results in 100+ reads.
2.  **Log Spam**: `main.ts` listens to `metadataCache.changed` and writes to `logs/modify-detected.txt` on *every* file event, even in production.
3.  **Recursion**: `GraphBuilder` recursively loads children without depth limits, causing potential stack overflows or massive I/O spikes on deep trees.

## Expected Behavior
1.  **Single Read**: Task files should be read exactly once during a full stack load. Metadata should be passed from the first read or retrieved solely from `app.metadataCache`.
2.  **Zero Log I/O**: Diagnostic logging should be disabled by default in production (`debug: false`) and should never write to disk on high-frequency events like `metadataCache.changed` unless explicitly tracing.
3.  **Optimized Recursion**: Recursion should be managed or limited to prevent performance cliffs.

## Steps to Reproduce (Audit Findings)
1.  Enable "Developer Mode".
2.  Load a stack with 50+ interlinked tasks.
3.  Observe console logs showing `[StackLoader] Reading...` followed immediately by `[GraphBuilder] Reading...` for the same paths.
4.  Trigger a full vault sync (or touch many files).
5.  Observe `logs/modify-detected.txt` being written to continuously.

## Proposed Test Case (TDD)
- [ ] **Unit Test (StackLoader)**: Mock `vault.read` and verify it is called exactly $N$ times for $N$ tasks (not $2N$).
- [ ] **Unit Test (Logger)**: Verify that `logger.info` does NOT write to disk when `settings.debug` is false.
- [ ] **Integration Test**: Verify `metadataCache` event listener respects debug flags.

## Reuse & Architectural Alignment
- **Reuse**: `app.metadataCache` (use this more aggressively for frontmatter/titles instead of reading files).
- **Pattern**: `GraphBuilder` already exists; refactor it to accept `CachedMetadata` or content as an optional argument to avoid re-reading.

## UX Governance Compliance
- **Performance Reference**: "The user should be wowed... Use the Best Practices... Optimize performance." (System Prompt).
- **Home Row Alignment**: Fast load times ensure the user stays in flow. Slow interactions break the "Speed of Thought" axiom.

## Context / Constraints
- **Mobile First**: Changes must be verified on mobile (or simulated mobile env).
- **Files**: `src/GraphBuilder.ts`, `src/loaders/StackLoader.ts`, `src/main.ts`.
