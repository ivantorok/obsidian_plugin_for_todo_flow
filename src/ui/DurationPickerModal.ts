import { App, FuzzySuggestModal, type FuzzyMatch } from 'obsidian';

export interface DurationPreset {
    label: string;
    minutes: number;
}

export class DurationPickerModal extends FuzzySuggestModal<DurationPreset> {
    private presets: DurationPreset[] = [
        { label: '2m', minutes: 2 },
        { label: '5m', minutes: 5 },
        { label: '10m', minutes: 10 },
        { label: '15m', minutes: 15 },
        { label: '20m', minutes: 20 },
        { label: '30m', minutes: 30 },
        { label: '45m', minutes: 45 },
        { label: '1h', minutes: 60 },
        { label: '1h 30m', minutes: 90 },
        { label: '2h', minutes: 120 },
        { label: '3h', minutes: 180 },
        { label: '4h', minutes: 240 },
        { label: '6h', minutes: 360 },
        { label: '8h', minutes: 480 },
    ];

    constructor(app: App, private onSelect: (minutes: number) => void) {
        super(app);
        this.setPlaceholder('Select task duration...');
    }

    getItems(): DurationPreset[] {
        return this.presets;
    }

    getItemText(item: DurationPreset): string {
        return item.label;
    }

    onChooseItem(item: DurationPreset, evt: MouseEvent | KeyboardEvent): void {
        this.onSelect(item.minutes);
    }
}
