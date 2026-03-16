import { Widget } from '@lumino/widgets';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
export declare const DATAFRAME_MIME_TYPE = "application/vnd.omicverse.dataframe+json";
export declare const ANNDATA_MIME_TYPE = "application/vnd.omicverse.anndata+json";
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
export declare function renderPayload(payload: SupportedPayload, _emphasizeFooter?: boolean): HTMLElement;
export declare class OmicVerseRenderer extends Widget implements IRenderMime.IRenderer {
    private readonly mimeType;
    constructor(mimeType: string);
    renderModel(model: IRenderMime.IMimeModel): Promise<void>;
}
export {};
