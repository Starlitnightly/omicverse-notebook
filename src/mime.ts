import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import {
  ANNDATA_MIME_TYPE,
  DATAFRAME_MIME_TYPE,
  OmicVerseRenderer
} from './renderers';
import '../style/index.css';

function createFactory(mimeType: string): IRenderMime.IRendererFactory {
  return {
    safe: true,
    mimeTypes: [mimeType],
    defaultRank: 1,
    createRenderer: () => new OmicVerseRenderer(mimeType)
  };
}

const dataframeMimePlugin: IRenderMime.IExtension = {
  id: 'omicverse-notebook:dataframe-mime',
  rendererFactory: createFactory(DATAFRAME_MIME_TYPE),
  rank: 1,
  dataType: 'json'
};

const anndataMimePlugin: IRenderMime.IExtension = {
  id: 'omicverse-notebook:anndata-mime',
  rendererFactory: createFactory(ANNDATA_MIME_TYPE),
  rank: 1,
  dataType: 'json'
};

export default [dataframeMimePlugin, anndataMimePlugin];
