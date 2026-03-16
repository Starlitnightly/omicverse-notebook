import { ISessionContext } from '@jupyterlab/apputils';

let provider: (() => ISessionContext | null) | null = null;

export function setSessionContextProvider(nextProvider: () => ISessionContext | null): void {
  provider = nextProvider;
}

export function getSessionContext(): ISessionContext | null {
  return provider ? provider() : null;
}
