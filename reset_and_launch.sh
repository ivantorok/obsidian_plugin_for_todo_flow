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
sleep 1 # Wait for process to exit

echo "[Dev] Disabling Plugin in config..."
# Remove todo-flow from list (using jq or sed if jq not avail, but let's assume simple grep/sed or node since we are in node env)
# We'll use a tiny node script to ensure JSON safety
node -e "
const fs = require('fs');
const path = '$CONFIG_PATH';
let plugins = JSON.parse(fs.readFileSync(path, 'utf8'));
plugins = plugins.filter(p => p !== '$PLUGIN_ID');
fs.writeFileSync(path, JSON.stringify(plugins, null, 2));
"

echo "[Dev] Starting Obsidian (Clean state)..."
# We start it, wait a bit, then enable. 
# Actually, if we launch it now, it will load without the plugin.
obsidian &
PID=$!
echo "[Dev] Obsidian launched (PID: $PID). Waiting 5s for startup..."
sleep 5

echo "[Dev] Enabling Plugin..."
node -e "
const fs = require('fs');
const path = '$CONFIG_PATH';
let plugins = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!plugins.includes('$PLUGIN_ID')) {
    plugins.push('$PLUGIN_ID');
    fs.writeFileSync(path, JSON.stringify(plugins, null, 2));
}
"
echo "[Dev] Plugin enabled in config. You may need to 'Reload Custom Plugins' inside Obsidian if it doesn't auto-pick up, but usually file watch handles it."

# Note: Changing config file while Obsidian is running often triggers a reload of that config.
