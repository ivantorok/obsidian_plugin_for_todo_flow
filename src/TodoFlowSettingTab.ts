import { App, PluginSettingTab, Setting, Platform } from 'obsidian';
import type TodoFlowPlugin from './main.js';
import { formatKeys, parseKeys } from './utils/settings-utils.js';
import { type KeybindingSettings } from './keybindings.js';
import { ShakeDetector } from './utils/ShakeDetector.js';

export class TodoFlowSettingTab extends PluginSettingTab {
    plugin: TodoFlowPlugin;

    constructor(app: App, plugin: TodoFlowPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Target Folder')
            .setDesc('Folder where new thoughts and tasks will be created')
            .addText(text => text
                .setPlaceholder('todo-flow')
                .setValue(this.plugin.settings.targetFolder)
                .onChange(async (value) => {
                    this.plugin.settings.targetFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Export Folder')
            .setDesc('Default folder for Stack exports (leave empty for Vault root)')
            .addText(text => text
                .setPlaceholder('e.g. Exports')
                .setValue(this.plugin.settings.exportFolder)
                .onChange(async (value) => {
                    this.plugin.settings.exportFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Timing Mode')
            .setDesc('Choose how the Daily Stack schedule is calculated')
            .addDropdown(dropdown => dropdown
                .addOption('now', 'Dynamic (Start from Now)')
                .addOption('fixed', 'Fixed (Start from specific time)')
                .setValue(this.plugin.settings.timingMode)
                .onChange(async (value) => {
                    this.plugin.settings.timingMode = value as 'now' | 'fixed';
                    await this.plugin.saveSettings();
                    this.plugin.refreshStackView();
                    this.display(); // Refresh to show/hide fixed time setting
                }));

        if (this.plugin.settings.timingMode === 'fixed') {
            new Setting(containerEl)
                .setName('Fixed Start Time')
                .setDesc('Example: 09:00, 14:30')
                .addText(text => text
                    .setPlaceholder('HH:mm')
                    .setValue(this.plugin.settings.fixedStartTime)
                    .onChange(async (value) => {
                        this.plugin.settings.fixedStartTime = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshStackView();
                    }));
        }

        new Setting(containerEl)
            .setName('Developer Mode')
            .setDesc('Enable verbose diagnostic tracing in the console (Cmd+Option+I)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debug)
                .onChange(async (value) => {
                    this.plugin.settings.debug = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStackView();
                }));

        new Setting(containerEl)
            .setName('Trace Vault Events')
            .setDesc('Enable high-frequency diagnostic logging to disk (logs/modify-detected.txt). Warning: Significant disk I/O.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.traceVaultEvents)
                .onChange(async (value) => {
                    this.plugin.settings.traceVaultEvents = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Graph Depth')
            .setDesc('Maximum recursion depth for discovering sub-tasks. Lower values improve performance on mobile.')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.maxGraphDepth)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxGraphDepth = value;
                    await this.plugin.saveSettings();
                }));

        if (Platform.isMobile) {
            containerEl.createEl('h3', { text: 'Mobile Interactions' });

            new Setting(containerEl)
                .setName('Shake to Undo')
                .setDesc('Shake your device to undo the last action')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enableShake)
                    .onChange(async (value) => {
                        this.plugin.settings.enableShake = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            // @ts-ignore
                            this.plugin.initShakeDetector();
                        } else if (this.plugin.shakeDetector) {
                            this.plugin.shakeDetector.stop();
                        }
                        this.display(); // Refresh to show/hide permission button
                    }));

            if (this.plugin.settings.enableShake) {
                new Setting(containerEl)
                    .setName('Motion Permission')
                    .setDesc('iOS 13+ requires explicit permission to access motion data')
                    .addButton(button => button
                        .setButtonText('Request Permission')
                        .onClick(async () => {
                            const granted = await ShakeDetector.requestPermission();
                            if (granted) {
                                (window as any).Notice ? new (window as any).Notice('Motion permission granted!') : console.log('Motion permission granted!');
                                // @ts-ignore
                                this.plugin.initShakeDetector();
                            } else {
                                (window as any).Notice ? new (window as any).Notice('Permission denied or failed.') : console.log('Permission denied or failed.');
                            }
                        }));
            }

            const gestureOptions = {
                'archive': 'Archive',
                'complete': 'Toggle Complete',
                'anchor': 'Toggle Anchor',
                'force-open': 'Force Open / Standard Editor',
                'none': 'None'
            };

            new Setting(containerEl)
                .setName('Swipe Left Action')
                .setDesc('Action when swiping left on a task card')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.swipeLeftAction)
                    .onChange(async (value) => {
                        this.plugin.settings.swipeLeftAction = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Swipe Right Action')
                .setDesc('Action when swiping right on a task card')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.swipeRightAction)
                    .onChange(async (value) => {
                        this.plugin.settings.swipeRightAction = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Double Tap Action')
                .setDesc('Action when double-tapping a task card')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.doubleTapAction)
                    .onChange(async (value) => {
                        this.plugin.settings.doubleTapAction = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Long Press Action')
                .setDesc('Action when holding a task card (replaces Hold-to-Drag)')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.longPressAction)
                    .onChange(async (value) => {
                        this.plugin.settings.longPressAction = value;
                        await this.plugin.saveSettings();
                    }));
        }

        containerEl.createEl('h3', { text: 'Navigation' });
        this.addKeySetting(containerEl, 'navUp', 'Move Focus Up');
        this.addKeySetting(containerEl, 'navDown', 'Move Focus Down');
        this.addKeySetting(containerEl, 'forceOpen', 'Force Open / Drill Down');
        this.addKeySetting(containerEl, 'goBack', 'Go Back');
        this.addKeySetting(containerEl, 'confirm', 'Open / Drill Down (Contextual)');

        containerEl.createEl('h3', { text: 'Actions' });
        this.addKeySetting(containerEl, 'toggleDone', 'Toggle Done');
        this.addKeySetting(containerEl, 'createTask', 'Create Task');
        this.addKeySetting(containerEl, 'quickAdd', 'Quick Add to Stack');
        this.addKeySetting(containerEl, 'rename', 'Rename Task');
        this.addKeySetting(containerEl, 'editStartTime', 'Set Start Time');
        this.addKeySetting(containerEl, 'deleteTask', 'Delete Task');
        this.addKeySetting(containerEl, 'archive', 'Archive Task (Stack)');
        this.addKeySetting(containerEl, 'export', 'Export to Note');

        containerEl.createEl('h3', { text: 'Organization' });
        this.addKeySetting(containerEl, 'moveUp', 'Move Task Up');
        this.addKeySetting(containerEl, 'moveDown', 'Move Task Down');
        this.addKeySetting(containerEl, 'anchor', 'Toggle Anchor');
        this.addKeySetting(containerEl, 'durationUp', 'Increase Duration');
        this.addKeySetting(containerEl, 'durationDown', 'Decrease Duration');
        this.addKeySetting(containerEl, 'undo', 'Undo');
        this.addKeySetting(containerEl, 'redo', 'Redo');
    }

    private addKeySetting(containerEl: HTMLElement, key: Exclude<keyof KeybindingSettings, 'debug'>, name: string) {
        new Setting(containerEl)
            .setName(name)
            .setDesc(`Current: ${formatKeys(this.plugin.settings.keys[key] as string[])}`)
            .addText(text => text
                .setPlaceholder('e.g. k, ArrowUp')
                .setValue(formatKeys(this.plugin.settings.keys[key] as string[]))
                .onChange(async (value) => {
                    const parsed = parseKeys(value);
                    this.plugin.settings.keys[key] = parsed;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStackView();
                }));
    }
}
