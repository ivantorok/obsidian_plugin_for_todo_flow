#!/bin/bash

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Define paths
DEFAULT_VAULT="${VAULT_PATH:-/Users/i525277/DemoVault}"
VAULT_PATH="${1:-$DEFAULT_VAULT}"
CONFIG_PATH="$VAULT_PATH/.obsidian/community-plugins.json"
PLUGIN_ID="todo-flow"

echo "[Dev] Building Plugin..."
npm run build
echo "[Dev] Build Complete."

echo "[Dev] Stopping Obsidian..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    pkill -x Obsidian
else
    pkill obsidian
fi
sleep 2 # Wait for process to exit

echo "[Dev] Ensuring Plugin is enabled in config..."
# We use node to safely add the plugin ID before Obsidian starts
node -e "
const fs = require('fs');
const path = '$CONFIG_PATH';
try {
    if (fs.existsSync(path)) {
        let plugins = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (!plugins.includes('$PLUGIN_ID')) {
            plugins.push('$PLUGIN_ID');
            fs.writeFileSync(path, JSON.stringify(plugins, null, 2));
        }
    }
} catch (e) {
    console.log('[Dev] Could not update community-plugins.json: ' + e.message);
}
"

echo "[Dev] Starting Obsidian..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a Obsidian --args "$VAULT_PATH" &
else
    obsidian "$VAULT_PATH" &
fi
PID=$!
echo "[Dev] Obsidian launched (PID: $PID) with vault: $VAULT_PATH"
echo "[Dev] Plugin enabled in config. You may need to 'Reload Custom Plugins' inside Obsidian if it doesn't auto-pick up, but usually file watch handles it."
