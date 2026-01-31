#!/bin/bash

# sync_all.sh - Finds all Obsidian vaults with todo-flow installed and updates them.

echo "🔍 Finding Obsidian vaults with Todo Flow..."

# Get the list of todo-flow plugin directories
# We look for .obsidian/plugins/todo-flow in home directory
VAULTS=$(find ~ -name todo-flow -type d -path "*/.obsidian/plugins/todo-flow" 2>/dev/null)

if [ -z "$VAULTS" ]; then
    echo "⚠️ No vaults found with todo-flow plugin installed."
    exit 0
fi

for VAULT_PLUGIN_DIR in $VAULTS; do
    echo "📦 Syncing to: $VAULT_PLUGIN_DIR"
    cp main.js styles.css manifest.json "$VAULT_PLUGIN_DIR/"
done

echo "✅ All vaults synced!"
