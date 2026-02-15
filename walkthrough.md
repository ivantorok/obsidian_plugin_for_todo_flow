# Walkthrough: Empty Stack Regression Fix (v1.2.58)

## 🚨 The Bug
**Symptoms**:
- Desktop users reported an "Empty Stack" (0 tasks) after completing Triage, even though files existed.
- `v1.2.57-debug` logs revealed a **crash** in the `GraphBuilder`.

**Root Cause**:
- The `DateParser` and `title-resolver` utilities were attempting to run regex matches (`.match()`) on task titles.
- If a task title or frontmatter field was a **Number** (e.g., `2024` or `task: 123`), the code crashed with `TypeError: r.match is not a function`.

## 🛠️ The Fix
**Defensive Coding**:
- We now forcibly coerce inputs to Strings before parsing.
- Affected files: `src/utils/DateParser.ts`, `src/utils/title-resolver.ts`.

```typescript
// Before
let title = input;

// After
let title = typeof input === "string" ? input : String(input || "");
```

## 🧪 Verification
**Automated Tests**:
- Created `src/utils/__tests__/DateParser.test.ts`.
- Verified that numeric inputs like `12345` are handled safely without crashing.

**Manual Verification**:
- `v1.2.58` deployed.
- User confirmed the stack now loads correctly.
