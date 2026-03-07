import moment from 'moment';

export class Notice {
    constructor(message, duration) {
        console.log(`[Notice] ${message}`);
    }
}

export class PluginSettingTab {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }
}

export class Modal {
    constructor(app) {
        this.app = app;
    }
    open() { }
    close() { }
}

export const App = class { };
export const TFile = class { };
export const View = class { };
export const WorkspaceLeaf = class { };
export const MetadataCache = class { };

export const setIcon = (parent, iconId) => {
    // Simple mock to just render the icon name for visual debugging
    parent.textContent = `[ Icon: ${iconId} ]`;
};

export { moment };

export default {
    Notice,
    PluginSettingTab,
    Modal,
    App,
    TFile,
    View,
    WorkspaceLeaf,
    moment
};
