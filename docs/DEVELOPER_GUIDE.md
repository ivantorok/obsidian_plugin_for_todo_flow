# Developer Workflow Guide

## Quick Reference
- **[Working Agreement](./protocol/WORKING_AGREEMENT.md)**: How we interact and what to expect from our development loop.
- **[Backlog](./BACKLOG.md)**: Current roadmap and reported issues.

### Build & Deploy
```bash
# Automated deployment (recommended)
./ship.sh "commit message"

# Deploy to a specific vault
VAULT="/Users/i525277/DemoVault" npm run copy-to

# Build and restart Obsidian with a specific vault
./reset_and_launch.sh /Users/i525277/DemoVault

# Manual steps
npm run build
npm run copy
git push
```

### 🎯 Key Coding Standards
- **Svelte 5 Runes**: Always use Runes (`$state`, `$derived`, `$effect`) for state management. Avoid old reactive declarations (`$:`) to ensure future compatibility.
- **TypeScript**: Strict types are required. Avoid `any`.
- **Logic Isolation**: Keep business logic in `.ts` files (e.g., `StackController.ts`) and minimize logic in Svelte templates.

### Tiered Testing Strategy

To maintain high development velocity while ensuring quality, follow this tiered approach:

#### 1. The Inner Loop (Vitest) - **Seconds**
Run these frequently while coding. Most business logic (scheduling, scaling, parsing) lives here.
```bash
npm test                          # Run all unit tests
npm test src/__tests__/scaling.ts # Run specific logic test
npm test -- --watch               # Watch mode for instant feedback
```

#### 2. Feature Verification (Specific E2E) - **< 1 Minute**
Once logic is green, verify the UI/Obsidian integration for the specific feature.
```bash
# REUSE_OBSIDIAN=1 skips the 5s process restart
REUSE_OBSIDIAN=1 npm run e2e -- --spec tests/e2e/journeys/mobile_full_journey.spec.ts
```

#### 3. The Big Shindig (Full Suite) - **~5 Minutes**
Once work is complete, verify everything.
```bash
npm run test:full                 # Runs everything (Unit + E2E)
```

### ⚡ Performance Tips
- **CORE: REUSE_OBSIDIAN=1**: Always use this during the "Inner Loop". It skips the costly Obsidian shutdown/restart cycle, saving ~10s per run.
- **Legacy Tests**: Redundant or slow tests are kept in `tests/e2e/legacy/`. They are excluded from the main suite by default.
- **Vitest for Logic**: If you are testing math, state transitions, or string parsing, **add a Vitest test**. 

For detailed E2E testing documentation, including **troubleshooting git hooks and large file issues**, see [E2E_TESTING.md](./E2E_TESTING.md).
For the high-level **Hierarchy of Truth** and test sovereignty rules, see [TESTING_STRATEGY.md](./TESTING_STRATEGY.md).
See especially the [Lessons Learned & Gotchas](./E2E_TESTING.md#lessons-learned--gotchas) section if you encounter push rejections.

---

## Cross-Platform Setup

To maintain a consistent development experience across Mac (Darwin) and Linux (Lubuntu):

### 1. Configure Local Environment
Create a `.env` file in the project root (it's ignored by Git):
```bash
cp .env.example .env
```

Edit `.env` to set your local vault path:
```bash
VAULT_PATH="/Users/i525277/DemoVault" # Mac example
# VAULT_PATH="/home/ivan/Documents/Vault" # Linux example

# Optional: Configure multiple vaults for automatic syncing
LOCAL_VAULTS="/Users/i525277/DemoVault /Users/i525277/Vault2 /Users/i525277/Vault3"
```

**Multi-Vault Sync**:
- If `LOCAL_VAULTS` is defined, `npm run copy` syncs to all listed vaults
- If not defined, falls back to auto-discovery (searches home directory)
- Each vault path should be quoted and space-separated
- Only vaults with the plugin already installed will be synced

### 2. OS-Aware Scripts
- `npm run copy`: Syncs to all vaults in `LOCAL_VAULTS` (or auto-discovers if not set)
- `./reset_and_launch.sh`: Detects your OS and uses the correct command to launch Obsidian with your configured vault.

### Debugging
```bash
# Enable developer mode in Obsidian
# Command Palette → "Todo Flow: Toggle Developer Mode"

# View logs (replace <VAULT_PATH> with your vault location)
cat <VAULT_PATH>/todo-flow.log

cat <VAULT_PATH>/todo-flow.log

# Follow logs in real-time
tail -f <VAULT_PATH>/todo-flow.log
```

### 📝 Persistent Logging
Standard `console.log` is often invisible in Obsidian or lost on refresh. 
- **Guideline**: Use `this.logger.info()` or `this.logger.error()` in your views/controllers.
- **Persistence**: These logs are written to `todo-flow.log` in the vault root and persist across app reloads/crashes.
- **Clear Logs**: Run the "Todo Flow: Clear Log File" command or `rm todo-flow.log`.
```

---

## Detailed Workflow

### 1. Development Cycle

#### The Backlog-First Workflow (Preferred)
For complex bugs or feature requests, use the protocol documented in [WORKING_AGREEMENT.md](./protocol/WORKING_AGREEMENT.md):
1. **Report & Distill**: USER provides feedback; Antigravity creates a **Synthetic Story** in `USER_STORIES.md`.
2. **Contract**: Assign a new **AC ID** in `QA_CHECKLIST.md` (Status: `[PENDING]`).
3. **Plan**: Antigravity creates an `implementation_plan.md`. Work starts after approval.
4. **TDD**: A failing test is written *before* any implementation code, linking to the AC ID and Concept Atlas.
5. **Complete**: Once tests pass and the Atlas is updated, the item is moved to the archive.


#### Step 1: Write Test (RED)
```bash
# Create/edit test file
vim src/__tests__/feature.test.ts

# Run test (should fail)
npm test src/__tests__/feature.test.ts
```

#### Step 2: Implement Feature (GREEN)
```bash
# Edit source file
vim src/feature.ts

# Run test (should pass)
npm test src/__tests__/feature.test.ts
```

#### Step 3: Refactor & Deploy
```bash
# Run all tests
npm test

# Deploy to test vault
./ship.sh "feat: description of feature"
```

### 2. Manual Testing in Obsidian

#### Reload Plugin
**Option A: Soft Reload (usually sufficient)**
1. Open Obsidian Settings
2. Community Plugins → Todo Flow
3. Toggle OFF then ON

**Option B: Hard Reload (if caching issues)**
1. Close Obsidian completely
2. Reopen Obsidian
3. Enable plugin

**Option C: Nuclear Option (persistent cache)**
```bash
# Remove plugin completely
rm -rf /Users/i525277/obsidian_test/testing_20260125081145/.obsidian/plugins/todo-flow

# Rebuild and redeploy
./ship.sh "rebuild"

# Reopen Obsidian and enable plugin
```

#### Enable Debug Logging
1. Open Command Palette (`Cmd+P`)
2. Run: `Todo Flow: Toggle Developer Mode`
3. Notification should say "Developer Mode: ON"

#### Reproduce Issue
1. Perform the action (e.g., press `h` to go back)
2. Logs are written to `todo-flow.log` in vault root

#### Read Logs
```bash
# View entire log
cat /Users/i525277/obsidian_test/testing_20260125081145/todo-flow.log

# View last 20 lines
tail -20 /Users/i525277/obsidian_test/testing_20260125081145/todo-flow.log

# Follow logs in real-time
tail -f /Users/i525277/obsidian_test/testing_20260125081145/todo-flow.log
```

### 3. Deployment Automation

#### The `ship.sh` Script
Located at: `/Users/i525277/github/obsidian_plugin_for_todo_flow/ship.sh`

**What it does:**
1. Runs all tests (`npm test`)
2. Builds production bundle (`npm run build`)
3. Copies to test vault (`npm run copy`)
4. Commits changes (`git commit`)
5. Pushes to GitHub (`git push`)

**Usage:**
```bash
# Basic usage
./ship.sh "commit message"

# Examples
./ship.sh "feat: add link parser"
./ship.sh "fix: navigation stack bug"
./ship.sh "test: add edge case coverage"
```

**What gets deployed:**
- `main.js` - Compiled plugin code
- `manifest.json` - Plugin metadata
- Destination: `.obsidian/plugins/todo-flow/` in your target vault.

### 4. Common Issues & Solutions

#### Issue: "Tests pass but feature doesn't work in Obsidian"
**Solution:** Hard reload plugin (see Option B above)

#### Issue: "Logs show old code running"
**Solution:** 
1. Check `main.js` was actually copied: `ls -la /path/to/vault/.obsidian/plugins/todo-flow/`
2. Nuclear option (Option C above)
3. Verify build output: `grep "your-new-code" main.js`

#### Issue: "Can't see console logs"
**Solution:** Use `FileLogger` instead
```typescript
// BAD (invisible in Obsidian)
console.log('debug message');

// GOOD (visible in todo-flow.log)
this.logger.info('debug message');
```

#### Issue: "Tests fail with import errors"
**Solution:** Check `tsconfig.json` and ensure imports use `.js` extension:
```typescript
// CORRECT
import { foo } from './bar.js';

// INCORRECT
import { foo } from './bar';
```

### 5. File Locations Reference

```
Project Root: /Users/i525277/github/obsidian_plugin_for_todo_flow/

Source Code:
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── views/                  # UI components
│   ├── parsers/                # Link parser (Phase 1)
│   └── __tests__/              # Test files

Build Output:
├── main.js                     # Compiled bundle
└── manifest.json               # Plugin metadata

Test Vault:
└── <VAULT_PATH>/
    ├── .obsidian/plugins/todo-flow/  # Deployed plugin
    └── todo-flow.log                  # Debug logs
```

### 6. Git Workflow

```bash
# Check status
git status

# View recent commits
git log --oneline -10

# View changes since last commit
git diff

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Force push (use carefully!)
git push --force
```

---

## Onboarding Checklist

For new developers joining the project:

- [ ] Clone repository: `git clone https://github.com/ivantorok/obsidian_plugin_for_todo_flow.git`
- [ ] Install dependencies: `npm install`
- [ ] Run tests: `npm test`
- [ ] Build plugin: `npm run build`
- [ ] Read `ARCHITECTURE_DECISIONS.md`
- [ ] Read `walkthrough.md` for manual testing guide
- [ ] Set up test vault path in `package.json` (copy script)
- [ ] Run `./ship.sh "test"` to verify deployment works
- [ ] Enable Developer Mode in Obsidian
- [ ] Verify logs appear in `todo-flow.log`

---

## Mobile Development & Gestures

To maintain a native feel on Obsidian Mobile:

### 1. Gesture Isolation & Shadowing
Obsidian Mobile uses edge-swipes for sidebars. To prevent conflicts:
- Use `touch-action: none` (for Triage-style full control) or `touch-action: pan-y` (for Stack-style lists where vertical scroll is still needed).
- **Critical: Gesture Shadowing**: High-level components (like task cards) often have complex gesture handlers (`onpointerdown`, `onpointerup`). Nested interactive elements (like buttons) must explicitly stop propagation of *both* `click` and `pointer` events.
    - **Case Study**: A button's `onclick` with `e.stopPropagation()` clears the click, but the parent's `onpointerdown` might still fire, starting a `tapTimer`. If the click is stopped, the card's `handleTap` (which clears the timer) is never called, leading to a "ghost" long-press.
    - **Fix**: Add `onpointerdown={(e) => e.stopPropagation()}` to internal buttons.
- **StopTouchPropagation**: Why? Obsidian's gesture engine may listen to `touchstart` directly. `PointerEvents` fired by the browser do not stop `TouchEvents` from firing and bubbling. Always call `e.stopPropagation()` and `e.stopImmediatePropagation()` in both `touchstart` and `pointermove` handlers.
- **Native History Binding**: Set `this.navigation = true` in the `ItemView` constructor to enable Obsidian's header back/forward buttons. This is essential for complex navigation like drill-downs to feel native and "undoable".
- **Android Button Stability**: On some Android hardware, interaction-based CSS changes (like `:active` background shifts) can "stick" or lag. 
    - **Guideline**: Follow the **Static Interaction Pattern** in [UX_GOVERNANCE.md](./UX_GOVERNANCE.md). Use static backgrounds and rely on motion/transitions of the parent container for feedback.
    - **Fix**: Explicitly set `-webkit-tap-highlight-color: transparent;` and ensure `:hover/:active` states do not change the background color.

### 2. Touch vs Keyboard Parity
Always provide a touch alternative for keyboard shortcuts:
- **Swipe Right**: Affirmative actions (Confirm, Complete).
- **Swipe Left**: Negative/Dismissive actions (Skip, Archive).
- **Long Press**: Context Menus (use Obsidian's native `Menu` class).
- **Double Tap**: State toggles (Anchor, Favorite).

### 3. TDD for Gestures
Extract threshold math into testable functions.
```typescript
// persistence.ts or logic helper
export function resolveSwipe(deltaX: number, threshold: number) {
    if (deltaX > threshold) return 'right';
    if (deltaX < -threshold) return 'left';
    return 'none';
}
```

---

## Architectural Sovereignty & Interaction Routing

When multiple views or complex UI components coexist, the plugin must manage **Interaction Sovereignty**—ensuring that only the intended component handles user input (shortcuts, gestures).

### 1. Internal State over DOM Reflection
Avoid using DOM states (like CSS classes `.mod-active`) or unstable focus states (`document.activeElement`) for critical routing logic.
- **Problem**: DOM updates are asynchronous and often carry a "paint lag". A keyboard event can fire before the browser reflects a focus change in the CSS tree.
- **Solution**: Use a centralized **Registry/Service** (e.g., `ViewManager`) as the "Source of Truth". Views should query this service to verify if they are authorized to act.

### 2. The "Handshake" Pattern
Replace "Competitive Listening" (where every view guesses if it's active) with an explicit handshake:
1. **Core**: Listens to Obsidian events (`active-leaf-change`) and updates a central `activeViewId`.
2. **View**: In its event listener, it checks: `if (!viewManager.isSovereign(this.leaf.id)) return;`.
This makes interaction routing deterministic and easy to debug in E2E environments.

### 3. The "No-Local-Shortcut" Rule
To prevent race conditions and double-firing, **Svelte templates must never use `onkeydown` for global plugin shortcuts.**
- **Pattern**: The `.ts` view wrapper (e.g., `StackView.ts`) registers a window-level listener.
- **Handshake**: The wrapper checks sovereignty and then calls an exported `handleKeyDown` method on the Svelte component.
- **Benefit**: This eliminates "Hidden Interaction Logic" in templates and ensures that test runners (E2E) have a single, traceable point of failure for input routing.

### 4. Debugging Observability
For features that are hard to verify via UI (like shortcut interception), expose a diagnostic flag.
- **Example**: `window.LAST_SHORTCUT_VIEW = this.getViewType();`
- **Benefit**: E2E tests can immediately assert against a global variable rather than waiting for UI side-effects like file creation or modal appearance.

---

## Tips & Best Practices

1. **Always run tests before deploying**: `./ship.sh` enforces this
2. **Use descriptive commit messages**: Follow conventional commits format
3. **Log liberally during development**: Use `this.logger.info()` for debugging
4. **Clear logs between test runs**: Prevents confusion with old output
5. **Commit frequently**: Small, focused commits are easier to review/revert
6. **Test manually after each feature**: Automated tests don't catch everything
7. **Keep test vault clean**: Regularly reset to known good state

---


### 5. Test Isolation vs. Component Logic
- **Lesson**: Unit tests (Vitest) should test the *component's logic*, not the *React/Svelte framework*.
    - **Anti-Pattern**: Using `fireEvent.keyDown` on a container to test a component's internal handler. This relies on DOM bubbling and framework event delegation, which is often different in a test environment than in Obsidian.
    - **Pattern**: Directly call the component's public methods (e.g., `component.handleKeyDown(mockEvent)`). This isolates the test to the component's logic and makes it robust against DOM changes.

### 7. Test Graduation (Reliability Strategy)
- **Lesson**: E2E tests are inherently flaky on mobile due to Obsidian's indexing and UI lifecycle.
- **Pattern**: If an E2E test fails because "element X did not appear in time" (even after `waitUntil`), **graduate the check to Vitest**. Render the component, mock the command layer, and verify the *reactive state transition* directly. This is 100% reliable and captures the same logic bug.

### 8. The Logic Sync Rule
- **Lesson**: Commands often change the data structure, which causes the controller to re-schedule/re-sort tasks.
- **Rule**: Handlers (Keyboard or Gesture) MUST query the command's `resultIndex` after execution and update the reactive `focusedIndex`. Relying on the "previous index" after a sort leads to phantom selections.

**Last Updated:** 2026-02-10

**Maintained By:** Development Team
