"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmicVerseRenderer = exports.ANNDATA_MIME_TYPE = exports.DATAFRAME_MIME_TYPE = void 0;
exports.renderPayload = renderPayload;
const widgets_1 = require("@lumino/widgets");
const session_1 = require("./session");
exports.DATAFRAME_MIME_TYPE = 'application/vnd.omicverse.dataframe+json';
exports.ANNDATA_MIME_TYPE = 'application/vnd.omicverse.anndata+json';
function dtypeClass(dtype) {
    if (!dtype) {
        return 'ov-dtype-other';
    }
    const lower = dtype.toLowerCase();
    if (lower.includes('int')) {
        return 'ov-dtype-int';
    }
    if (lower.includes('float')) {
        return 'ov-dtype-float';
    }
    if (lower === 'object' || lower === 'string' || lower === 'str' || lower.startsWith('string')) {
        return 'ov-dtype-object';
    }
    if (lower === 'bool') {
        return 'ov-dtype-bool';
    }
    if (lower.includes('datetime') || lower.includes('timedelta')) {
        return 'ov-dtype-datetime';
    }
    if (lower === 'category') {
        return 'ov-dtype-category';
    }
    return 'ov-dtype-other';
}
function columnTheme(colIdx, dark = false) {
    const hue = (colIdx * 47 + 18) % 360;
    if (dark) {
        return {
            bg: `hsla(${hue}, 72%, 28%, 0.42)`,
            border: `hsla(${hue}, 70%, 58%, 0.45)`,
            fg: `hsl(${hue}, 78%, 84%)`
        };
    }
    return {
        bg: `hsla(${hue}, 88%, 84%, 0.95)`,
        border: `hsla(${hue}, 78%, 42%, 0.55)`,
        fg: `hsl(${hue}, 72%, 18%)`
    };
}
function isDarkMode() {
    return document.documentElement.dataset.jpThemeLight === 'false';
}
function applyColumnTheme(el, colIdx, role) {
    const dark = isDarkMode();
    const theme = columnTheme(colIdx, dark);
    if (role === 'header') {
        el.style.background = theme.bg;
        el.style.color = theme.fg;
        el.style.borderColor = theme.border;
        return;
    }
    el.style.background = dark ? theme.bg : `hsla(${(colIdx * 47 + 18) % 360}, 88%, 90%, 0.7)`;
    el.style.borderLeft = `1px solid ${theme.border}`;
    el.style.color = dark ? theme.fg : '#1f2937';
}
function createCardHeader(kind, shape, name) {
    const header = document.createElement('div');
    header.className = 'ov-card';
    const title = document.createElement('span');
    title.className = 'ov-card-title';
    title.textContent = kind;
    header.appendChild(title);
    if (shape && shape.length >= 2) {
        const badge = document.createElement('span');
        badge.className = 'ov-card-shape';
        badge.textContent = `${Number(shape[0]).toLocaleString()} rows × ${shape[1]} cols`;
        header.appendChild(badge);
    }
    if (name) {
        const nameNode = document.createElement('div');
        nameNode.className = 'ov-card-name';
        nameNode.textContent = name;
        header.appendChild(nameNode);
    }
    return header;
}
function createTable(tableData, dtypes, withFooter = false, shape) {
    var _a;
    const wrap = document.createElement('div');
    wrap.className = 'ov-table-wrap';
    const table = document.createElement('table');
    table.className = 'ov-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const indexCorner = document.createElement('th');
    indexCorner.className = 'ov-th-index';
    indexCorner.textContent = '#';
    headRow.appendChild(indexCorner);
    tableData.columns.forEach((col, colIdx) => {
        const th = document.createElement('th');
        th.textContent = String(col);
        applyColumnTheme(th, colIdx, 'header');
        const dtype = dtypes === null || dtypes === void 0 ? void 0 : dtypes[col];
        if (dtype) {
            const badge = document.createElement('span');
            badge.className = `ov-dtype-badge ${dtypeClass(dtype)}`;
            badge.textContent = dtype;
            th.appendChild(badge);
        }
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    tableData.data.forEach((row, rowIdx) => {
        var _a;
        const tr = document.createElement('tr');
        const idxCell = document.createElement('td');
        idxCell.textContent = String((_a = tableData.index[rowIdx]) !== null && _a !== void 0 ? _a : rowIdx);
        tr.appendChild(idxCell);
        (row || []).forEach((cell, colIdx) => {
            const td = document.createElement('td');
            const value = cell === null || cell === undefined ? '' : String(cell);
            td.textContent = value;
            td.title = value;
            applyColumnTheme(td, colIdx, 'cell');
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    if (withFooter && shape && shape.length >= 2) {
        const footer = document.createElement('div');
        footer.className = 'ov-table-footer';
        const shown = tableData.data.length;
        const total = Number((_a = shape[0]) !== null && _a !== void 0 ? _a : shown);
        footer.textContent =
            shown < total
                ? `Showing ${shown} of ${total.toLocaleString()} rows × ${shape[1]} columns`
                : `${total.toLocaleString()} rows × ${shape[1]} columns`;
        wrap.appendChild(footer);
    }
    return wrap;
}
function setPreviewContent(previewHost, content, sourceKey, trigger, activeClass = 'is-active') {
    var _a;
    const currentKey = (_a = previewHost.dataset.activeSource) !== null && _a !== void 0 ? _a : '';
    const isSameSource = !!sourceKey && currentKey === sourceKey;
    const activeEl = previewHost._activeTrigger;
    if (activeEl) {
        activeEl.classList.remove(activeClass);
    }
    if (isSameSource || !content || !sourceKey) {
        previewHost.replaceChildren();
        previewHost.classList.remove('has-content');
        previewHost.dataset.activeSource = '';
        previewHost._activeTrigger = null;
        return;
    }
    previewHost.replaceChildren(content);
    previewHost.classList.add('has-content');
    previewHost.dataset.activeSource = sourceKey;
    previewHost._activeTrigger = trigger !== null && trigger !== void 0 ? trigger : null;
    if (trigger) {
        trigger.classList.add(activeClass);
    }
}
function createLoadingNode(message) {
    const node = document.createElement('div');
    node.className = 'ov-empty';
    node.textContent = message;
    return node;
}
async function requestKernelJson(code) {
    var _a;
    const sessionContext = (0, session_1.getSessionContext)();
    if (!sessionContext) {
        throw new Error('No active notebook session was found for this output.');
    }
    await sessionContext.ready;
    const kernel = (_a = sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel;
    if (!kernel) {
        throw new Error('No active kernel is attached to the current notebook.');
    }
    if (kernel.status === 'dead' || kernel.connectionStatus !== 'connected') {
        throw new Error('Kernel is not connected. If you just restarted it, re-run the cell to refresh this AnnData output.');
    }
    const startMarker = '__OMICVERSE_KERNEL_JSON_START__';
    const endMarker = '__OMICVERSE_KERNEL_JSON_END__';
    const wrappedCode = [
        'import json',
        `print(${JSON.stringify(startMarker)})`,
        code,
        `print(${JSON.stringify(endMarker)})`
    ].join('\n');
    let streamOutput = '';
    let executionError = '';
    const future = kernel.requestExecute({
        code: wrappedCode,
        stop_on_error: true,
        store_history: false,
        silent: false
    });
    future.onIOPub = (msg) => {
        var _a, _b, _c, _d;
        if (msg.header.msg_type === 'stream') {
            const content = msg.content;
            streamOutput += (_a = content.text) !== null && _a !== void 0 ? _a : '';
            return;
        }
        if (msg.header.msg_type === 'error') {
            const content = msg.content;
            executionError = (_d = (_c = (_b = content.traceback) === null || _b === void 0 ? void 0 : _b.join('\n')) !== null && _c !== void 0 ? _c : content.evalue) !== null && _d !== void 0 ? _d : 'Kernel execution failed.';
        }
    };
    await future.done;
    if (executionError) {
        if (executionError.includes('Kernel does not exist')) {
            throw new Error('Kernel is no longer available. Re-run the cell after the kernel finishes restarting.');
        }
        throw new Error(executionError);
    }
    const start = streamOutput.indexOf(startMarker);
    const end = streamOutput.indexOf(endMarker);
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Kernel response did not include a JSON payload.');
    }
    const jsonText = streamOutput.slice(start + startMarker.length, end).trim();
    return JSON.parse(jsonText);
}
async function requestEmbeddingPayload(target, basis, colorBy) {
    const payload = await requestKernelJson([
        'from omicverse_notebook.preview import plot_embedding_payload',
        `print(json.dumps(plot_embedding_payload(${JSON.stringify(target)}, basis=${JSON.stringify(basis)}, color_by=${colorBy ? JSON.stringify(colorBy) : 'None'}), ensure_ascii=False))`
    ].join('\n'));
    return payload;
}
function renderDataFramePayload(payload, options = {}) {
    var _a;
    const root = document.createElement('div');
    root.className = 'ov-panel';
    const card = document.createElement('div');
    card.className = 'ov-card ov-df-card';
    const title = document.createElement('span');
    title.className = 'ov-card-title';
    title.textContent = 'DataFrame';
    card.appendChild(title);
    if (payload.shape && payload.shape.length >= 2) {
        const badge = document.createElement('span');
        badge.className = 'ov-card-shape';
        badge.textContent = `${Number(payload.shape[0]).toLocaleString()} rows × ${payload.shape[1]} cols`;
        card.appendChild(badge);
    }
    if (payload.name) {
        const nameNode = document.createElement('div');
        nameNode.className = 'ov-card-name';
        nameNode.textContent = payload.name;
        card.appendChild(nameNode);
    }
    if (payload.table) {
        root.appendChild(createTable(payload.table, payload.dtypes, (_a = options.withFooter) !== null && _a !== void 0 ? _a : true, payload.shape));
    }
    root.prepend(card);
    return root;
}
function renderContentPayload(payload) {
    var _a;
    const root = document.createElement('div');
    root.className = 'ov-panel';
    root.appendChild(createCardHeader(payload.type === 'array' ? 'Array' : 'Value', payload.shape, payload.name));
    if (payload.dtype) {
        const dtype = document.createElement('div');
        dtype.className = 'ov-meta';
        dtype.textContent = `dtype: ${payload.dtype}`;
        root.appendChild(dtype);
    }
    if (payload.table) {
        root.appendChild(createTable(payload.table, undefined, true, payload.shape));
    }
    else {
        const pre = document.createElement('pre');
        pre.className = 'ov-pre';
        pre.textContent = (_a = payload.content) !== null && _a !== void 0 ? _a : '';
        root.appendChild(pre);
    }
    return root;
}
let plotlyModulePromise = null;
async function loadPlotly() {
    if (!plotlyModulePromise) {
        plotlyModulePromise = Promise.resolve().then(() => __importStar(require('plotly.js-dist-min'))).then((mod) => { var _a; return (_a = mod.default) !== null && _a !== void 0 ? _a : mod; });
    }
    return plotlyModulePromise;
}
async function renderPlotlyEmbedding(host, payload) {
    var _a, _b, _c, _d;
    const Plotly = await loadPlotly();
    const dark = isDarkMode();
    const size = payload.shown_points > 40000 ? 2 : payload.shown_points > 12000 ? 3 : 4;
    let traces = [];
    if (payload.color.mode === 'categorical') {
        const categorical = payload.color;
        traces = categorical.labels.map((label, code) => {
            var _a;
            const x = [];
            const y = [];
            const text = [];
            categorical.codes.forEach((entryCode, index) => {
                var _a, _b;
                if (entryCode === code) {
                    x.push(payload.x[index]);
                    y.push(payload.y[index]);
                    text.push((_b = (_a = payload.hover) === null || _a === void 0 ? void 0 : _a[index]) !== null && _b !== void 0 ? _b : `cell ${index}`);
                }
            });
            return {
                x,
                y,
                text,
                mode: 'markers',
                type: 'scattergl',
                name: label,
                hovertemplate: '%{text}<extra></extra>',
                marker: {
                    color: (_a = categorical.palette[code]) !== null && _a !== void 0 ? _a : '#64748b',
                    size,
                    opacity: 0.78
                }
            };
        });
    }
    else if (payload.color.mode === 'continuous') {
        traces = [
            {
                x: payload.x,
                y: payload.y,
                text: (_a = payload.hover) !== null && _a !== void 0 ? _a : [],
                mode: 'markers',
                type: 'scattergl',
                hovertemplate: '%{text}<extra></extra>',
                marker: {
                    color: payload.color.values,
                    colorscale: 'Viridis',
                    showscale: true,
                    colorbar: {
                        title: payload.color.column,
                        thickness: 12
                    },
                    cmin: (_b = payload.color.min) !== null && _b !== void 0 ? _b : undefined,
                    cmax: (_c = payload.color.max) !== null && _c !== void 0 ? _c : undefined,
                    size,
                    opacity: 0.8
                },
                showlegend: false
            }
        ];
    }
    else {
        traces = [
            {
                x: payload.x,
                y: payload.y,
                text: (_d = payload.hover) !== null && _d !== void 0 ? _d : [],
                mode: 'markers',
                type: 'scattergl',
                hovertemplate: '%{text}<extra></extra>',
                marker: {
                    color: '#2563eb',
                    size,
                    opacity: 0.78
                },
                showlegend: false
            }
        ];
    }
    const layout = {
        autosize: true,
        height: 420,
        dragmode: 'pan',
        showlegend: payload.color.mode === 'categorical',
        paper_bgcolor: dark ? '#111827' : '#ffffff',
        plot_bgcolor: dark ? '#111827' : '#ffffff',
        margin: { l: 48, r: payload.color.mode === 'continuous' ? 56 : 18, t: 18, b: 42 },
        font: {
            color: dark ? '#e5e7eb' : '#1f2937'
        },
        xaxis: {
            title: `${payload.basis}_1`,
            showgrid: false,
            zeroline: false,
            color: dark ? '#e5e7eb' : '#334155'
        },
        yaxis: {
            title: `${payload.basis}_2`,
            showgrid: false,
            zeroline: false,
            color: dark ? '#e5e7eb' : '#334155'
        },
        legend: {
            orientation: 'v',
            yanchor: 'top',
            y: 1,
            xanchor: 'left',
            x: 1.02,
            bgcolor: dark ? 'rgba(17,24,39,0.82)' : 'rgba(255,255,255,0.88)',
            bordercolor: dark ? '#334155' : '#cbd5e1',
            borderwidth: 1
        }
    };
    const config = {
        responsive: true,
        displaylogo: false,
        scrollZoom: true,
        modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d']
    };
    await Plotly.react(host, traces, layout, config);
}
function renderEmbeddingPayload(payload) {
    const root = document.createElement('div');
    root.className = 'ov-panel ov-plot-panel';
    const card = document.createElement('div');
    card.className = 'ov-card ov-plot-card';
    const title = document.createElement('span');
    title.className = 'ov-card-title';
    title.textContent = payload.basis;
    card.appendChild(title);
    const badge = document.createElement('span');
    badge.className = 'ov-card-shape';
    badge.textContent = payload.sampled
        ? `${payload.shown_points.toLocaleString()} / ${payload.total_points.toLocaleString()} points`
        : `${payload.total_points.toLocaleString()} points`;
    card.appendChild(badge);
    if (payload.name) {
        const nameNode = document.createElement('div');
        nameNode.className = 'ov-card-name';
        nameNode.textContent = payload.name;
        card.appendChild(nameNode);
    }
    root.appendChild(card);
    const meta = document.createElement('div');
    meta.className = 'ov-meta';
    meta.textContent =
        payload.color.mode === 'none'
            ? 'Default cell color'
            : payload.color.mode === 'continuous'
                ? `Colored by obs.${payload.color.column}`
                : `Colored by obs.${payload.color.column}`;
    root.appendChild(meta);
    if (payload.warning) {
        const warning = document.createElement('div');
        warning.className = 'ov-empty';
        warning.textContent = payload.warning;
        root.appendChild(warning);
    }
    const host = document.createElement('div');
    host.className = 'ov-plotly-host';
    root.appendChild(host);
    void renderPlotlyEmbedding(host, payload).catch((error) => {
        const errorNode = document.createElement('pre');
        errorNode.className = 'ov-pre';
        errorNode.textContent = error instanceof Error ? error.message : String(error);
        host.replaceChildren(errorNode);
    });
    return root;
}
function pickUMAPKey(keys) {
    var _a;
    const priority = ['X_umap', 'UMAP', 'umap'];
    for (const key of priority) {
        if (keys.includes(key)) {
            return key;
        }
    }
    return (_a = keys.find((key) => key.toLowerCase().includes('umap'))) !== null && _a !== void 0 ? _a : null;
}
function createAnnDataSection(label, slot, keys, more, previewHost, previews, onKeyClick) {
    const section = document.createElement('div');
    section.className = 'ov-adata-row';
    const title = document.createElement('span');
    title.className = 'ov-adata-row-label';
    title.textContent = label;
    section.appendChild(title);
    const row = document.createElement('span');
    row.className = 'ov-adata-row-values';
    keys.forEach((key) => {
        const chip = document.createElement(previews || onKeyClick ? 'button' : 'span');
        chip.className = 'ov-adata-chip';
        chip.textContent = key;
        if (chip instanceof HTMLButtonElement) {
            chip.type = 'button';
            chip.onclick = () => {
                void (async () => {
                    const handled = onKeyClick ? await onKeyClick(slot, key, chip) : false;
                    if (handled) {
                        return;
                    }
                    const preview = previews === null || previews === void 0 ? void 0 : previews[key];
                    if (!preview) {
                        const note = document.createElement('div');
                        note.className = 'ov-empty';
                        note.textContent = 'No embedded preview for this entry. Use the inspector panel for a direct query.';
                        setPreviewContent(previewHost, note, `${slot}:${key}`, chip);
                        return;
                    }
                    const container = document.createElement('div');
                    const header = document.createElement('div');
                    header.className = 'ov-meta';
                    header.textContent = `${slot}["${key}"]`;
                    container.appendChild(header);
                    container.appendChild(renderPayload(preview, true));
                    setPreviewContent(previewHost, container, `${slot}:${key}`, chip);
                })();
            };
        }
        row.appendChild(chip);
    });
    if (more > 0) {
        const moreBadge = document.createElement('span');
        moreBadge.className = 'ov-chip-more';
        moreBadge.textContent = `+${more} more`;
        row.appendChild(moreBadge);
    }
    if (!keys.length) {
        const empty = document.createElement('span');
        empty.className = 'ov-empty';
        empty.textContent = '—';
        row.appendChild(empty);
    }
    section.appendChild(row);
    return section;
}
function renderAnnDataPayload(payload) {
    var _a, _b, _c, _d, _e, _f, _g;
    const root = document.createElement('div');
    root.className = 'ov-panel';
    const card = document.createElement('div');
    card.className = 'ov-card';
    const icon = document.createElement('span');
    icon.className = 'ov-card-title';
    icon.textContent = 'AnnData';
    card.appendChild(icon);
    const shape = document.createElement('span');
    shape.className = 'ov-card-shape';
    shape.textContent = `${payload.summary.shape[0].toLocaleString()} × ${payload.summary.shape[1].toLocaleString()}`;
    card.appendChild(shape);
    if (payload.name) {
        const nameNode = document.createElement('div');
        nameNode.className = 'ov-card-name';
        nameNode.textContent = payload.name;
        card.appendChild(nameNode);
    }
    root.appendChild(card);
    const actions = document.createElement('div');
    actions.className = 'ov-actions';
    const previewHost = document.createElement('div');
    previewHost.className = 'ov-preview-host';
    const target = (_b = (_a = payload.ref) !== null && _a !== void 0 ? _a : payload.name) !== null && _b !== void 0 ? _b : '';
    const umapKey = pickUMAPKey(payload.summary.obsm_keys);
    let requestNonce = 0;
    const showEmbedding = async (basis, colorBy, trigger, sourceKey) => {
        if (!target) {
            const errorNode = createLoadingNode('This AnnData preview has no kernel reference. Use the inspector panel on a named variable.');
            setPreviewContent(previewHost, errorNode, sourceKey, trigger);
            return true;
        }
        if (previewHost.dataset.activeSource === sourceKey) {
            requestNonce += 1;
            setPreviewContent(previewHost, null, null, trigger);
            return true;
        }
        const loadingNode = createLoadingNode(`Loading ${basis}${colorBy ? ` colored by ${colorBy}` : ''} ...`);
        setPreviewContent(previewHost, loadingNode, sourceKey, trigger);
        const currentNonce = ++requestNonce;
        try {
            const embedding = await requestEmbeddingPayload(target, basis, colorBy);
            if (currentNonce !== requestNonce || previewHost.dataset.activeSource !== sourceKey) {
                return true;
            }
            setPreviewContent(previewHost, renderEmbeddingPayload(embedding), sourceKey, trigger);
        }
        catch (error) {
            if (currentNonce !== requestNonce || previewHost.dataset.activeSource !== sourceKey) {
                return true;
            }
            const errorNode = document.createElement('pre');
            errorNode.className = 'ov-pre';
            errorNode.textContent = error instanceof Error ? error.message : String(error);
            setPreviewContent(previewHost, errorNode, sourceKey, trigger);
        }
        return true;
    };
    const addPreviewButton = (label, preview) => {
        if (!preview) {
            return;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ov-action-btn';
        button.textContent = label;
        button.onclick = () => {
            setPreviewContent(previewHost, renderDataFramePayload(preview, { withFooter: true }), label, button, 'is-active');
        };
        actions.appendChild(button);
    };
    addPreviewButton('Preview .obs', (_c = payload.previews) === null || _c === void 0 ? void 0 : _c.obs);
    addPreviewButton('Preview .var', (_d = payload.previews) === null || _d === void 0 ? void 0 : _d.var);
    if (umapKey) {
        const umapButton = document.createElement('button');
        umapButton.type = 'button';
        umapButton.className = 'ov-action-btn';
        umapButton.textContent = `UMAP (${umapKey})`;
        umapButton.onclick = () => {
            void showEmbedding(umapKey, undefined, umapButton, `embedding:${umapKey}:default`);
        };
        actions.appendChild(umapButton);
    }
    if (actions.childNodes.length) {
        root.appendChild(actions);
    }
    const rows = document.createElement('div');
    rows.className = 'ov-adata-lines';
    rows.appendChild(createAnnDataSection('obs', 'obs', payload.summary.obs_columns, payload.summary.obs_columns_more, previewHost, undefined, umapKey
        ? async (_slot, key, trigger) => showEmbedding(umapKey, `obs:${key}`, trigger, `embedding:${umapKey}:obs:${key}`)
        : undefined));
    rows.appendChild(createAnnDataSection('var', 'var', payload.summary.var_columns, payload.summary.var_columns_more, previewHost));
    rows.appendChild(createAnnDataSection('uns', 'uns', payload.summary.uns_keys, payload.summary.uns_keys_more, previewHost, (_e = payload.previews) === null || _e === void 0 ? void 0 : _e.uns));
    rows.appendChild(createAnnDataSection('obsm', 'obsm', payload.summary.obsm_keys, payload.summary.obsm_keys_more, previewHost, (_f = payload.previews) === null || _f === void 0 ? void 0 : _f.obsm, umapKey
        ? async (_slot, key, trigger) => {
            if (key !== umapKey) {
                return false;
            }
            return showEmbedding(key, undefined, trigger, `embedding:${key}:default`);
        }
        : undefined));
    rows.appendChild(createAnnDataSection('layers', 'layers', payload.summary.layers, payload.summary.layers_more, previewHost, (_g = payload.previews) === null || _g === void 0 ? void 0 : _g.layers));
    root.appendChild(rows);
    root.appendChild(previewHost);
    return root;
}
function renderPayload(payload, _emphasizeFooter = false) {
    if (payload.type === 'dataframe') {
        return renderDataFramePayload(payload, { withFooter: true });
    }
    if (payload.type === 'anndata') {
        return renderAnnDataPayload(payload);
    }
    if (payload.type === 'embedding') {
        return renderEmbeddingPayload(payload);
    }
    return renderContentPayload(payload);
}
class OmicVerseRenderer extends widgets_1.Widget {
    constructor(mimeType) {
        super();
        this.mimeType = mimeType;
        this.addClass('ov-renderer');
    }
    async renderModel(model) {
        this.node.replaceChildren();
        const payload = model.data[this.mimeType];
        if (!payload) {
            const empty = document.createElement('div');
            empty.className = 'ov-empty';
            empty.textContent = 'No renderable payload.';
            this.node.appendChild(empty);
            return;
        }
        this.node.appendChild(renderPayload(payload));
    }
}
exports.OmicVerseRenderer = OmicVerseRenderer;
