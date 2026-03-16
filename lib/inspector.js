"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInspectorWidget = createInspectorWidget;
const apputils_1 = require("@jupyterlab/apputils");
const widgets_1 = require("@lumino/widgets");
const renderers_1 = require("./renderers");
async function executePreviewRequest(sessionContext, expression) {
    var _a;
    await sessionContext.ready;
    const kernel = (_a = sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel;
    if (!kernel) {
        throw new Error('No active kernel is attached to the current notebook or console.');
    }
    const start = '__OMICVERSE_PREVIEW_START__';
    const end = '__OMICVERSE_PREVIEW_END__';
    const code = [
        'from omicverse_notebook.preview import preview_variable',
        'import json',
        `print(${JSON.stringify(start)})`,
        `print(json.dumps(preview_variable(${JSON.stringify(expression)}), ensure_ascii=False))`,
        `print(${JSON.stringify(end)})`
    ].join('\n');
    let streamText = '';
    let errorText = '';
    const future = kernel.requestExecute({
        code,
        stop_on_error: true,
        store_history: false,
        silent: false
    });
    future.onIOPub = (message) => {
        var _a, _b, _c, _d;
        const msgType = message.header.msg_type;
        if (msgType === 'stream') {
            const content = message.content;
            streamText += (_a = content.text) !== null && _a !== void 0 ? _a : '';
            return;
        }
        if (msgType === 'error') {
            const content = message.content;
            errorText = (_d = (_c = (_b = content.traceback) === null || _b === void 0 ? void 0 : _b.join('\n')) !== null && _c !== void 0 ? _c : content.evalue) !== null && _d !== void 0 ? _d : 'Kernel execution failed.';
        }
    };
    await future.done;
    if (errorText) {
        throw new Error(errorText);
    }
    const startIdx = streamText.indexOf(start);
    const endIdx = streamText.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        throw new Error('Preview payload was not returned. Make sure `omicverse_notebook` is installed in the kernel environment.');
    }
    const jsonText = streamText.slice(startIdx + start.length, endIdx).trim();
    return JSON.parse(jsonText);
}
class InspectorBody extends widgets_1.Widget {
    constructor(options) {
        super({ node: Private.createInspectorNode() });
        this.options = options;
        this.addClass('ov-inspector-root');
        this.inputNode = this.node.querySelector('.ov-inspector-input');
        this.statusNode = this.node.querySelector('.ov-inspector-status');
        this.outputNode = this.node.querySelector('.ov-inspector-output');
        this.buttonNode = this.node.querySelector('.ov-inspector-button');
        this.buttonNode.onclick = () => {
            void this.inspectCurrentValue();
        };
        this.inputNode.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void this.inspectCurrentValue();
            }
        });
    }
    setExpression(expression) {
        this.inputNode.value = expression;
    }
    async inspectCurrentValue() {
        const expression = this.inputNode.value.trim();
        if (!expression) {
            this.setStatus('Enter a variable name or a safe expression such as `adata.obs`.', true);
            return;
        }
        const sessionContext = this.options.getSessionContext();
        if (!sessionContext) {
            this.setStatus('No active notebook or console session is available.', true);
            return;
        }
        this.buttonNode.disabled = true;
        this.setStatus(`Inspecting ${expression} ...`, false);
        this.outputNode.replaceChildren();
        try {
            const payload = await executePreviewRequest(sessionContext, expression);
            if (payload.error) {
                throw new Error(String(payload.error));
            }
            this.outputNode.appendChild((0, renderers_1.renderPayload)(payload, true));
            this.setStatus(`Loaded preview for ${expression}.`, false);
        }
        catch (error) {
            const pre = document.createElement('pre');
            pre.className = 'ov-pre';
            pre.textContent = error instanceof Error ? error.message : String(error);
            this.outputNode.replaceChildren(pre);
            this.setStatus('Preview failed.', true);
        }
        finally {
            this.buttonNode.disabled = false;
        }
    }
    setStatus(message, isError) {
        this.statusNode.textContent = message;
        this.statusNode.dataset.state = isError ? 'error' : 'normal';
    }
}
function createInspectorWidget(options) {
    const body = new InspectorBody(options);
    const widget = new apputils_1.MainAreaWidget({ content: body });
    widget.id = 'omicverse-notebook';
    widget.title.label = 'OmicVerse Notebook';
    widget.title.closable = true;
    return widget;
}
var Private;
(function (Private) {
    function createInspectorNode() {
        const node = document.createElement('div');
        node.className = 'ov-inspector-shell';
        node.innerHTML = `
      <div class="ov-inspector-toolbar">
        <label class="ov-inspector-label" for="ov-inspector-expression">Variable</label>
        <input id="ov-inspector-expression" class="ov-inspector-input" type="text" placeholder='adata / df / adata.layers["counts"]' />
        <button class="ov-inspector-button" type="button">Inspect</button>
      </div>
      <div class="ov-inspector-status"></div>
      <div class="ov-inspector-output"></div>
    `;
        return node;
    }
    Private.createInspectorNode = createInspectorNode;
})(Private || (Private = {}));
