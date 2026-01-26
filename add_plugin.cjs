const fs = require('fs');
const path = 'submission_workspace/obsidian-releases/community-plugins.json';
const content = fs.readFileSync(path, 'utf8');
const data = JSON.parse(content);
data.push({
    "id": "todo-flow-plugin",
    "name": "Todo Flow",
    "author": "Antigravity",
    "description": "Flow-state task management with Rocks and Water logic.",
    "repo": "ivantorok/obsidian_plugin_for_todo_flow"
});
// Sort? Usually they require alphabetical sort? Not strictly, but new entries usually at end or sorted.
// I'll just append for now. Reviewers might ask to sort.
// Actually, I'll sort by name to be nice.
// data.sort((a, b) => a.name.localeCompare(b.name));
// But 'T' is near end.

// Detect indentation
const indent = content.includes('\t') ? '\t' : (content.includes('    ') ? '    ' : '  ');

fs.writeFileSync(path, JSON.stringify(data, null, indent));
console.log('Added plugin to list.');
