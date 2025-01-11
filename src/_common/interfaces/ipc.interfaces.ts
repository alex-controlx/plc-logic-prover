import {IResultFromIpc} from "./result.class";

export interface IElectronApi {
    openExternal(uri: string): Promise<void>,
    sendIpcRequest<T>(channel: IpcPubTopic, data?: any): Promise<T>,
    ipcSubscriber(channel: IpcSubTopic, func: (data: any) => any): any,
    getAppVersion(): Promise<string>,
    getClientId(): Promise<string>,
}

export enum IpcPubTopic {
    closeRunner = "closeRunner",
    isRunnerActive = "isRunnerActive",
    setInvalidUnits = "setInvalidUnits",
    openRunner = "openRunner",
    abortRunner = "abortRunner",
    initiateRunner = "initiateRunner",
    getResults = "getResults",
    getAppConfig = "getAppConfig",
    setAppConfig = "setAppConfig",
}

export enum IpcSubTopic {
    onCreateNewDialog = "onCreateNewDialog",
    onProjectImportExport = "onProjectImportExport",
    onEpError = "onEpError",
    onRunnerStatusChange = "onRunnerStatusChange",
    onNewRunnerResult = "onNewRunnerResult",
    // this is straight through comms from appWindow to testRunnerWindow
    onInvalidUnitsUpdate = "onInvalidUnitsUpdate",
}

export enum IpcRemote {
    appVersion = "appVersion",
    getClientId = "getClientId"
}

export interface IpcRequest {
    responseChannel: string;
    data: any;
}

export interface IpcError {
    ipcError: boolean,
    message: string,
}

export function newIpcError(message: string): IpcError {
    return { ipcError: true, message }
}

export interface IRunnerStatus {
    isRunning: boolean,
    error?: string,
    results?: IResultFromIpc[]
}

export interface IProjectExpImp {
    type: "export" | "import"
}

export enum DialogRequest {
    NewProject,
    NewActionSet,
}

