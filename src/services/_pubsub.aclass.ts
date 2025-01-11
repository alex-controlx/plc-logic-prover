import EventEmitter from "events";

export enum EventTopic {
    onCreateNewDialog = "onCreateNewDialog",
    onProjectImportExport = "onProjectImportExport",
    onEpError = "onEpError",
    onRunnerStatusChange = "onRunnerStatusChange",
    TagDeleted = "TagDeleted",
    ShowToast = "ShowToast",
    TagAdded = "TagAdded",
    TagUpdated = "TagUpdated",
    ShowActionUnit = "ShowActionUnit",
    ConfirmAlert = "ConfirmAlert",
    PromptAlert = "PromptAlert",
    ShowPage = "ShowPage",
    HideSidebar = "HideSidebar",
    DisplaySpinner = "DisplaySpinner",
    DpIsDirty = "DpIsDirty",
    onRunnerResultFromElectron = "onRunnerResultFromElectron",
    onInvalidUnitsFromElectron = "onInvalidUnitsFromElectron",
    onInvalidUnits = "onInvalidUnits",
}

const eventEmitter = new EventEmitter();

export default abstract class PubSub_LP {
    protected dispatchEvent(topic: string, data?: any) {
        eventEmitter.emit(topic, data)
    }

    protected subscribeOnChange(topic: string, callback: (data: any) => void): () => void {
        eventEmitter.addListener(topic, callback);
        return () => {
            eventEmitter.removeListener(topic, callback);
        }
    }
}
