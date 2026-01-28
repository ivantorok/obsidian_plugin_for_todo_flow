# Contributing Guide

## Collaboration Workflow

To ensure we don't interfere with each other's work, we follow a strict **Feature Branch Workflow**.

### 1. Never Commit Directly to `main`
The `main` branch should always contain stable, deployable code. Avoid pushing directly to it.

### 2. Create a Branch for Every Task
Before starting any work, create a new branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

### 3. Commit and Push
Work on your branch and push it to the repository:

```bash
git add .
git commit -m "feat: add new feature"
git push -u origin feature/my-new-feature
```

### 4. Create a Pull Request (PR)
Go to GitHub and open a Pull Request to merge your branch into `main`.

**Using the website:**
Push your branch and click the link in the terminal output.

**Using GitHub CLI (`gh`):**
```bash
gh pr create --fill
# or to open in browser
gh pr create --web
```

## Best Practices for Clarity
To avoid "getting lost in branches" and maintain a TDD-like flow:
- **Keep branches short-lived**: Merge often (e.g., daily or per small feature).
- **Small PRs**: Easy to review, less conflict risk.
- **Delete after merge**: Keep the repo clean.

## Branch Naming Convention
- `feature/name`: For new features
- `fix/name`: For bug fixes
- `chore/name`: For maintenance tasks (dependencies, gitignore, etc.)
- `docs/name`: For documentation changes
