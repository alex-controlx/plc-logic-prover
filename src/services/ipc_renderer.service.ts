import {
    IpcPubTopic,
    IpcSubTopic,
    IRunnerStatus,
    IProjectExpImp, DialogRequest
} from "../_common/interfaces/ipc.interfaces";
import Logger from "../_ui_common/logger.service";
import PubSub_LP, {EventTopic} from "./_pubsub.aclass";
import {IResultFromIpc} from "../_common/interfaces/result.class";
import {IInvalidUnitMessage} from "../_common/action-unit";
import {AppConfig, IProjectTransfer} from "../_common/interfaces";

const logger = new Logger("IpcRendererService");

const sendIpcRequest = window.electronApi? window.electronApi.sendIpcRequest : undefined;
const ipcSubscriber = window.electronApi? window.electronApi.ipcSubscriber : undefined;

let isRegistered = false;

export default class IpcRendererService extends PubSub_LP {

    public registerIpcSubscribers(isRunnerWindow: boolean) {
        logger.log("registerIpcSubscribers() then isRegistered = " + isRegistered);
        if (isRegistered || !window.electronApi) return;

        if (isRunnerWindow) {
            subscribeToIpcChannel(IpcSubTopic.onNewRunnerResult, (result: IResultFromIpc) => {
                this.dispatchEvent(EventTopic.onRunnerResultFromElectron, result);
            })

            subscribeToIpcChannel(IpcSubTopic.onInvalidUnitsUpdate, (invalidUnits: IInvalidUnitMessage[]) => {
                this.dispatchEvent(EventTopic.onInvalidUnitsFromElectron, invalidUnits);
            })
        }

        if (!isRunnerWindow) {
            subscribeToIpcChannel(IpcSubTopic.onEpError, (message: string) => {
                this.dispatchEvent(EventTopic.onEpError, message);
            })

            subscribeToIpcChannel(IpcSubTopic.onProjectImportExport, (config: IProjectExpImp) => {
                this.dispatchEvent(EventTopic.onProjectImportExport, config);
            })

            subscribeToIpcChannel(IpcSubTopic.onCreateNewDialog, (config: IProjectExpImp) => {
                this.dispatchEvent(EventTopic.onCreateNewDialog, config);
            })
        }

        subscribeToIpcChannel(IpcSubTopic.onRunnerStatusChange, (status: IRunnerStatus) => {
            this.dispatchEvent(EventTopic.onRunnerStatusChange, status);
        })

        isRegistered = true;
    }

    public onNewResultSubscriber(callback: (result: IResultFromIpc) => void) {
        return this.subscribeOnChange(EventTopic.onRunnerResultFromElectron, callback)
    }

    public onInvalidUnitsFromElectronSubscriber(callback: (invalidUnits: IInvalidUnitMessage[]) => void) {
        return this.subscribeOnChange(EventTopic.onInvalidUnitsFromElectron, callback)
    }

    public onEpErrorSubscriber(callback: (message: string) => void) {
        return this.subscribeOnChange(EventTopic.onEpError, callback)
    }

    public onProjectExpImpSubscriber(callback: (config: IProjectExpImp) => void) {
        return this.subscribeOnChange(EventTopic.onProjectImportExport, callback)
    }

    public onCreatNewDialog(callback: (dialogType: DialogRequest) => void) {
        return this.subscribeOnChange(EventTopic.onCreateNewDialog, callback)
    }

    public onRunnerStatusChangeSubscriber(callback: (status: IRunnerStatus) => void) {
        return this.subscribeOnChange(EventTopic.onRunnerStatusChange, callback)
    }



    public async sendDataToElectron(projectExport: IProjectTransfer) {
        if (!sendIpcRequest) {
            logger.error("IPC01 Electron is disabled or not ready yet.");
            return;
        }
        await sendIpcRequest(IpcPubTopic.initiateRunner, projectExport)
    }

    public async sendInvalidUnits(invalidUnits: IInvalidUnitMessage[]) {
        if (!sendIpcRequest) return;
        await sendIpcRequest(IpcPubTopic.setInvalidUnits, invalidUnits)
    }


    public async openRunner() {
        if (!sendIpcRequest) {
            logger.error("IPC02 Electron is disabled or not ready yet."); return;
        }
        await sendIpcRequest(IpcPubTopic.openRunner);
    }
    public async closeRunner() {
        if (!sendIpcRequest) {
            logger.error("IPC03 Electron is disabled or not ready yet."); return;
        }
        await sendIpcRequest(IpcPubTopic.closeRunner);
    }

    public async abortRunner() {
        if (!sendIpcRequest) {
            logger.error("IPC04 Electron is disabled or not ready yet."); return;
        }
        await sendIpcRequest(IpcPubTopic.abortRunner);
    }

    async isRunnerActive(): Promise<boolean> {
        if (!sendIpcRequest) return false;
        return await sendIpcRequest(IpcPubTopic.isRunnerActive)
    }

    async getClientId(): Promise<string> {
        if (!window.electronApi) return "";
        return await window.electronApi.getClientId()
    }

    public async getAppConfig(): Promise<AppConfig | undefined> {
        if (!sendIpcRequest) {
            logger.error("IPC05 Electron is disabled or not ready yet."); return;
        }
        return await sendIpcRequest(IpcPubTopic.getAppConfig);
    }

    public async setAppConfig(appConfig: AppConfig) {
        if (!sendIpcRequest) return;
        await sendIpcRequest(IpcPubTopic.setAppConfig, appConfig)
    }
}



function subscribeToIpcChannel(channel: string, callback: (data: any) => void) {
    if (ipcSubscriber) return ipcSubscriber(channel, callback);

    throw new Error("IPC06 ipcRenderer is not ready!");
}
