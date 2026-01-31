# Developer Workflow Guide

## Quick Reference

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
git add .
git commit -m "message"
git push
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test src/__tests__/logger.test.ts

# Watch mode (auto-rerun on changes)
npm test -- --watch
```

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
```

### 2. OS-Aware Scripts
- `npm run copy`: Automatically uses `$VAULT_PATH` from your `.env`.
- `./reset_and_launch.sh`: Detects your OS and uses the correct command to launch Obsidian with your configured vault.

### Debugging
```bash
# Enable developer mode in Obsidian
# Command Palette → "Todo Flow: Toggle Developer Mode"

# View logs (replace <VAULT_PATH> with your vault location)
cat <VAULT_PATH>/todo-flow.log

# Clear logs
# Command Palette → "Todo Flow: Clear Log File"
```bash
# Or manually
rm <VAULT_PATH>/todo-flow.log
```
```

---

## Detailed Workflow

### 1. Development Cycle

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

### 1. Gesture Isolation
Obsidian Mobile uses edge-swipes for sidebars. To prevent conflicts:
- Use `touch-action: none` (for Triage-style full control) or `touch-action: pan-y` (for Stack-style lists where vertical scroll is still needed).
- Call `e.stopPropagation()` in `pointerdown` (or `touchstart`) and `pointermove` handlers.
- **Critical**: Use Pointer Events (`onpointerdown`) instead of Touch Events (`ontouchstart`) to ensure compatibility with mouse testing.

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

## Tips & Best Practices

1. **Always run tests before deploying**: `./ship.sh` enforces this
2. **Use descriptive commit messages**: Follow conventional commits format
3. **Log liberally during development**: Use `this.logger.info()` for debugging
4. **Clear logs between test runs**: Prevents confusion with old output
5. **Commit frequently**: Small, focused commits are easier to review/revert
6. **Test manually after each feature**: Automated tests don't catch everything
7. **Keep test vault clean**: Regularly reset to known good state

---

**Last Updated:** 2026-01-25
**Maintained By:** Development Team
