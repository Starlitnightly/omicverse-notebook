import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, ISessionContext } from '@jupyterlab/apputils';
import { IConsoleTracker } from '@jupyterlab/console';
import { INotebookTracker } from '@jupyterlab/notebook';
import { createInspectorWidget } from './inspector';
import { setSessionContextProvider } from './session';
import themePlugin from './theme';
import '../style/index.css';

const BRAND_LOGO_SELECTOR = '#jp-top-panel > .lm-Widget:first-child';
const BRAND_LOGO_APPLIED_ATTR = 'data-ov-brand-logo';
const BRAND_LOGO_STYLE_ID = 'ov-brand-logo-style';
const GREEN_NOTEBOOK_ICON_URL =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' viewBox='0 0 22 22'%3E` +
  `%3Cg fill='%2378AA95'%3E` +
  `%3Cpath d='M18.7 3.3v15.4H3.3V3.3h15.4m1.5-1.5H1.8v18.3h18.3l.1-18.3z'/%3E` +
  `%3Cpath d='M16.5 16.5l-5.4-4.3-5.6 4.3v-11h11z'/%3E` +
  `%3C/g%3E%3C/svg%3E")`;

function ensureBrandLogoStyles(): void {
  if (document.getElementById(BRAND_LOGO_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = BRAND_LOGO_STYLE_ID;
  style.textContent = `
    ${BRAND_LOGO_SELECTOR}[${BRAND_LOGO_APPLIED_ATTR}="true"] {
      position: relative;
      min-width: 32px;
      width: 32px;
      height: 32px;
      margin-right: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: center / 22px 22px no-repeat var(--ov-brand-logo-url);
    }

    ${BRAND_LOGO_SELECTOR}[${BRAND_LOGO_APPLIED_ATTR}="true"] > * {
      opacity: 0;
      pointer-events: none;
    }

    :root {
      --jp-icon-notebook: ${GREEN_NOTEBOOK_ICON_URL};
    }

    .jp-NotebookIcon {
      background-image: var(--jp-icon-notebook) !important;
    }
  `;
  document.head.appendChild(style);
}

function applyBrandLogo(logoUrl: string): boolean {
  const host = document.querySelector(BRAND_LOGO_SELECTOR) as HTMLElement | null;
  if (!host) {
    return false;
  }

  host.setAttribute(BRAND_LOGO_APPLIED_ATTR, 'true');
  host.style.setProperty('--ov-brand-logo-url', `url("${logoUrl}")`);
  host.setAttribute('aria-label', 'OmicVerse');
  host.setAttribute('title', 'OmicVerse');
  return true;
}

function resolveBrandLogoUrl(): string {
  const themeLink = document.querySelector(
    'link[href*="omicverse-notebook/index.css"], link[href*="omicverse-notebook/light/index.css"]'
  ) as HTMLLinkElement | null;
  const href = themeLink?.href;
  if (href) {
    return href.replace(/(?:light\/)?index\.css(?:\?.*)?$/, 'favicon.ico');
  }
  return `${window.location.origin}/lab/extensions/omicverse-notebook/static/favicon.ico`;
}

async function enableKernelFormatters(sessionContext: ISessionContext, enabledSessions: Set<string>): Promise<void> {
  await sessionContext.ready;
  const kernel = sessionContext.session?.kernel;
  if (!kernel) {
    return;
  }

  const sessionKey = `${sessionContext.session?.id ?? 'unknown'}:${kernel.id}`;
  if (enabledSessions.has(sessionKey)) {
    return;
  }

  const future = kernel.requestExecute({
    code: 'from omicverse_notebook import enable_all; enable_all()',
    stop_on_error: false,
    store_history: false,
    silent: false
  });

  try {
    await future.done;
    enabledSessions.add(sessionKey);
  } catch (error) {
    console.warn('OmicVerse Notebook could not enable kernel formatters automatically.', error);
  }
}

function getCurrentSessionContext(
  notebooks: INotebookTracker | null,
  consoles: IConsoleTracker | null
): ISessionContext | null {
  const notebook = notebooks?.currentWidget;
  if (notebook) {
    return notebook.sessionContext;
  }
  const consolePanel = consoles?.currentWidget;
  if (consolePanel) {
    return consolePanel.sessionContext;
  }
  return null;
}

const inspectorPlugin: JupyterFrontEndPlugin<void> = {
  id: 'omicverse-notebook:inspector',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [INotebookTracker, IConsoleTracker],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    notebooks: INotebookTracker | null,
    consoles: IConsoleTracker | null
  ) => {
    const enabledSessions = new Set<string>();
    setSessionContextProvider(() => getCurrentSessionContext(notebooks, consoles));
    let widget = createInspectorWidget({
      getSessionContext: () => getCurrentSessionContext(notebooks, consoles)
    });

    const openCommand = 'omicverse-notebook:open';
    const enableCommand = 'omicverse-notebook:enable-formatters';

    app.commands.addCommand(openCommand, {
      label: 'OmicVerse Notebook: Open',
      execute: () => {
        if (widget.isDisposed) {
          widget = createInspectorWidget({
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
        const sessionContext = notebooks.currentWidget?.sessionContext;
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
        const sessionContext = consoles.currentWidget?.sessionContext;
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

const brandingPlugin: JupyterFrontEndPlugin<void> = {
  id: 'omicverse-notebook:branding',
  autoStart: true,
  activate: () => {
    ensureBrandLogoStyles();
    const logoUrl = resolveBrandLogoUrl();
    if (applyBrandLogo(logoUrl)) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (applyBrandLogo(logoUrl)) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
};

export default [brandingPlugin, inspectorPlugin, themePlugin];
