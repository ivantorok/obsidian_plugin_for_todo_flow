# Release Workflow

This document outlines the release process for the **Todo Flow** plugin. 

## Automated Release (Recommended)

We use the `ship.sh` script to automate the entire process. This script ensures that:
1.  The version is bumped in `package.json`, `manifest.json`, and `versions.json`.
2.  The project is built (`main.js`, `styles.css`).
3.  Tests are run.
4.  Changes are committed and tagged.
5.  A GitHub Release is created **with the required assets**.

### Prerequisites
- **GitHub CLI (`gh`)**: Must be installed and authenticated (`gh auth login`).
- **Clean Working Directory**: Commit any pending changes before running.

### Usage
```bash
./ship.sh "optional commit message"
```

---

## Manual Release (Fallback)

If `ship.sh` fails or you need to release manually, follow these **CRITICAL** steps to ensure BRAT compatibility.

### 1. Update Version
Increment the version number in:
- `package.json`
- `manifest.json`
- `versions.json` (add new entry)

### 2. Build
Run the build to generate the latest assets:
```bash
npm run build
```

### 3. Commit & Tag
```bash
git add .
git commit -m "chore: release v1.x.x"
git tag -a "v1.x.x" -m "Release v1.x.x"
git push origin main --follow-tags
```

### 4. Create GitHub Release (CRITICAL)
**BRAT only updates if specific assets are attached to the release.**

1.  Go to [GitHub Releases](https://github.com/ivantorok/obsidian_plugin_for_todo_flow/releases).
2.  Draft a new release.
3.  Select the tag you just created (e.g., `v1.x.x`).
4.  **Upload Assets**: You **MUST** upload these three files from your project root:
    - `main.js`
    - `manifest.json`
    - `styles.css`
5.  Publish the release.
