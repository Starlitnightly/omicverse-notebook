import { MainAreaWidget } from '@jupyterlab/apputils';
import { ISessionContext } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
type InspectorOptions = {
    getSessionContext: () => ISessionContext | null;
};
declare class InspectorBody extends Widget {
    private readonly options;
    private readonly inputNode;
    private readonly statusNode;
    private readonly outputNode;
    private readonly buttonNode;
    constructor(options: InspectorOptions);
    setExpression(expression: string): void;
    inspectCurrentValue(): Promise<void>;
    private setStatus;
}
export declare function createInspectorWidget(options: InspectorOptions): MainAreaWidget<InspectorBody>;
export {};
