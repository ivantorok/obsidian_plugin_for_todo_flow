#!/bin/bash
set -e

echo "🚢 Shipping Todo Flow..."

# 0. Increment Version
echo "📈 Incrementing Version..."
node scripts/version_bump.mjs

# 1. Run Tests (Full Suite)
echo "🧪 Running Full Test Suite (Unit + Golden + E2E)..."
npm run test:full

# 2. Build & Deploy (Copy)
echo "🏗️ Building & Deploying..."
npm run build

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

# Use --no-verify because we ALREADY ran tests above. 
# This skips the redundant Husky pre-push hook.
git push origin main --no-verify
git push origin "v$VERSION" --no-verify

echo "✅ Shipped v$VERSION!"
