import fs from 'fs';

const pages = [
  { id: 'primitives', title: 'Primitives Lab', component: './prototypes/PrimitivesStorybook.svelte', props: "{}" },
  { id: 'dump-shadow', title: 'Dump Mode (Shadow)', component: './prototypes/ShadowDump.svelte', props: "{}" },
  { id: 'stack-shadow', title: 'Stack Mode (Architect)', component: './prototypes/ShadowStack.svelte', props: "{}" },
  { id: 'detailed-view', title: 'Detailed View (Modal)', component: './prototypes/DetailedTaskView.svelte', props: "{}" }
];

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

for (const p of pages) {
    fs.writeFileSync(`${p.id}.ts`, tsTemplate(p.component, p.props));
}

console.log('Fixed broken TS files.');
