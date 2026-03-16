import { ISessionContext } from '@jupyterlab/apputils';
export declare function setSessionContextProvider(nextProvider: () => ISessionContext | null): void;
export declare function getSessionContext(): ISessionContext | null;
