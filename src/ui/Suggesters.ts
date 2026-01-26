
import { App, FuzzySuggestModal, TFile, TFolder } from 'obsidian';

export class FolderSuggester extends FuzzySuggestModal<TFolder> {
    constructor(app: App, private onChoose: (folder: TFolder) => void) {
        super(app);
    }

    getItems(): TFolder[] {
        return this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder) as TFolder[];
    }

    getItemText(item: TFolder): string {
        return item.path;
    }

    onChooseItem(item: TFolder, evt: MouseEvent | KeyboardEvent): void {
        this.onChoose(item);
    }
}

export class FileSuggester extends FuzzySuggestModal<TFile> {
    constructor(app: App, private onChoose: (file: TFile) => void) {
        super(app);
    }

    getItems(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }

    getItemText(item: TFile): string {
        return item.path;
    }

    onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent): void {
        this.onChoose(item);
    }
}
