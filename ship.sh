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
git push

echo "✅ Shipped!"
