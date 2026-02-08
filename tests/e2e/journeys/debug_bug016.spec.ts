import { browser } from '@wdio/globals';
import { emulateMobile, resetToDesktop } from '../mobile_utils.js';

/**
 * Debugging BUG-016: Viewport Collision
 * 
 * This test replicates the failing scenario and dumps the DOM state
 * to help diagnose why the focused element isn't found.
 */
describe('Debug BUG-016: Mobile Viewport Collision', () => {

    // We need to restart to ensure clean state
    beforeEach(async () => {
        await browser.reloadSession();
        await emulateMobile();
    });

    afterEach(async () => {
        await resetToDesktop();
    });

    // Helper to create a stack with N items
    async function setupStackWithTasks(taskTitles: string[]) {
        // 1. Create a daily note (clears previous state effectively)
        await browser.execute(() => {
            // @ts-ignore
            app.commands.executeCommandById('todo-flow:open-daily-stack');
        });
        await browser.pause(2000); // Wait for view to load

        // 2. Add tasks via command
        for (const title of taskTitles) {
            await browser.keys(['c']); // Trigger creation
            await browser.pause(300); // Wait for modal
            await browser.keys([...title.split(''), 'Enter']);
            await browser.pause(800); // Wait for persistence & UI update
        }
    }

    it('should dump DOM state when focused element is missing', async () => {
        // 1. Setup a stack with enough tasks to ensure scrolling is needed
        const taskTitles = Array.from({ length: 5 }, (_, i) => `Task ${i + 1}`);
        console.log('[DEBUG] Setting up stack with 5 tasks');
        await setupStackWithTasks(taskTitles);

        // 2. Focus the first task initially
        await browser.pause(1000);

        // 3. Scroll down to Task 5 using shortcuts
        console.log('[DEBUG] Navigating down to Task 5');
        for (let i = 0; i < 4; i++) {
            await browser.keys(['j']);
            await browser.pause(100);
        }

        await browser.pause(1000); // Wait for smooth scroll

        // 4. Inspect the DOM
        const debugInfo = await browser.execute(() => {
            const container = document.querySelector('.todo-flow-timeline');
            if (!container) return { error: 'Timeline container not found' };

            const cards = Array.from(container.querySelectorAll('.todo-flow-task-card'));
            const cardsInfo = cards.map((card, index) => ({
                index,
                className: card.className,
                title: card.querySelector('.title')?.textContent,
                isFocused: card.classList.contains('is-focused') || card.classList.contains('focused')
            }));

            const focusedCard = document.querySelector('.todo-flow-task-card.is-focused');

            return {
                cards: cardsInfo,
                foundFocused: !!focusedCard,
                containerHtml: container.innerHTML.substring(0, 500) + '...' // truncated
            };
        });

        console.log('[DEBUG] DOM State:', JSON.stringify(debugInfo, null, 2));

        if (!debugInfo.foundFocused) {
            throw new Error(`Focused element not found. Available cards: ${JSON.stringify(debugInfo.cards, null, 2)}`);
        }
    });
});
