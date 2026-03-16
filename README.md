# omicverse-notebook

JupyterLab plugin that brings the `omicverse-web` DataFrame and AnnData preview ideas into a standalone package.

It provides:

- Rich output renderers for `pandas.DataFrame`, `pandas.Series`, and `anndata.AnnData`
- A JupyterLab command that opens an `OmicVerse Notebook` panel for inspecting kernel variables by name
- Automatic formatter activation for the active notebook or console kernel when the JupyterLab frontend extension is loaded
- Color-coded DataFrame columns, sticky headers, compact shape cards, and AnnData slot summaries

## Scope

This package intentionally focuses on the display layer:

- kernel-side Python helpers turn variables into JSON preview payloads
- JupyterLab frontend plugins render those payloads and provide a lightweight inspector UI

It does not depend on the `omicverse-web` Flask APIs.

## Install

Development install:

```bash
cd omicverse-notebook
pip install -e .
```

For an end-user install, build a wheel first so the prebuilt labextension is bundled:

```bash
cd omicverse-notebook
jlpm install
jlpm build:prod
pip install .
```

## Enable rich output

If the frontend extension is loaded correctly, it will try to enable formatters automatically for the active notebook or console kernel.

Manual fallback:

```python
%load_ext omicverse_notebook
```

Or:

```python
from omicverse_notebook import enable_formatters
enable_formatters()
```

After that, displaying a DataFrame or AnnData object in a notebook cell will use the OmicVerse renderers.

## Inspector usage

Open Command Palette and run:

```text
OmicVerse Notebook: Open
```

If rich output still does not appear in an already-running kernel, run:

```text
OmicVerse Notebook: Enable Kernel Formatters
```

Then inspect variables like:

```text
df
adata
adata.obs
adata.layers["counts"]
adata.obsm["X_umap"]
```

## Notes

- The inspector executes a small helper snippet in the current kernel and expects the Python package to be installed in that kernel environment.
- AnnData is optional on install, but AnnData previews only activate if `anndata` is available in the kernel.
