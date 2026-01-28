# Contributing to Todo Flow

Welcome! This guide outlines our workflow to ensure the repository remains stable, clean, and easy for both of us to work on simultaneously.

## 🚀 Workflow: Feature Branches

To avoid merge conflicts and keep `main` stable (green), we use a **Feature Branch Workflow**.

1.  **Never commit directly to `main`**.
2.  Create a short-lived branch for every task:
    *   `feature/new-button`
    *   `fix/nlp-bug`
    *   `chore/update-readme`
3.  **TDD Always**: Ensure existing tests pass before pushing.
4.  **Pull Requests**: Open a PR to merge your branch into `main`. 

## 🧪 Testing Guidelines

Before submitting a PR, please run the full test suite locally:

```bash
npm run test
```

We aim for "Green on Main"—if a branch breaks the tests, we fix it on the branch before merging.

## 🧹 Git Hygiene

*   **Node Modules**: We do NOT track `node_modules`. If you see them in your `git status`, check the `.gitignore`.
*   **Commit Messages**: Use clear, descriptive summaries (e.g., `feat: add undo for renames`).

## 🛠 Reloading the Plugin

To test your changes in Obsidian, use the reload script:

```bash
./reset_and_launch.sh
```

This will build the plugin, restart Obsidian, and ensure everything is active.
