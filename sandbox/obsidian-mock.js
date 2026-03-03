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

export default {
    Notice,
    PluginSettingTab,
    Modal,
    App,
    TFile,
    View,
    WorkspaceLeaf
};
