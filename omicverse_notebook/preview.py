"""Kernel-side preview builders for the OmicVerse JupyterLab plugin."""

from __future__ import annotations

import ast
from collections import OrderedDict
from typing import Any, Dict, Mapping, Optional

import pandas as pd
from IPython import get_ipython
from IPython.core.formatters import JSONFormatter

DATAFRAME_MIME_TYPE = "application/vnd.omicverse.dataframe+json"
ANNDATA_MIME_TYPE = "application/vnd.omicverse.anndata+json"
_PREVIEW_REGISTRY: "OrderedDict[str, Any]" = OrderedDict()
_PREVIEW_REGISTRY_LIMIT = 128


def _json_safe_frame(frame: pd.DataFrame, max_rows: int, max_cols: int) -> Dict[str, Any]:
    preview = frame.iloc[:max_rows, :max_cols].copy()
    preview = preview.astype(object).where(pd.notna(preview), None)
    return {
        "columns": [str(col) for col in preview.columns],
        "index": [str(idx) for idx in preview.index],
        "data": preview.values.tolist(),
    }


def _df_payload(
    frame: pd.DataFrame,
    name: Optional[str] = None,
    max_rows: int = 40,
    max_cols: int = 12,
) -> Dict[str, Any]:
    return {
        "type": "dataframe",
        "name": name,
        "shape": [int(frame.shape[0]), int(frame.shape[1])],
        "dtypes": {str(col): str(dtype) for col, dtype in frame.dtypes.items()},
        "table": _json_safe_frame(frame, max_rows=max_rows, max_cols=max_cols),
    }


def _repr_payload(
    value: Any,
    name: Optional[str] = None,
    max_chars: int = 4000,
) -> Dict[str, Any]:
    try:
        text = repr(value)
    except Exception:
        text = "<unavailable>"
    return {
        "type": "content",
        "name": name,
        "content": text[:max_chars],
    }


def _matrix_payload(
    value: Any,
    name: Optional[str] = None,
    max_rows: int = 12,
    max_cols: int = 12,
) -> Dict[str, Any]:
    try:
        import numpy as np
    except Exception:
        return _repr_payload(value, name=name)

    try:
        from scipy import sparse
    except Exception:
        sparse = None

    array = value
    if sparse is not None and sparse.issparse(array):
        array = array[:max_rows, :max_cols].toarray()
    elif hasattr(array, "shape") and len(getattr(array, "shape", ())) >= 2:
        array = array[:max_rows, :max_cols]

    if not isinstance(array, np.ndarray):
        try:
            array = np.asarray(array)
        except Exception:
            return _repr_payload(value, name=name)

    if array.ndim == 1:
        array = array.reshape(-1, 1)
    if array.ndim != 2:
        return {
            "type": "array",
            "name": name,
            "shape": [int(dim) for dim in getattr(value, "shape", array.shape)],
            "dtype": str(getattr(value, "dtype", array.dtype)),
            "content": repr(value)[:4000],
        }

    table = {
        "columns": [str(i) for i in range(array.shape[1])],
        "index": [str(i) for i in range(array.shape[0])],
        "data": array.tolist(),
    }
    return {
        "type": "array",
        "name": name,
        "shape": [int(dim) for dim in getattr(value, "shape", array.shape)],
        "dtype": str(getattr(value, "dtype", array.dtype)),
        "table": table,
    }


def _pack_keys(keys: Any, limit: int) -> Dict[str, Any]:
    values = [str(key) for key in list(keys)]
    kept = values[:limit]
    return {
        "keys": kept,
        "total": len(values),
        "more": max(0, len(values) - len(kept)),
    }


def _mapping_previews(
    mapping: Mapping[str, Any],
    slot_name: str,
    max_items: int,
    max_rows: int,
    max_cols: int,
) -> Dict[str, Any]:
    previews: Dict[str, Any] = {}
    for key in list(mapping.keys())[:max_items]:
        label = f'{slot_name}["{key}"]'
        value = mapping[key]
        if isinstance(value, pd.DataFrame):
            previews[str(key)] = _df_payload(value, name=label, max_rows=max_rows, max_cols=max_cols)
        elif hasattr(value, "shape"):
            previews[str(key)] = _matrix_payload(value, name=label, max_rows=min(max_rows, 10), max_cols=min(max_cols, 10))
        else:
            previews[str(key)] = _repr_payload(value, name=label)
    return previews


def _anndata_payload(
    value: Any,
    name: Optional[str] = None,
    max_rows: int = 24,
    max_cols: int = 10,
    key_limit: int = 18,
    nested_preview_limit: int = 3,
) -> Dict[str, Any]:
    obs_pack = _pack_keys(value.obs.columns, key_limit)
    var_pack = _pack_keys(value.var.columns, key_limit)
    uns_pack = _pack_keys(value.uns.keys() if getattr(value, "uns", None) else [], key_limit)
    obsm_pack = _pack_keys(value.obsm.keys() if getattr(value, "obsm", None) else [], key_limit)
    layers_pack = _pack_keys(value.layers.keys() if getattr(value, "layers", None) else [], key_limit)

    return {
        "type": "anndata",
        "name": name,
        "summary": {
            "shape": [int(value.n_obs), int(value.n_vars)],
            "obs_columns": obs_pack["keys"],
            "obs_columns_total": obs_pack["total"],
            "obs_columns_more": obs_pack["more"],
            "var_columns": var_pack["keys"],
            "var_columns_total": var_pack["total"],
            "var_columns_more": var_pack["more"],
            "uns_keys": uns_pack["keys"],
            "uns_keys_total": uns_pack["total"],
            "uns_keys_more": uns_pack["more"],
            "obsm_keys": obsm_pack["keys"],
            "obsm_keys_total": obsm_pack["total"],
            "obsm_keys_more": obsm_pack["more"],
            "layers": layers_pack["keys"],
            "layers_total": layers_pack["total"],
            "layers_more": layers_pack["more"],
        },
        "previews": {
            "obs": _df_payload(value.obs, name=f"{name}.obs" if name else ".obs", max_rows=max_rows, max_cols=max_cols),
            "var": _df_payload(value.var, name=f"{name}.var" if name else ".var", max_rows=max_rows, max_cols=max_cols),
            "uns": _mapping_previews(value.uns, f"{name}.uns" if name else "uns", nested_preview_limit, max_rows, max_cols)
            if getattr(value, "uns", None)
            else {},
            "obsm": _mapping_previews(value.obsm, f"{name}.obsm" if name else "obsm", nested_preview_limit, max_rows, max_cols)
            if getattr(value, "obsm", None)
            else {},
            "layers": _mapping_previews(
                value.layers,
                f"{name}.layers" if name else "layers",
                nested_preview_limit,
                max_rows,
                max_cols,
            )
            if getattr(value, "layers", None)
            else {},
        },
    }


def _register_preview_value(value: Any) -> str:
    token = f"obj:{id(value):x}"
    _PREVIEW_REGISTRY[token] = value
    _PREVIEW_REGISTRY.move_to_end(token)
    while len(_PREVIEW_REGISTRY) > _PREVIEW_REGISTRY_LIMIT:
        _PREVIEW_REGISTRY.popitem(last=False)
    return token


def _resolve_reference_or_expression(target: str, namespace: Mapping[str, Any]) -> Any:
    if target in _PREVIEW_REGISTRY:
        return _PREVIEW_REGISTRY[target]
    if str(target).startswith("obj:"):
        raise KeyError("This preview is stale after a kernel restart. Re-run the cell to refresh the AnnData output.")
    return resolve_expression(target, namespace)


def _categorical_color(index: int) -> str:
    palette = [
        "#1f77b4",
        "#ff7f0e",
        "#2ca02c",
        "#d62728",
        "#9467bd",
        "#8c564b",
        "#e377c2",
        "#7f7f7f",
        "#bcbd22",
        "#17becf",
        "#4f46e5",
        "#059669",
        "#dc2626",
        "#ea580c",
        "#0891b2",
        "#7c3aed",
    ]
    return palette[index % len(palette)]


def _embedding_candidates(basis: str) -> list[str]:
    basis = str(basis)
    candidates = [basis]
    if basis.startswith("X_"):
        candidates.extend([basis[2:], basis.upper(), basis.lower()])
    else:
        candidates.extend([f"X_{basis}", basis.upper(), basis.lower()])
    return [candidate for i, candidate in enumerate(candidates) if candidate and candidate not in candidates[:i]]


def _extract_embedding(adata: Any, basis: str) -> tuple[str, Any]:
    if not getattr(adata, "obsm", None):
        raise KeyError("AnnData object has no obsm embeddings")
    for candidate in _embedding_candidates(basis):
        if candidate in adata.obsm:
            return candidate, adata.obsm[candidate]
    raise KeyError(f'Embedding "{basis}" not found in adata.obsm')


def _sample_indices(n_obs: int, max_points: int) -> list[int]:
    if n_obs <= max_points:
        return list(range(n_obs))
    step = max(1, n_obs // max_points)
    sampled = list(range(0, n_obs, step))
    if len(sampled) > max_points:
        sampled = sampled[:max_points]
    return sampled


def _hover_texts(obs_names: list[str], color_label: Optional[str], color_values: list[Any]) -> list[str]:
    if not color_label:
        return obs_names
    texts = []
    for obs_name, color_value in zip(obs_names, color_values):
        label = "NA" if color_value is None else str(color_value)
        texts.append(f"{obs_name}<br>{color_label}: {label}")
    return texts


def plot_embedding_payload(
    target: str,
    basis: str = "X_umap",
    color_by: Optional[str] = None,
    namespace: Optional[Mapping[str, Any]] = None,
    max_points: int = 50000,
) -> Dict[str, Any]:
    if namespace is None:
        ipython = get_ipython()  # type: ignore[name-defined]
        if ipython is None:
            raise RuntimeError("No active IPython shell was found")
        namespace = ipython.user_ns

    adata = _resolve_reference_or_expression(target, namespace)
    if adata.__class__.__name__ != "AnnData":
        raise TypeError("Target is not an AnnData object")

    try:
        import numpy as np
    except Exception as exc:  # pragma: no cover - numpy is a runtime dependency for this feature
        raise RuntimeError("numpy is required for embedding previews") from exc

    key, embedding = _extract_embedding(adata, basis)
    coords = np.asarray(embedding)
    if coords.ndim != 2 or coords.shape[1] < 2:
        raise ValueError(f'Embedding "{key}" must be a 2D matrix with at least two columns')

    sampled_idx = _sample_indices(int(coords.shape[0]), max_points=max_points)
    sampled = coords[sampled_idx, :2]
    x = [float(value) for value in sampled[:, 0].tolist()]
    y = [float(value) for value in sampled[:, 1].tolist()]
    obs_names = [str(adata.obs_names[i]) for i in sampled_idx]

    payload: Dict[str, Any] = {
        "type": "embedding",
        "name": target,
        "ref": _register_preview_value(adata),
        "basis": key,
        "total_points": int(coords.shape[0]),
        "shown_points": len(sampled_idx),
        "sampled": len(sampled_idx) < int(coords.shape[0]),
        "x": x,
        "y": y,
    }

    if not color_by:
        payload["color"] = {"mode": "none"}
        payload["hover"] = obs_names
        return payload

    column_name = color_by[4:] if color_by.startswith("obs:") else color_by
    if column_name not in adata.obs.columns:
        payload["color"] = {"mode": "none"}
        payload["hover"] = obs_names
        payload["warning"] = f'obs column "{column_name}" was not found'
        return payload

    series = adata.obs.iloc[sampled_idx][column_name]
    if pd.api.types.is_numeric_dtype(series) and not pd.api.types.is_bool_dtype(series):
        numeric = pd.to_numeric(series, errors="coerce")
        values = [None if pd.isna(value) else float(value) for value in numeric.tolist()]
        finite = [value for value in values if value is not None]
        payload["color"] = {
            "mode": "continuous",
            "column": str(column_name),
            "values": values,
            "min": min(finite) if finite else None,
            "max": max(finite) if finite else None,
        }
        payload["hover"] = _hover_texts(obs_names, str(column_name), values)
        return payload

    labels: list[str] = []
    codes: list[int] = []
    values: list[str] = []
    label_to_code: Dict[str, int] = {}
    for raw_value in series.astype(object).where(pd.notna(series), None).tolist():
        label = "NA" if raw_value is None else str(raw_value)
        if label not in label_to_code:
            label_to_code[label] = len(labels)
            labels.append(label)
        codes.append(label_to_code[label])
        values.append(label)

    payload["color"] = {
        "mode": "categorical",
        "column": str(column_name),
        "labels": labels,
        "codes": codes,
        "palette": [_categorical_color(index) for index in range(len(labels))],
    }
    payload["hover"] = _hover_texts(obs_names, str(column_name), values)
    return payload


def preview_value(
    value: Any,
    name: Optional[str] = None,
    max_rows: int = 40,
    max_cols: int = 12,
    key_limit: int = 18,
    nested_preview_limit: int = 3,
) -> Dict[str, Any]:
    if isinstance(value, pd.DataFrame):
        payload = _df_payload(value, name=name, max_rows=max_rows, max_cols=max_cols)
    elif isinstance(value, pd.Series):
        series_name = str(value.name) if value.name is not None else "value"
        payload = _df_payload(
            value.to_frame(name=series_name),
            name=name,
            max_rows=max_rows,
            max_cols=1,
        )
    elif value.__class__.__name__ == "AnnData":
        payload = _anndata_payload(
            value,
            name=name,
            max_rows=min(max_rows, 24),
            max_cols=min(max_cols, 10),
            key_limit=key_limit,
            nested_preview_limit=nested_preview_limit,
        )
    elif hasattr(value, "shape"):
        payload = _matrix_payload(value, name=name, max_rows=min(max_rows, 12), max_cols=min(max_cols, 12))
    else:
        payload = _repr_payload(value, name=name)

    payload["ref"] = _register_preview_value(value)
    return payload


def _resolve_node(node: ast.AST, namespace: Mapping[str, Any]) -> Any:
    if isinstance(node, ast.Name):
        if node.id not in namespace:
            raise KeyError(f'Variable "{node.id}" not found')
        return namespace[node.id]

    if isinstance(node, ast.Attribute):
        base = _resolve_node(node.value, namespace)
        if node.attr.startswith("_"):
            raise KeyError("Private attributes are not allowed")
        return getattr(base, node.attr)

    if isinstance(node, ast.Subscript):
        base = _resolve_node(node.value, namespace)
        key = _resolve_subscript_key(node.slice)
        return base[key]

    raise KeyError("Only names, attributes, and string/integer subscripts are allowed")


def _resolve_subscript_key(node: ast.AST) -> Any:
    if isinstance(node, ast.Constant) and isinstance(node.value, (str, int)):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant):
        if isinstance(node.operand.value, int):
            return -node.operand.value
    raise KeyError("Only string and integer subscripts are allowed")


def resolve_expression(expression: str, namespace: Mapping[str, Any]) -> Any:
    expression = expression.strip()
    if not expression:
        raise KeyError("Expression is empty")
    tree = ast.parse(expression, mode="eval")
    return _resolve_node(tree.body, namespace)


def preview_variable(
    expression: str,
    namespace: Optional[Mapping[str, Any]] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    if namespace is None:
        ipython = get_ipython()  # type: ignore[name-defined]
        if ipython is None:
            raise RuntimeError("No active IPython shell was found")
        namespace = ipython.user_ns

    value = resolve_expression(expression, namespace)
    return preview_value(value, name=expression, **kwargs)


def _ensure_json_formatter(ipython: Any, mime_type: str) -> JSONFormatter:
    formatter = ipython.display_formatter.formatters.get(mime_type)
    if formatter is None:
        formatter = JSONFormatter(parent=ipython.display_formatter)
        formatter.format_type = mime_type
        formatter.enabled = True
        ipython.display_formatter.formatters[mime_type] = formatter
    return formatter


def _suppress_pandas_html(ipython: Any) -> None:
    html_formatter = ipython.display_formatter.formatters.get("text/html")
    if html_formatter is None:
        return

    # Force pandas objects to skip their default HTML repr so JupyterLab
    # selects the OmicVerse custom MIME renderer instead of the stock table.
    html_formatter.for_type_by_name(
        "pandas.core.frame",
        "DataFrame",
        lambda value: None,
    )
    html_formatter.for_type_by_name(
        "pandas.core.series",
        "Series",
        lambda value: None,
    )


def enable_formatters(ipython: Optional[Any] = None, **kwargs: Any) -> bool:
    if ipython is None:
        ipython = get_ipython()  # type: ignore[name-defined]
    if ipython is None:
        return False

    _suppress_pandas_html(ipython)

    dataframe_formatter = _ensure_json_formatter(ipython, DATAFRAME_MIME_TYPE)
    dataframe_formatter.for_type_by_name(
        "pandas.core.frame",
        "DataFrame",
        lambda value: preview_value(value, **kwargs),
    )
    dataframe_formatter.for_type_by_name(
        "pandas.core.series",
        "Series",
        lambda value: preview_value(value, **kwargs),
    )

    try:
        import anndata

        anndata_formatter = _ensure_json_formatter(ipython, ANNDATA_MIME_TYPE)
        anndata_formatter.for_type(
            anndata.AnnData,
            lambda value: preview_value(value, **kwargs),
        )
    except Exception:
        pass

    return True


def load_ipython_extension(ipython: Optional[Any]) -> None:
    enable_formatters(ipython)
