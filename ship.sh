#!/bin/bash
set -e

echo "🚢 Shipping Todo Flow..."

# Pre-flight Checklist: Agentic Orchestration
echo "🔍 Checking Technical Justification..."
HAS_LOG=$(find docs/backlog -name "*.md" -not -name "TEMPLATE.md" -mmin -60 | wc -l)
HAS_WALKTHROUGH=$(find . -name "walkthrough.md" -mmin -60 | wc -l)

if [ "$HAS_LOG" -eq 0 ] && [ "$HAS_WALKTHROUGH" -eq 0 ]; then
    echo "⚠️  WARNING: No recent backlog entry or walkthrough found."
    echo "   Autonomous agents MUST provide technical justification for changes."
    read -p "Do you want to proceed anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 0. Increment Version
echo "📈 Incrementing Version..."
node scripts/version_bump.mjs

# 1. Build & Deploy (Internal)
echo "🏗️ Building..."
npm run build

# 2. Run Tests (Full Suite)
echo "🧪 Running Full Test Suite (Unit + Golden + E2E)..."
npm run test:full

# 3. Tagging (Fix for BRAT/Registry)
VERSION=$(grep '"version":' manifest.json | head -n 1 | cut -d '"' -f 4)
echo "📈 Versioning v$VERSION..."

# 4. Commit & Push
echo "📦 Committing & Pushing..."
git add .
MSG="${1:-chore: auto-ship v$VERSION}"
git commit -m "$MSG"

echo "🏷️ Tagging v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

# 5. Push & Release
echo "🚀 Pushing Tags & Creating GitHub Release..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$CURRENT_BRANCH" --no-verify
git push origin "v$VERSION" --no-verify

# Create GitHub Release with assets (required for BRAT)
if command -v gh &> /dev/null; then
    echo "📦 Creating GitHub Release v$VERSION..."
    # CRITICAL: We MUST upload main.js, manifest.json, and styles.css for BRAT to work.
    gh release create "v$VERSION" main.js manifest.json styles.css --title "v$VERSION" --notes "Automated release v$VERSION"
else
    echo "❌ ERROR: gh CLI not found. Release failed!"
    echo "⚠️  The code has been pushed and tagged, but the GitHub Release was NOT created."
    echo "⚠️  You MUST manually create the release and upload 'main.js', 'manifest.json', and 'styles.css'."
    exit 1
fi

echo "✅ Shipped v$VERSION!"
