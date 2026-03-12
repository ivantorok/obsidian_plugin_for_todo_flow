# Developer Environment Setup

## Browser Sandbox Permissions
When running Antigravity or browser-based tests on a local machine, the Browser Subagent may require your permission to access local files (e.g., logs in the `.test-vault`). Chrome's security sandbox triggers an "Allow directory access" prompt.

### 🛑 Avoiding Manual Prompts
If you are working remotely (e.g., via Chrome Remote Desktop) or want a frictionless experience, you can suppress these prompts using one of the following methods:

#### 1. Chrome Managed Policy (Recommended)
Add a policy rule to Chrome's managed settings to trust your local Antigravity instance.

1. Create the policy directory:
   ```bash
   sudo mkdir -p /etc/opt/chrome/policies/managed
   ```
2. Create the permission file:
   ```bash
   sudo nano /etc/opt/chrome/policies/managed/antigravity_access.json
   ```
3. Paste the following configuration (replace `http://localhost:XXXX` with your instance URL):
   ```json
   {
     "FileReadAllowedForUrls": ["http://localhost:XXXX"],
     "FileWriteAllowedForUrls": ["http://localhost:XXXX"]
   }
   ```
4. Restart Chrome.

#### 2. Launch Flags (Quickest Fix)
Start Chrome with the following flag:
```bash
--allow-file-access-from-files
```

#### 3. Use Terminal Tools
When possible, instruct the agent to "Read the logs using the terminal" instead of opening the folder in the browser. This uses the Filesystem MCP which bypasses the browser sandbox entirely.

---

## Log Access Conventions
To avoid permission prompts altogether, always favor accessing logs through symlinks within the project root.

1. **Always** symlink internal/external logs into the `logs/` directory.
2. **Never** access hidden or system-restricted paths directly if a symlink alternative exists.
3. Example:
   ```bash
   ln -s /path/to/external/debug.log logs/obsidian_debug.log
   ```
