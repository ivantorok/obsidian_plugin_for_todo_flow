# Agentic Knowledge Base

This document serves as the "Persistent Memory" for agents working on the Todo Flow project. It tracks non-obvious discoveries, internal API patterns, and learned gotchas to ensure architectural consistency.

## 1. Interaction Patterns

### Static Interaction Pattern (Android Stability)
- **Problem**: On some Android hardware, interaction-based CSS changes (like `:active` or `:hover` background shifts) can "stick" or lag, creating a poor user experience.
- **Pattern**: Use static backgrounds for high-frequency buttons (like Triage "Shortlist"). Rely on parent motion (swipes) or final state changes for feedback.
- **Reference**: [UX_GOVERNANCE.md](./docs/UX_GOVERNANCE.md)

### The Handshake Pattern (Focus Sovereignty)
- **Problem**: Multiple views competing for keyboard events.
- **Pattern**: Centralized `ViewManager` grants "Sovereignty" to a specific leaf ID. Views must check `viewManager.isSovereign(this.leaf.id)` before responding to keyboard/gesture events.
- **Reference**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

### Context-Aware Command Delegation
- **Problem**: Global Obsidian commands (e.g. `add-task-to-stack`) incorrectly target a background view when a specialized view (e.g. `TriageView`) is sovereign.
- **Pattern**: Command callbacks in `main.ts` should check `activeLeaf.view.getViewType()`. If the sovereign view has a specialized handler (like `openAddModal`), delegate to it instead of the default leaf.
- **Reference**: BUG-001 Fix in `main.ts` (v1.2.27).

### Mobile Viewport Hardening (E2E)
- **Problem**: Mobile-emulated E2E tests may bypass hardened viewport logic if they rely solely on User Agent checks.
- **Pattern**: Always check Obsidian's internal `app.isMobile` flag in service-level detection logic. Mock this flag in `emulateMobile()` utility.
- **Reference**: BUG-018 Fix in `ViewportService.ts` (v1.2.33).

## 2. Obsidian Internal APIs

### Native History Integration
- **Discovery**: Setting `this.navigation = true` in an `ItemView` wrapper enables Obsidian's native navigation stack (back/forward buttons) for internal plugin transitions.
- **Usage**: Essential for "Drill-Down" and "Rollup" interactions.

## 3. Learned Gotchas

### Gesture Shadowing Collision (Nested Elements)
- **Issue**: Nested buttons in swipeable cards may fail to stop propagation of `pointerdown` events, leading to accidental card taps when a button is clicked.
- **Fix**: Always use `onpointerdown={(e) => e.stopPropagation()}` on internal interactive elements within swipeable containers.

### Global Gesture Shadowing Leak (Obsidian Interface)
- **Issue**: Obsidian's mobile sidebars (Left/Right) or pull-down search can be triggered during within-plugin swipes if the initial movement isn't immediately blocked.
- **Fix**: Call `e.stopPropagation()` and `e.stopImmediatePropagation()` at the VERY START of `touchstart` and `pointermove` handlers, even before crossing thresholds, if the intent is already locked. 
- **Reference**: BUG-017 (v1.2.29).

### Centering Constraint (Bottom of List)
- **Issue**: Hardened `scrollIntoView({ block: 'center' })` fails on items at the very bottom of a scrollable container because there is no "space" to scroll into.
- **Fix**: Inject dynamic bottom padding (e.g., `50vh`) to the container while an input is active (`is-editing` state). Use CSS transitions for smooth entry/exit.
- **Reference**: BUG-018 Fix in `StackView.svelte` (v1.2.33).

### Svelte 5 Mount Failures (Silent Errors)
- **Issue**: ReferenceErrors or runtime exceptions during Svelte 5 `mount()` can cause components to fail silently if the error isn't explicitly caught in the host class. In E2E, this manifests as "element not found".
- **Fix**: Wrap `mount()` in a try-catch block and log the error message + stack to a global array (e.g., `window._logs`). Use `browser.getLogs('browser')` in E2E failures to capture the exact exception.
- **Pattern**: When using `$derived` values that depend on cross-platform props (like `isMobileProp`), ensure the prop is declared as `$state` before any function usage to avoid ReferenceErrors during initial reactive tracking.
- **Reference**: v1.2.42 release (Rollup Spec Fix).

### Async Disk Sync Latency (Verification)
- **Issue**: When using "Optimistic UI" with background disk I/O (e.g., `vault.process`), E2E tests may read the file before the background write completes, leading to false negatives.
- **Fix**: Implement a robust retry loop (5-10s window) in `browser.execute` blocks when verifying disk persistence.
- **Pattern**: [Reference BUG-012 E2E Fix](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/tests/e2e/journeys/mobile_triage_existing_task.spec.ts).

### Build Artifact Integrity (E2E)
- **Issue**: E2E tests may run against stale `main.js` files if the build process is skipped after source code changes, making bugs appear unresolveable.
- **Fix**: Always enforce `npm run build` before E2E verification cycles when `src/` has changed.
