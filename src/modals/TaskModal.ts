import { Modal, App, Setting } from 'obsidian';

export class TaskModal extends Modal {
    result: string = '';
    onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'New Task' });

        new Setting(contentEl)
            .setName('Title')
            .addText((text) =>
                text.onChange((value) => {
                    this.result = value;
                })
                    .inputEl.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && this.result.trim()) {
                            this.onSubmit(this.result.trim());
                            this.close();
                        }
                    })
            );

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Create')
                    .setCta()
                    .onClick(() => {
                        if (this.result.trim()) {
                            this.onSubmit(this.result.trim());
                            this.close();
                        }
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
