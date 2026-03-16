"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const renderers_1 = require("./renderers");
require("../style/index.css");
function createFactory(mimeType) {
    return {
        safe: true,
        mimeTypes: [mimeType],
        defaultRank: 1,
        createRenderer: () => new renderers_1.OmicVerseRenderer(mimeType)
    };
}
const dataframeMimePlugin = {
    id: 'omicverse-notebook:dataframe-mime',
    rendererFactory: createFactory(renderers_1.DATAFRAME_MIME_TYPE),
    rank: 1,
    dataType: 'json'
};
const anndataMimePlugin = {
    id: 'omicverse-notebook:anndata-mime',
    rendererFactory: createFactory(renderers_1.ANNDATA_MIME_TYPE),
    rank: 1,
    dataType: 'json'
};
exports.default = [dataframeMimePlugin, anndataMimePlugin];
