# Test Conflict Analysis Results

## Root Cause: Missing Cleanup Hooks

The programmatic analysis revealed that **20 out of 23 tests are missing proper `afterEach` cleanup hooks**. While many tests have `afterEach` blocks, they only log output and don't clean up vault state.

## Specific Issue: mobile_reordering.spec.ts

### Why It's Failing

The `mobile_reordering.spec.ts` test is likely failing because:

1. **Alphabetical Test Execution**: WebdriverIO runs tests alphabetically
2. **Previous Test State**: `mobile_gestures.spec.ts` runs BEFORE `mobile_reordering.spec.ts`
3. **Shared Resources**: Both tests:
   - Use touch/pointer gestures
   - Create tasks in the vault
   - Modify the same DOM elements
4. **No Cleanup**: Neither test properly cleans up the vault state in `afterEach`

### Evidence

```typescript
// mobile_reordering.spec.ts line 13-17
afterEach(async function () {
    const logs = await browser.execute(() => (window as any)._logs || []);
    console.log('[Browser Logs (window._logs)]');
    logs.forEach((log: string) => console.log(log));
});
```

**This only logs - it doesn't clean up files, tasks, or vault state!**

### Test Execution Order (Alphabetical)

```
atomic_navigation.spec.ts
bug_007_verify.spec.ts
bug_008_verify.spec.ts
bug_009_verify.spec.ts
drill-down.spec.ts (EXCLUDED)
functional.spec.ts
journey_a.spec.ts
journey_d.spec.ts
journey_e.spec.ts
link_injection.spec.ts
mobile-add-task.spec.ts
mobile-duration.spec.ts
mobile_gestures.spec.ts    ← Runs BEFORE mobile_reordering
mobile_reordering.spec.ts  ← FAILS due to leftover state
persistence.spec.ts
...
```

## Recommendations

### Option 1: Add Proper Cleanup (Best Practice)
Add vault cleanup to `afterEach` in all mobile tests:
```typescript
afterEach(async function () {
    // Clean up vault
    await browser.execute(async () => {
        const adapter = app.vault.adapter;
        const todoFlowDir = 'todo-flow';
        if (await adapter.exists(todoFlowDir)) {
            const files = await adapter.list(todoFlowDir);
            for (const file of files.files) {
                await adapter.remove(file);
            }
        }
    });
    
    // Log output
    const logs = await browser.execute(() => (window as any)._logs || []);
    console.log('[Browser Logs]');
    logs.forEach((log: string) => console.log(log));
});
```

### Option 2: Add to Flaky Test List (Quick Fix)
Since the test is environmentally sensitive due to state pollution:
1. Add `mobile_reordering.spec.ts` to `wdio.conf.mts` exclude list
2. Add to `test:flaky` command
3. Document in `flaky_test_protocol.md`

### Option 3: Force Sequential Execution with Cleanup
Ensure mobile tests run in isolation by adding a global `afterEach` hook that reloads Obsidian fresh for each test.

## Impact Analysis

**Tests Affected by Missing Cleanup**: 20/23
**Tests Sharing CurrentStack.md**: 5 (high conflict potential)
**Tests with Proper Cleanup**: 3 (bug_009_verify.spec.ts, mobile_gestures.spec.ts, functional.spec.ts)

This is a **systemic issue** affecting test reliability across the entire suite.
