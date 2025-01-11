import Logger, {appVersion} from "../_ui_common/logger.service";
import {IProjectExpImp} from "../_common/interfaces/ipc.interfaces";
import IpcRendererService from "./ipc_renderer.service";

const logger = new Logger("AppDialogsService");

enum DialogsTopic {
    onProjectExpImp = "onProjectExpImp",
    ProjectEditDialog = "ProjectEditDialog",
    ProjectNewDialog = "ProjectNewDialog",
    AuShowAddDialog = "AuShowAddDialog",
    AuShowMoveToDialog = "AuShowMoveToDialog",
    AuShowDeleteDialog = "AuShowDeleteDialog",
    AsShowEditDialog = "AsShowEditDialog",
    AsShowDeleteDialog = "AsShowDeleteDialog",
    appConfigShowDialog = "appConfigShowDialog",
}

const eventTarget = new EventTarget();


const downloadServerUrl = "https://dl.controlx.io"; // "http://localhost:4862"; //
const firewallCheckPath = downloadServerUrl + "/app/info";
let isFirewallEnabled = true;

export class ProjectDialogService {
    public showEditDialog() {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.ProjectEditDialog, {}));
    }
    public subscribeOnShowEditDialog(callback: () => void) {
        return subscribeOnChange(DialogsTopic.ProjectEditDialog, callback)
    }


    public showNewDialog() {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.ProjectNewDialog, {}));
    }
    public subscribeOnShowNewDialog(callback: () => void) {
        return subscribeOnChange(DialogsTopic.ProjectNewDialog, callback)
    }

    // this emulates call from IPC on Project Import / Export click from the menu
    public projectExpImp(config: IProjectExpImp) {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.onProjectExpImp, {detail: config}));
    }
    public onProjectExpImpSubscriber(callback: (config: IProjectExpImp) => void) {
        return subscribeOnChange(DialogsTopic.onProjectExpImp, callback)
    }

    // temporary not used, left for the proper firewall test and proper tracking via own server
    public isFirewallEnabled() {
        return isFirewallEnabled;
    }

    // temporary not used, left for the proper firewall test and proper tracking via own server
    public async testFirewall(page: string, callback?: (isFirewallEnabled: boolean) => void) {
        // if (!isFirewallEnabled) {
        //     if (typeof callback === "function") callback(isFirewallEnabled);
        //     return;
        // }
        const cid = await (new IpcRendererService()).getClientId() || "_testing_ui_";
        fetch(firewallCheckPath + "?cat=" + page + "&act=test-firewall&lab=" + appVersion, {
            headers: { "cid": cid }
        })
            .then(() => {
                isFirewallEnabled = false;
                console.log('Firewall allows the app to connect to PLCs.');
            })
            .catch(() => {
                isFirewallEnabled = true;
                console.log('No internet connection found. App is running in offline mode.');
            })
            .finally(() => {
                if (typeof callback === "function") callback(isFirewallEnabled);
            })
    }
}



export class ActionUnitDialogService {
    public showAddDialog(actionSetId?: string) {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.AuShowAddDialog, {detail: actionSetId}));
    }
    public showAddDialogSubscriber(callback: (actionSetId?: string) => void) {
        return subscribeOnChange(DialogsTopic.AuShowAddDialog, callback)
    }


    public showMoveToDialog(actionUnitId: string) {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.AuShowMoveToDialog, {detail: actionUnitId}));
    }
    public showMoveToDialogSubscriber(callback: (actionUnitId: string) => void) {
        return subscribeOnChange(DialogsTopic.AuShowMoveToDialog, callback)
    }


    public showDeleteDialog(actionUnitId: string) {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.AuShowDeleteDialog, {detail: actionUnitId}));
    }
    public showDeleteDialogSubscriber(callback: (actionUnitId: string) => void) {
        return subscribeOnChange(DialogsTopic.AuShowDeleteDialog, callback)
    }
}




export class ActionSetDialogService {
    public showEditDialog(actionSetId?: string) {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.AsShowEditDialog, {detail: actionSetId}));
    }
    public showEditDialogSubscriber(callback: (actionSetId?: string) => void) {
        return subscribeOnChange(DialogsTopic.AsShowEditDialog, callback)
    }


    public showDeleteDialog(actionSetId: string) {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.AsShowDeleteDialog, {detail: actionSetId}));
    }
    public showDeleteDialogSubscriber(callback: (actionSetId: string) => void) {
        return subscribeOnChange(DialogsTopic.AsShowDeleteDialog, callback)
    }
}

export class AppConfigDialogService {
    public showConfigDialog() {
        eventTarget.dispatchEvent(new CustomEvent(DialogsTopic.appConfigShowDialog, {}));
    }
    public showConfigDialogSubscriber(callback: () => void) {
        return subscribeOnChange(DialogsTopic.appConfigShowDialog, callback)
    }
}





function subscribeOnChange (topic: DialogsTopic, callback: (data: any) => void): () => void {
    logger.log("Adding subscriber to AppDialogsService: " + topic);
    eventTarget.addEventListener(topic, listener);
    return function() {
        logger.log("Removing subscriber from AppDialogsService: " + topic);
        eventTarget.removeEventListener(topic, listener)
    };
    function listener(e: Event | CustomEvent) { if ("detail" in e) callback(e.detail) }
}
