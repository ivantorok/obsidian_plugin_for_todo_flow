#!/bin/bash

# Define paths
VAULT_PATH="/home/ivan/Projects/obsidian/20260107"
CONFIG_PATH="$VAULT_PATH/.obsidian/community-plugins.json"
PLUGIN_ID="todo-flow"

echo "[Dev] Building Plugin..."
npm run build
echo "[Dev] Build Complete."

echo "[Dev] Stopping Obsidian..."
pkill obsidian
sleep 2 # Wait for process to exit

echo "[Dev] Ensuring Plugin is enabled in config..."
# We use node to safely add the plugin ID before Obsidian starts
node -e "
const fs = require('fs');
const path = '$CONFIG_PATH';
let plugins = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!plugins.includes('$PLUGIN_ID')) {
    plugins.push('$PLUGIN_ID');
    fs.writeFileSync(path, JSON.stringify(plugins, null, 2));
}
"

echo "[Dev] Starting Obsidian..."
obsidian &
PID=$!
echo "[Dev] Obsidian launched (PID: $PID)."
echo "[Dev] Plugin enabled in config. You may need to 'Reload Custom Plugins' inside Obsidian if it doesn't auto-pick up, but usually file watch handles it."

# Note: Changing config file while Obsidian is running often triggers a reload of that config.
