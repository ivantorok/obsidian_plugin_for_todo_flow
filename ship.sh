#!/bin/bash
set -e

echo "🚢 Shipping Todo Flow..."

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
    gh release create "v$VERSION" main.js manifest.json styles.css --title "v$VERSION" --notes "Automated release v$VERSION" || echo "⚠️ Release already exists or failed."
else
    echo "⚠️ gh CLI not found. Please create the release manually."
fi

echo "✅ Shipped v$VERSION!"
