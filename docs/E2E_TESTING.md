# End-to-End (E2E) Testing Guide

This project uses **WebdriverIO** with the **`wdio-obsidian-service`** for cross-platform E2E testing. This setup allows us to run tests on macOS, Linux, and Windows without manual intervention and solves common issues like the "Trust this vault" prompt.

---

## 🚀 Quick Start

### Run Automated Tests
Runs the full suite of automated tests.

```bash
npm run e2e
```

### Manual Mode (Development)
Launches an isolated Obsidian instance with the plugin loaded, **bypassing the trust prompt**.

```bash
npm run e2e:open
```
*Press `Ctrl+C` in the terminal to stop.*

---

## 🛠️ Infrastructure Overview

We chose **WebdriverIO** over Playwright/Electron for the following reasons:

1.  **wdio-obsidian-service**: An official WebdriverIO service specifically for Obsidian plugins.
2.  **Cross-Platform**: Works seamlessly on macOS (bypassing Gatekeeper/SIP issues), Linux, and Windows.
3.  **Automatic Management**: Automatically downloads the correct Obsidian binary and ChromeDriver version.
4.  **Mobile Support**: Has built-in support for Android testing (future proofing).

### Comparison: Why not Playwright?

| Feature | Playwright | WebdriverIO + `wdio-obsidian-service` |
| :--- | :--- | :--- |
| **macOS Support** | ❌ Difficult (Security/SIP issues) | ✅ Native support |
| **Binary Mgmt** | ❌ Manual download required | ✅ Auto-downloaded |
| **Obsidian API** | ❌ Requires custom IPC | ✅ Built-in helpers |
| **Trust Prompt** | ❌ Hard to bypass | ✅ Native bypass |

---

## 📂 Project Structure

```
.
├── wdio.conf.mts             # Main WebdriverIO configuration
├── tests/
│   └── e2e/
│       ├── smoke.spec.ts     # Automated smoke tests
│       ├── manual-open.spec.ts # Spec for manual testing (keeps session open)
│       └── setup-vault.ts    # Script to prepare the test vault
├── .test-vault/              # The E2E test vault (auto-generated)
└── .obsidian-cache/          # Cached Obsidian versions (downloaded by WDIO)
```

---

## 🧪 writing Tests

Tests are written in **TypeScript** using the **Mocha** framework syntax (`describe`, `it`).

### Example Test (`smoke.spec.ts`)

```typescript
import { browser, expect } from '@wdio/globals';

describe('My Feature', () => {
    it('should do something amazing', async () => {
        // Selenium-style selection
        const button = await $('.my-button-class'); 
        await button.click();

        // Jest-style assertions
        await expect(button).toExist();
    });
});
```

### Useful Commands

-   **`browser.reloadObsidian({ vault: '...' })`**: Restart Obsidian with a specific vault.
-   **`browser.execute(...)`**: Run JavaScript inside the Obsidian process.

---

## 🔧 Troubleshooting

### "Trust this vault" Prompt Appears
If you see this prompt during `npm run e2e:open`, ensure you are using the correct command.
**DO NOT** run the test script directly. The `e2e:open` command uses a special internal spec (`manual-open.spec.ts`) that leverages the WebdriverIO infrastructure to bypass the prompt.

### "Obsidian binary not found"
Delete the cache directory to force a re-download:
```bash
rm -rf .obsidian-cache
```

### Logs
-   **Test Output**: Printed to the terminal.
-   **Obsidian Logs**: Check `.test-vault-launch.log` (if generated) or standard output.

---

## 🤖 CI/CD Integration

This setup is ready for GitHub Actions.

**Sample Workflow Step:**
```yaml
- name: Run E2E Tests
  run: npm run e2e
  env:
    CI: true

---

## 🎓 Lessons Learned & Gotchas

### 1. Git Hooks & WDIO
The `husky` pre-push hook can conflict with WebdriverIO if parameters or stdin are passed incorrectly.
*   **Issue 1 (Arguments)**: Git passes branch references as positional arguments, causing WDIO to think they are test files (e.g., `Error: spec file(s) refs/heads/main not found`).
*   **Issue 2 (Stdin)**: Git pipes commit information into the hook's stdin. The WebdriverIO CLI reads stdin and attempts to parse it as file names.
*   **Fix**: Isolate the test execution by clearing arguments and redirecting stdin.
    ```bash
    # Inside .husky/pre-push
    set --               # Clear $1, $2...
    npm run e2e < /dev/null
    ```

### 2. Large Binary Files (.obsidian-cache)
WebdriverIO (via `wdio-obsidian-service`) downloads a full Electron/Obsidian binary to `.obsidian-cache`.
*   **Critical**: This directory **MUST** be in `.gitignore`. The binary is ~300MB+ and will be rejected by GitHub (File size limit: 100MB).
*   **Fix**: Add `.obsidian-cache/` to `.gitignore` and ensure it's removed from the git index (`git rm -r --cached .obsidian-cache`).

### 3. Test Runner Separation
We use **Vitest** for unit tests and **WebdriverIO** for E2E.
*   **Conflict**: If Vitest is configured to run all files in `tests/`, it might try to execute WDIO specs, causing "ReferenceError: browser is not defined".
*   **Fix**: Explicitly exclude E2E directories in `vitest.config.ts`:
    ```typescript
    exclude: ['**/node_modules/**', 'tests/e2e/**']
    ```

### 10. WDIO Exclude Path Sensitivity
The `exclude` array in `wdio.conf.mts` is highly sensitive to path prefixes when running via `ship.sh`.
- **Constraint**: Use absolute-style globs (e.g., `tests/e2e/legacy/**/*.spec.ts`) **without** the `./` prefix. Using `./tests/...` can cause the runner to ignore the exclusion on certain environments (specifically the 8GB Lubuntu test-vault runner).

### 4. Manual Testing Magic
The `npm run e2e:open` command is NOT just a shortcut for `obsidian .test-vault`.
*   It uses WebdriverIO to launch the app.
*   **Why?**: This is the **only reliable way** to programmatically bypass the "Trust this vault" prompt on macOS/Linux without manual clicks.
*   It runs a special spec (`manual-open.spec.ts`) that simply hangs open for an hour.

### 5. Mobile Interaction Robustness
Testing in emulated mobile modes (e.g., `is-mobile`) can be flaky with standard `.click()` calls due to pointer-event emulation.
*   **Fix**: Use `browser.execute((el) => (el as HTMLElement).click(), element)` for direct interaction with small interactive elements like +/- buttons.
*   **Sequence Verification**: When testing lists or sequences (like durations), always source the expected values from the actual shared constants (e.g., `DURATION_SEQUENCE` in `StackController.ts`) to avoid "expected 15m received 20m" type failures when logic changes.

### 6. Component Initialization vs. Leaf Readiness
Tests can be extremely flaky if they assume a view is fully ready just because Obsidian's `app.workspace.getLeavesOfType()` returns a leaf.
*   **Gotcha**: The Obsidian View wrapper might exist, but the underlying Svelte component (`view.component`) might still be mounting.
*   **Fix**: Explicitly check that `view.component` exists before dispatching commands, changing state, or querying the UI.

### 7. Sovereign State Management in Views
When an Obsidian View (e.g., `StackView.ts`) wraps a reactive UI (like Svelte), relying solely on the UI's internal state (or querying it via `getViewMode()`) for the source of truth can lead to race conditions during rapid test execution or external sync pulses.
*   **Gotcha**: The view might briefly unmount/remount or receive a `setState` call from Obsidian, resetting the UI to a default state before it can report its actual mode.
*   **Fix**: The TypeScript View class must maintain sovereign ownership of its state (e.g., `private currentViewMode`) and push it deterministically to the UI, rather than implicitly inheriting or defaulting it.

### 8. Mocha Timeouts and Contexts
WebdriverIO tests running concurrently can starve each other for CPU cycles, especially in CI or when running the full suite locally.
*   **Gotcha**: A complex interaction test (like holding a pointer for 500ms, waiting for a file sync, and verifying the DOM) might easily exceed Mocha's default 90s timeout under load.
*   **Fix**: Use `this.timeout(180000)` inside the `it()` block for specific heavy tests. **Crucially**, this requires using a standard `function () {}` instead of an arrow function `() => {}` in Mocha to access the `this` context.

### 9. Initial State Assertions with `waitUntil`
Do not use `expect(val).toBe(true)` for the initial read of a reactive state (like `data-persistence-idle`) immediately after a view loads in an E2E test.
*   **Gotcha**: The vault may still be indexing or performing initial IO, causing temporary state fluctuations before settling into the "idle" state. A strict `expect` will fail the test immediately.
*   **Fix**: Always use robust polling for initial states: `await browser.waitUntil(async () => { return await el.getAttribute('data-sync') === 'idle'; }, { timeout: 10000 });`

