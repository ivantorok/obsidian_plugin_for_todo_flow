import fs from 'fs';

const pages = [
  { id: 'primitives', title: 'Primitives Lab', component: './prototypes/PrimitivesStorybook.svelte', props: {} },
  { id: 'dump-shadow', title: 'Dump Mode (Shadow)', component: './prototypes/ShadowDump.svelte', props: {} },
  { id: 'dump-hardshell', title: 'Dump Mode (Hard Shell)', component: '../src/views/DumpViewHardShell.svelte', props: '{ app: {}, folder: "sandbox", logger: { info: () => {} } }' },
  { id: 'triage-shadow', title: 'Triage Mode (Shadow)', component: './prototypes/ShadowTriage.svelte', props: '{ title: "Process: New Plugin Idea" }' },
  { id: 'triage-hardshell', title: 'Triage Mode (Hard Shell)', component: '../src/views/TriageViewHardShell.svelte', props: '{ tasks: [{ title: "Process: New Plugin Idea", id: "task1" }], app: {} }' },
  { id: 'stack-shadow', title: 'Stack Mode (Architect)', component: './prototypes/ShadowStack.svelte', props: {} },
  { id: 'detailed-view', title: 'Detailed View (Modal)', component: './prototypes/DetailedTaskView.svelte', props: {} }
];

const htmlTemplate = (id, title) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} - Prototype</title>
    <style>
        :root {
            --font-interface: 'Inter', sans-serif;
            --font-monospace: 'JetBrains Mono', monospace;
            --background-primary: #1e1e1e;
            --background-secondary: #111;
            --text-normal: #dcddde;
            --interactive-accent: #75abd0;
        }
        body {
            background: var(--background-secondary);
            color: var(--text-normal);
            font-family: var(--font-interface);
            padding: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        .header a { color: #888; text-decoration: none; font-size: 14px; }
        .header a:hover { color: #fff; }
        .mobile-jail {
            width: 360px;
            height: 780px;
            background: var(--background-primary);
            border: 12px solid #222;
            border-radius: 40px;
            overflow: hidden;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8);
            position: relative;
        }
        #app { height: 100%; overflow: hidden; }
    </style>
</head>
<body class="theme-dark is-mobile">
    <div class="header"><a href="/simple-jail.html">← Back to Index</a></div>
    <div class="mobile-jail">
        <div id="app"></div>
    </div>
    <script type="module" src="./${id}.ts"></script>
</body>
</html>`;

const tsTemplate = (component, propsStr) => `import { mount } from 'svelte';
import Component from '${component}';

// Mock Obsidian Mobile Environment
document.body.classList.add('is-mobile', 'os-android', 'theme-dark');
(window as any).isMobile = true;
(window as any).Platform = { isMobile: true, isDesktop: false, isAndroid: true };

const target = document.getElementById('app');
if (target) {
    mount(Component, {
        target,
        props: ${propsStr === '{}' ? '{}' : propsStr}
    });
}
`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Prototype Index (Jail)</title>
    <style>
        body {
            background: #111; color: #ddd; font-family: sans-serif; padding: 40px; 
            display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        h1 { color: #fff; margin-bottom: 20px; }
        a {
            display: block; width: 300px; padding: 12px 16px; background: #222; 
            border: 1px solid #333; border-radius: 8px; color: #75abd0; 
            text-decoration: none; font-weight: bold; text-align: center;
        }
        a:hover { background: #333; color: #fff; }
    </style>
</head>
<body>
    <h1>UI Prototype Lab (Mobile Jail)</h1>
    ${pages.map(p => `<a href="/${p.id}.html">${p.title}</a>`).join('\n    ')}
</body>
</html>`;

for (const p of pages) {
    fs.writeFileSync(`${p.id}.html`, htmlTemplate(p.id, p.title));
    fs.writeFileSync(`${p.id}.ts`, tsTemplate(p.component, p.props));
}

fs.writeFileSync('simple-jail.html', indexHtml);
console.log('Done generating split files.');
