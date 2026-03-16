import { Widget } from '@lumino/widgets';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { getSessionContext } from './session';

export const DATAFRAME_MIME_TYPE = 'application/vnd.omicverse.dataframe+json';
export const ANNDATA_MIME_TYPE = 'application/vnd.omicverse.anndata+json';

type BasePayload = {
  name?: string;
  ref?: string;
};

type TableData = {
  columns: string[];
  index: string[];
  data: Array<Array<unknown>>;
};

type DataFramePayload = BasePayload & {
  type: 'dataframe';
  shape?: number[];
  dtypes?: Record<string, string>;
  table?: TableData;
};

type ContentPayload = BasePayload & {
  type: 'content' | 'array';
  content?: string;
  shape?: number[];
  dtype?: string;
  table?: TableData;
};

type EmbeddingColorNone = {
  mode: 'none';
};

type EmbeddingColorContinuous = {
  mode: 'continuous';
  column: string;
  values: Array<number | null>;
  min: number | null;
  max: number | null;
};

type EmbeddingColorCategorical = {
  mode: 'categorical';
  column: string;
  labels: string[];
  codes: number[];
  palette: string[];
};

type EmbeddingColor = EmbeddingColorNone | EmbeddingColorContinuous | EmbeddingColorCategorical;

type EmbeddingPayload = BasePayload & {
  type: 'embedding';
  basis: string;
  total_points: number;
  shown_points: number;
  sampled: boolean;
  x: number[];
  y: number[];
  hover?: string[];
  warning?: string;
  color: EmbeddingColor;
};

type PreviewMap = Record<string, DataFramePayload | ContentPayload>;

type AnnDataSummary = {
  shape: number[];
  obs_columns: string[];
  obs_columns_total: number;
  obs_columns_more: number;
  var_columns: string[];
  var_columns_total: number;
  var_columns_more: number;
  uns_keys: string[];
  uns_keys_total: number;
  uns_keys_more: number;
  obsm_keys: string[];
  obsm_keys_total: number;
  obsm_keys_more: number;
  layers: string[];
  layers_total: number;
  layers_more: number;
};

type AnnDataPayload = BasePayload & {
  type: 'anndata';
  summary: AnnDataSummary;
  previews?: {
    obs?: DataFramePayload;
    var?: DataFramePayload;
    uns?: PreviewMap;
    obsm?: PreviewMap;
    layers?: PreviewMap;
  };
};

export type SupportedPayload = DataFramePayload | AnnDataPayload | ContentPayload | EmbeddingPayload;

type PreviewHostElement = HTMLElement & {
  _activeTrigger?: HTMLElement | null;
};

type KeyClickHandler = (
  slot: string,
  key: string,
  trigger: HTMLElement
) => boolean | Promise<boolean>;

function dtypeClass(dtype: string | undefined): string {
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

function columnTheme(colIdx: number, dark = false): { bg: string; border: string; fg: string } {
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

function isDarkMode(): boolean {
  return document.documentElement.dataset.jpThemeLight === 'false';
}

function applyColumnTheme(el: HTMLElement, colIdx: number, role: 'header' | 'cell'): void {
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

function createCardHeader(kind: string, shape: number[] | undefined, name?: string): HTMLElement {
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

function createTable(
  tableData: TableData,
  dtypes?: Record<string, string>,
  withFooter = false,
  shape?: number[]
): HTMLElement {
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
    const dtype = dtypes?.[col];
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
    const tr = document.createElement('tr');
    const idxCell = document.createElement('td');
    idxCell.textContent = String(tableData.index[rowIdx] ?? rowIdx);
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
    const total = Number(shape[0] ?? shown);
    footer.textContent =
      shown < total
        ? `Showing ${shown} of ${total.toLocaleString()} rows × ${shape[1]} columns`
        : `${total.toLocaleString()} rows × ${shape[1]} columns`;
    wrap.appendChild(footer);
  }

  return wrap;
}

function setPreviewContent(
  previewHost: PreviewHostElement,
  content: HTMLElement | null,
  sourceKey: string | null,
  trigger?: HTMLElement | null,
  activeClass = 'is-active'
): void {
  const currentKey = previewHost.dataset.activeSource ?? '';
  const isSameSource = !!sourceKey && currentKey === sourceKey;

  const activeEl = previewHost._activeTrigger as HTMLElement | undefined;
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
  previewHost._activeTrigger = trigger ?? null;
  if (trigger) {
    trigger.classList.add(activeClass);
  }
}

function createLoadingNode(message: string): HTMLElement {
  const node = document.createElement('div');
  node.className = 'ov-empty';
  node.textContent = message;
  return node;
}

async function requestKernelJson(code: string): Promise<unknown> {
  const sessionContext = getSessionContext();
  if (!sessionContext) {
    throw new Error('No active notebook session was found for this output.');
  }

  await sessionContext.ready;
  const kernel = sessionContext.session?.kernel;
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
    if (msg.header.msg_type === 'stream') {
      const content = msg.content as { text?: string };
      streamOutput += content.text ?? '';
      return;
    }
    if (msg.header.msg_type === 'error') {
      const content = msg.content as { traceback?: string[]; evalue?: string };
      executionError = content.traceback?.join('\n') ?? content.evalue ?? 'Kernel execution failed.';
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

async function requestEmbeddingPayload(
  target: string,
  basis: string,
  colorBy?: string
): Promise<EmbeddingPayload> {
  const payload = await requestKernelJson(
    [
      'from omicverse_notebook.preview import plot_embedding_payload',
      `print(json.dumps(plot_embedding_payload(${JSON.stringify(target)}, basis=${JSON.stringify(
        basis
      )}, color_by=${colorBy ? JSON.stringify(colorBy) : 'None'}), ensure_ascii=False))`
    ].join('\n')
  );
  return payload as EmbeddingPayload;
}

function renderDataFramePayload(payload: DataFramePayload, options: { withFooter?: boolean } = {}): HTMLElement {
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
    root.appendChild(createTable(payload.table, payload.dtypes, options.withFooter ?? true, payload.shape));
  }

  root.prepend(card);
  return root;
}

function renderContentPayload(payload: ContentPayload): HTMLElement {
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
  } else {
    const pre = document.createElement('pre');
    pre.className = 'ov-pre';
    pre.textContent = payload.content ?? '';
    root.appendChild(pre);
  }
  return root;
}

let plotlyModulePromise: Promise<any> | null = null;

async function loadPlotly(): Promise<any> {
  if (!plotlyModulePromise) {
    plotlyModulePromise = import('plotly.js-dist-min').then((mod) => mod.default ?? mod);
  }
  return plotlyModulePromise;
}

async function renderPlotlyEmbedding(host: HTMLElement, payload: EmbeddingPayload): Promise<void> {
  const Plotly = await loadPlotly();
  const dark = isDarkMode();
  const size = payload.shown_points > 40000 ? 2 : payload.shown_points > 12000 ? 3 : 4;

  let traces: Array<Record<string, unknown>> = [];

  if (payload.color.mode === 'categorical') {
    const categorical = payload.color;
    traces = categorical.labels.map((label, code) => {
      const x: number[] = [];
      const y: number[] = [];
      const text: string[] = [];
      categorical.codes.forEach((entryCode: number, index: number) => {
        if (entryCode === code) {
          x.push(payload.x[index]);
          y.push(payload.y[index]);
          text.push(payload.hover?.[index] ?? `cell ${index}`);
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
          color: categorical.palette[code] ?? '#64748b',
          size,
          opacity: 0.78
        }
      };
    });
  } else if (payload.color.mode === 'continuous') {
    traces = [
      {
        x: payload.x,
        y: payload.y,
        text: payload.hover ?? [],
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
          cmin: payload.color.min ?? undefined,
          cmax: payload.color.max ?? undefined,
          size,
          opacity: 0.8
        },
        showlegend: false
      }
    ];
  } else {
    traces = [
      {
        x: payload.x,
        y: payload.y,
        text: payload.hover ?? [],
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

function renderEmbeddingPayload(payload: EmbeddingPayload): HTMLElement {
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

function pickUMAPKey(keys: string[]): string | null {
  const priority = ['X_umap', 'UMAP', 'umap'];
  for (const key of priority) {
    if (keys.includes(key)) {
      return key;
    }
  }
  return keys.find((key) => key.toLowerCase().includes('umap')) ?? null;
}

function createAnnDataSection(
  label: string,
  slot: string,
  keys: string[],
  more: number,
  previewHost: HTMLElement,
  previews?: PreviewMap,
  onKeyClick?: KeyClickHandler
): HTMLElement {
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
          const preview = previews?.[key];
          if (!preview) {
            const note = document.createElement('div');
            note.className = 'ov-empty';
            note.textContent = 'No embedded preview for this entry. Use the inspector panel for a direct query.';
            setPreviewContent(previewHost as PreviewHostElement, note, `${slot}:${key}`, chip);
            return;
          }
          const container = document.createElement('div');
          const header = document.createElement('div');
          header.className = 'ov-meta';
          header.textContent = `${slot}["${key}"]`;
          container.appendChild(header);
          container.appendChild(renderPayload(preview, true));
          setPreviewContent(previewHost as PreviewHostElement, container, `${slot}:${key}`, chip);
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

function renderAnnDataPayload(payload: AnnDataPayload): HTMLElement {
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

  const previewHost = document.createElement('div') as PreviewHostElement;
  previewHost.className = 'ov-preview-host';

  const target = payload.ref ?? payload.name ?? '';
  const umapKey = pickUMAPKey(payload.summary.obsm_keys);
  let requestNonce = 0;

  const showEmbedding = async (
    basis: string,
    colorBy: string | undefined,
    trigger: HTMLElement,
    sourceKey: string
  ): Promise<boolean> => {
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
    } catch (error) {
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

  const addPreviewButton = (label: string, preview: DataFramePayload | undefined) => {
    if (!preview) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ov-action-btn';
    button.textContent = label;
    button.onclick = () => {
      setPreviewContent(
        previewHost,
        renderDataFramePayload(preview, { withFooter: true }),
        label,
        button,
        'is-active'
      );
    };
    actions.appendChild(button);
  };

  addPreviewButton('Preview .obs', payload.previews?.obs);
  addPreviewButton('Preview .var', payload.previews?.var);

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

  rows.appendChild(
    createAnnDataSection(
      'obs',
      'obs',
      payload.summary.obs_columns,
      payload.summary.obs_columns_more,
      previewHost,
      undefined,
      umapKey
        ? async (_slot, key, trigger) =>
            showEmbedding(umapKey, `obs:${key}`, trigger, `embedding:${umapKey}:obs:${key}`)
        : undefined
    )
  );

  rows.appendChild(
    createAnnDataSection(
      'var',
      'var',
      payload.summary.var_columns,
      payload.summary.var_columns_more,
      previewHost
    )
  );

  rows.appendChild(
    createAnnDataSection(
      'uns',
      'uns',
      payload.summary.uns_keys,
      payload.summary.uns_keys_more,
      previewHost,
      payload.previews?.uns
    )
  );

  rows.appendChild(
    createAnnDataSection(
      'obsm',
      'obsm',
      payload.summary.obsm_keys,
      payload.summary.obsm_keys_more,
      previewHost,
      payload.previews?.obsm,
      umapKey
        ? async (_slot, key, trigger) => {
            if (key !== umapKey) {
              return false;
            }
            return showEmbedding(key, undefined, trigger, `embedding:${key}:default`);
          }
        : undefined
    )
  );

  rows.appendChild(
    createAnnDataSection(
      'layers',
      'layers',
      payload.summary.layers,
      payload.summary.layers_more,
      previewHost,
      payload.previews?.layers
    )
  );

  root.appendChild(rows);
  root.appendChild(previewHost);
  return root;
}

export function renderPayload(payload: SupportedPayload, _emphasizeFooter = false): HTMLElement {
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

export class OmicVerseRenderer extends Widget implements IRenderMime.IRenderer {
  constructor(private readonly mimeType: string) {
    super();
    this.addClass('ov-renderer');
  }

  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this.node.replaceChildren();
    const payload = model.data[this.mimeType] as SupportedPayload | undefined;
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
