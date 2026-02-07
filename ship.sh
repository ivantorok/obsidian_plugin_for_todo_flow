#!/bin/bash
set -e

echo "🚢 Shipping Todo Flow..."

# 0. Increment Version
echo "📈 Incrementing Version..."
node scripts/version_bump.mjs

# 1. Run Tests
echo "🧪 Running Tests..."
npm run test -- --run

# 2. Build & Deploy (Copy)
echo "🏗️ Building & Deploying..."
npm run build

# 3. Commit & Push
echo "📦 Committing & Pushing..."
git add .
# Use the first argument as commit message, or default
MSG="${1:-chore: auto-ship updates}"
git commit -m "$MSG"

# 4. Tagging (Fix for BRAT/Registry)
VERSION=$(grep '"version":' manifest.json | head -n 1 | cut -d '"' -f 4)
echo "🏷️ Tagging v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

git push origin main
git push origin "v$VERSION"

echo "✅ Shipped v$VERSION!"
