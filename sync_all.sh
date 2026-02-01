#!/bin/bash

# sync_all.sh - Syncs plugin to all configured local vaults

# Load environment variables if .env exists
if [ -f .env ]; then
    # Source .env instead of export to handle spaces in paths
    source .env
fi

echo "🔍 Syncing Todo Flow plugin to configured vaults..."

# Check if LOCAL_VAULTS is defined in .env
if [ -n "$LOCAL_VAULTS" ]; then
    echo "📋 Using vaults from .env: LOCAL_VAULTS"
    
    # Use eval to properly handle quoted paths
    eval "VAULT_ARRAY=($LOCAL_VAULTS)"
    
    for VAULT_PATH in "${VAULT_ARRAY[@]}"; do
        PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/todo-flow"
        
        if [ -d "$PLUGIN_DIR" ]; then
            echo "📦 Syncing to: $PLUGIN_DIR"
            cp main.js styles.css manifest.json "$PLUGIN_DIR/"
        else
            echo "⚠️  Skipping $VAULT_PATH (plugin not installed)"
        fi
    done
    
    echo "✅ All configured vaults synced!"
else
    echo "⚠️  LOCAL_VAULTS not defined in .env"
    echo "🔍 Falling back to auto-discovery (searching home directory)..."
    
    # Fallback: Find all vaults with todo-flow installed
    VAULTS=$(find ~ -maxdepth 5 -name todo-flow -type d -path "*/.obsidian/plugins/todo-flow" 2>/dev/null)
    
    if [ -z "$VAULTS" ]; then
        echo "⚠️  No vaults found with todo-flow plugin installed."
        exit 0
    fi
    
    for VAULT_PLUGIN_DIR in $VAULTS; do
        echo "📦 Syncing to: $VAULT_PLUGIN_DIR"
        cp main.js styles.css manifest.json "$VAULT_PLUGIN_DIR/"
    done
    
    echo "✅ All discovered vaults synced!"
fi
