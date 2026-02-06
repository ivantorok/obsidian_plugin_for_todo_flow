import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagePath = path.resolve(__dirname, '../package.json');
const manifestPath = path.resolve(__dirname, '../manifest.json');
const versionsPath = path.resolve(__dirname, '../versions.json');

// 1. Read package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = pkg.version;
console.log(`Current version: ${currentVersion}`);

// 2. Increment patch version
const parts = currentVersion.split('.').map(Number);
parts[2] += 1;
const newVersion = parts.join('.');
console.log(`New version: ${newVersion}`);

// 3. Update package.json
pkg.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

// 4. Update manifest.json
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

// 5. Update versions.json
const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
versions[newVersion] = manifest.minAppVersion;
fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 4) + '\n');

console.log(`✅ Bumped version to ${newVersion} in package.json, manifest.json, and versions.json`);
