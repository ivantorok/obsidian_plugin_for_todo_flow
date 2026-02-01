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
```
