"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apputils_1 = require("@jupyterlab/apputils");
const console_1 = require("@jupyterlab/console");
const notebook_1 = require("@jupyterlab/notebook");
const inspector_1 = require("./inspector");
const session_1 = require("./session");
require("../style/index.css");
async function enableKernelFormatters(sessionContext, enabledSessions) {
    var _a, _b, _c;
    await sessionContext.ready;
    const kernel = (_a = sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel;
    if (!kernel) {
        return;
    }
    const sessionKey = `${(_c = (_b = sessionContext.session) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : 'unknown'}:${kernel.id}`;
    if (enabledSessions.has(sessionKey)) {
        return;
    }
    const future = kernel.requestExecute({
        code: 'from omicverse_notebook import enable_formatters; enable_formatters()',
        stop_on_error: false,
        store_history: false,
        silent: false
    });
    try {
        await future.done;
        enabledSessions.add(sessionKey);
    }
    catch (error) {
        console.warn('OmicVerse Notebook could not enable kernel formatters automatically.', error);
    }
}
function getCurrentSessionContext(notebooks, consoles) {
    const notebook = notebooks === null || notebooks === void 0 ? void 0 : notebooks.currentWidget;
    if (notebook) {
        return notebook.sessionContext;
    }
    const consolePanel = consoles === null || consoles === void 0 ? void 0 : consoles.currentWidget;
    if (consolePanel) {
        return consolePanel.sessionContext;
    }
    return null;
}
const inspectorPlugin = {
    id: 'omicverse-notebook:inspector',
    autoStart: true,
    requires: [apputils_1.ICommandPalette],
    optional: [notebook_1.INotebookTracker, console_1.IConsoleTracker],
    activate: (app, palette, notebooks, consoles) => {
        const enabledSessions = new Set();
        (0, session_1.setSessionContextProvider)(() => getCurrentSessionContext(notebooks, consoles));
        let widget = (0, inspector_1.createInspectorWidget)({
            getSessionContext: () => getCurrentSessionContext(notebooks, consoles)
        });
        const openCommand = 'omicverse-notebook:open';
        const enableCommand = 'omicverse-notebook:enable-formatters';
        app.commands.addCommand(openCommand, {
            label: 'OmicVerse Notebook: Open',
            execute: () => {
                if (widget.isDisposed) {
                    widget = (0, inspector_1.createInspectorWidget)({
                        getSessionContext: () => getCurrentSessionContext(notebooks, consoles)
                    });
                }
                if (!widget.isAttached) {
                    app.shell.add(widget, 'main');
                }
                app.shell.activateById(widget.id);
            }
        });
        app.commands.addCommand(enableCommand, {
            label: 'OmicVerse Notebook: Enable Kernel Formatters',
            execute: async () => {
                const sessionContext = getCurrentSessionContext(notebooks, consoles);
                if (!sessionContext) {
                    console.warn('No active notebook or console session found.');
                    return;
                }
                await enableKernelFormatters(sessionContext, enabledSessions);
            }
        });
        palette.addItem({
            command: openCommand,
            category: 'OmicVerse'
        });
        palette.addItem({
            command: enableCommand,
            category: 'OmicVerse'
        });
        if (notebooks) {
            notebooks.currentChanged.connect(() => {
                var _a;
                const sessionContext = (_a = notebooks.currentWidget) === null || _a === void 0 ? void 0 : _a.sessionContext;
                if (sessionContext) {
                    void enableKernelFormatters(sessionContext, enabledSessions);
                }
            });
            notebooks.widgetAdded.connect((_, panel) => {
                void enableKernelFormatters(panel.sessionContext, enabledSessions);
            });
        }
        if (consoles) {
            consoles.currentChanged.connect(() => {
                var _a;
                const sessionContext = (_a = consoles.currentWidget) === null || _a === void 0 ? void 0 : _a.sessionContext;
                if (sessionContext) {
                    void enableKernelFormatters(sessionContext, enabledSessions);
                }
            });
            consoles.widgetAdded.connect((_, panel) => {
                void enableKernelFormatters(panel.sessionContext, enabledSessions);
            });
        }
        const currentSession = getCurrentSessionContext(notebooks, consoles);
        if (currentSession) {
            void enableKernelFormatters(currentSession, enabledSessions);
        }
    }
};
exports.default = inspectorPlugin;
