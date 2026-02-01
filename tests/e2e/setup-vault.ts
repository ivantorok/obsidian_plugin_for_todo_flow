import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vaultPath = path.resolve(__dirname, '../../.test-vault');
const pluginId = 'todo-flow';
const pluginSourcePath = path.resolve(__dirname, '../../');
const pluginDestPath = path.join(vaultPath, '.obsidian', 'plugins', pluginId);

async function stopObsidian() {
    console.log('Stopping existing Obsidian instances...');
    try {
        if (os.platform() === 'darwin') {
            execSync('pkill -x Obsidian || true');
        } else if (os.platform() === 'linux') {
            execSync('pkill obsidian || true');
        }
        // Wait a bit for processes to fully exit
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
        console.warn('Warning: Could not stop Obsidian:', e);
    }
}

async function setupVault() {
    await stopObsidian();

    console.log(`[E2E Setup] Initializing vault at: ${vaultPath}`);

    // 1. Create vault structure if it doesn't exist
    if (!fs.existsSync(vaultPath)) {
        console.log(`[E2E Setup] Creating vault directory: ${vaultPath}`);
        fs.mkdirSync(vaultPath, { recursive: true });
    }

    const obsidianPath = path.join(vaultPath, '.obsidian');
    if (!fs.existsSync(obsidianPath)) {
        console.log(`[E2E Setup] Creating .obsidian directory: ${obsidianPath}`);
        fs.mkdirSync(obsidianPath, { recursive: true });
    }

    const pluginsPath = path.join(obsidianPath, 'plugins');
    if (!fs.existsSync(pluginsPath)) {
        console.log(`[E2E Setup] Creating plugins directory: ${pluginsPath}`);
        fs.mkdirSync(pluginsPath, { recursive: true });
    }

    // 2. Create/Update community-plugins.json to "enable" our plugin
    const communityPluginsPath = path.join(obsidianPath, 'community-plugins.json');
    let plugins = [];
    if (fs.existsSync(communityPluginsPath)) {
        try {
            plugins = JSON.parse(fs.readFileSync(communityPluginsPath, 'utf8'));
            console.log(`[E2E Setup] Existing plugins found: ${plugins.join(', ')}`);
        } catch (e) {
            console.warn('[E2E Setup] Warning: Could not parse community-plugins.json, resetting.');
        }
    }
    if (!plugins.includes(pluginId)) {
        console.log(`[E2E Setup] Enabling plugin: ${pluginId}`);
        plugins.push(pluginId);
    }
    fs.writeFileSync(communityPluginsPath, JSON.stringify(plugins, null, 2));
    console.log(`[E2E Setup] Community plugins config updated at: ${communityPluginsPath}`);

    // 3. Create core-plugins.json to ensure workspace is clean
    const corePluginsPath = path.join(obsidianPath, 'core-plugins.json');
    if (!fs.existsSync(corePluginsPath)) {
        console.log(`[E2E Setup] Initializing empty core-plugins.json`);
        fs.writeFileSync(corePluginsPath, JSON.stringify([], null, 2));
    }

    // 4. Copy plugin files
    if (!fs.existsSync(pluginDestPath)) {
        console.log(`[E2E Setup] Creating plugin destination: ${pluginDestPath}`);
        fs.mkdirSync(pluginDestPath, { recursive: true });
    }

    const filesToCopy = ['main.js', 'styles.css', 'manifest.json'];
    for (const file of filesToCopy) {
        const src = path.join(pluginSourcePath, file);
        const dest = path.join(pluginDestPath, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`[E2E Setup] Copied ${file} to vault plugins.`);
        } else {
            console.warn(`[E2E Setup] Warning: ${src} not found. Build may be missing.`);
        }
    }

    // 5. Create a dummy test file
    const testFile = path.join(vaultPath, 'Test.md');
    if (!fs.existsSync(testFile)) {
        console.log(`[E2E Setup] Creating Test.md file.`);
        fs.writeFileSync(testFile, '# Test Node\n\n- [ ] Task 1\n- [ ] Task 2');
    }

    // 6. Create config.json in .obsidian to mark plugins as trusted
    const vaultConfigPath = path.join(obsidianPath, 'config.json');
    console.log(`[E2E Setup] Creating vault config to trust plugins...`);
    const vaultConfig = {
        communityPluginSortOrder: 'alphabetical',
        enabledPlugins: [pluginId],
        pluginEnabledStatus: {
            [pluginId]: true
        }
    };
    fs.writeFileSync(vaultConfigPath, JSON.stringify(vaultConfig, null, 2));
    console.log(`[E2E Setup] Vault config created at: ${vaultConfigPath}`);

    // 7. Create app.json in .obsidian to disable safe mode
    const vaultAppConfigPath = path.join(obsidianPath, 'app.json');
    console.log(`[E2E Setup] Creating vault app.json to disable safe mode...`);
    const vaultAppConfig = {
        isSafeMode: false
    };
    fs.writeFileSync(vaultAppConfigPath, JSON.stringify(vaultAppConfig, null, 2));
    console.log(`[E2E Setup] Vault app.json created at: ${vaultAppConfigPath}`);

    console.log('[E2E Setup] --- Vault initialization complete ---');
}

setupVault().catch(console.error);
