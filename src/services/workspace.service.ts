import Logger from "../_ui_common/logger.service";
import PubSub_LP, {EventTopic} from "./_pubsub.aclass";
import {AppStateService} from "./app-state.service";

const logger = new Logger("WorkspaceService");

const appState = new AppStateService();
let workspaceState = appState.getWorkspace();

export default class WorkspaceService extends PubSub_LP {
    constructor() {
        super();
        logger.log("constructor()");
        workspaceState = appState.getWorkspace();
    }

    get isHiddenSidebar() {
        return workspaceState.isHiddenSidebar
    }

    public hideSidebar(value: boolean) {
        workspaceState.isHiddenSidebar = value;
        appState.setWorkspace(workspaceState);
        this.dispatchEvent(EventTopic.HideSidebar, value);
    }

    public hideSidebarSubscriber(callback: (value: boolean) => void) {
        return this.subscribeOnChange(EventTopic.HideSidebar, callback)
    }

}
