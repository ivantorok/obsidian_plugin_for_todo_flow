#!/bin/bash

# refresh.sh - Builds the plugin and restarts Obsidian without purging the vault.

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Use VAULT_PATH from .env or default to DemoVault
DEFAULT_VAULT="${VAULT_PATH:-/Users/i525277/DemoVault}"
VAULT_PATH="${1:-$DEFAULT_VAULT}"

echo "🔄 Refreshing Todo Flow..."

# 1. Build the plugin
echo "🏗️ Building..."
npm run build

# 2. Restart Obsidian
echo "🚀 Restarting Obsidian with vault: $VAULT_PATH"

if [[ "$OSTYPE" == "darwin"* ]]; then
    pkill -x Obsidian || true
    sleep 1
    open -a Obsidian --args "$VAULT_PATH"
else
    pkill obsidian || true
    sleep 1
    obsidian "$VAULT_PATH" &
fi

echo "✅ Refresh complete!"
