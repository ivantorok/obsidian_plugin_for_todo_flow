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

### 4. Manual Testing Magic
The `npm run e2e:open` command is NOT just a shortcut for `obsidian .test-vault`.
*   It uses WebdriverIO to launch the app.
*   **Why?**: This is the **only reliable way** to programmatically bypass the "Trust this vault" prompt on macOS/Linux without manual clicks.
*   It runs a special spec (`manual-open.spec.ts`) that simply hangs open for an hour.

```
