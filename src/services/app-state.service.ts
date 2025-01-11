import Logger from "../_ui_common/logger.service";
import {appConfigLocalForage as db} from "./storage/localforage.config";
import {
    defaultAppState,
    IAppState,
    ITagPageState,
    IDetailsPanelState, IWorkspaceState,
} from "../_common/interfaces";
import {SAVE_APP_STATE_TIMEOUT} from "../_common/defaults";

const logger = new Logger("AppStateService");

let saveStateTimeoutId: number = 0;
const appStateId = "app-state";
const appState: IAppState = defaultAppState();

export class AppStateService {
    static async init() {
        if (appState.modifiedOn) return;

        const stateFromDb = await getState();
        if (stateFromDb) {
            appState.modifiedOn = stateFromDb.modifiedOn;
            // fill in the missing properties
            appState.workspace = {...appState.workspace, ...stateFromDb.workspace};
            appState.detailsPanel = {...appState.detailsPanel, ...stateFromDb.detailsPanel};
            appState.sidebar = {...appState.sidebar, ...stateFromDb.sidebar};
            appState.tagPage = {...appState.tagPage, ...stateFromDb.tagPage};
        } else {
            saveState();
        }

        // active properties and not from
        appState.detailsPanel.isDirty = false;
    }

    public getDetailsPanel(): IDetailsPanelState {
        return appState.detailsPanel
    }

    public setDetailsPanel(detailsPanelState: IDetailsPanelState) {
        appState.detailsPanel = {
            ...detailsPanelState
        };
        saveState();
    }

    public sidebar() {
        return {
            getExpanded: (): string[] => {
                return appState.sidebar.expandedSets
            },
            addExpandedId: (actionSetIds: string[]) => {
                let someAdded = false;
                for (const actionSetId of actionSetIds) {
                    if (appState.sidebar.expandedSets.includes(actionSetId)) continue;
                    appState.sidebar.expandedSets.push(actionSetId);
                    someAdded = true;
                }
                if (someAdded) saveState();
            },
            removeExpandedId: (actionSetId: string) => {
                const index = appState.sidebar.expandedSets.findIndex(item => item === actionSetId);
                appState.sidebar.expandedSets.splice(index, 1);
                saveState();
            },
            removeAllExpandedIds: () => {
                appState.sidebar.expandedSets.length = 0;
                saveState();
            },
        };
    }


    public getWorkspace(): IWorkspaceState {
        return appState.workspace
    }

    public setWorkspace(workspaceState: IWorkspaceState) {
        appState.workspace = {
            ...workspaceState
        };
        saveState();
    }


    // public detailsPanel() {
    //     return {
    //         setDetailedPanel: (displayed: DpDisplayedType, actionUnitId?: string) => {
    //             appState.detailsPanel.displayed = displayed;
    //             appState.detailsPanel.actionUnitId = actionUnitId || "";
    //             saveState();
    //         },
    //         getSelectedType: (): DpDisplayedType => {
    //             return appState.detailsPanel.displayed
    //         },
    //         getSelectedId: (): string => {
    //             return appState.detailsPanel.actionUnitId
    //         },
    //     }
    // }
}

// export class DetailsPanelState implements IDetailsPanelState {
//     get displayed(): DpDisplayedType {
//         return appState.detailsPanel.displayed;
//     }
//     get actionUnitId(): string {
//         return appState.detailsPanel.actionUnitId;
//     }
//
//     public setDetailedPanel(displayed: DpDisplayedType, actionUnitId: string = "") {
//         appState.detailsPanel.displayed = displayed;
//         appState.detailsPanel.actionUnitId = actionUnitId;
//         saveState();
//     }
// }




export class TagPageState implements ITagPageState {
    get selectedTagId(): string {
        return this._selectedTagId;
    }
    set selectedTagId(value: string) {
        this._selectedTagId = value;
        appState.tagPage.selectedTagId = value;
        saveState();
    }

    get columnWidths(): (number | null | undefined)[] {
        return this._columnWidths;
    }

    set columnWidths(value: (number | null | undefined)[]) {
        this._columnWidths = value;
        appState.tagPage.columnWidths = value;
        saveState();
    }

    get columnWidthsSmp(): (number | null | undefined)[] {
        return appState.tagPage.columnWidthsSmp;
    }

    set columnWidthsSmp(value: (number | null | undefined)[]) {
        appState.tagPage.columnWidthsSmp = value;
        saveState();
    }

    private _columnWidths = appState.tagPage.columnWidths;
    private _selectedTagId = appState.tagPage.selectedTagId;

    constructor() {
        if (!appState.modifiedOn) throw new Error("Call AppStateService.init() first!");
    }
}



async function getState(): Promise<IAppState | null> {
    logger.log(`Getting App State from DB`);
    return await db.getItem<IAppState>(appStateId);
}

function saveState() {
    clearTimeout(saveStateTimeoutId);
    saveStateTimeoutId = window.setTimeout(() => {
        appState.modifiedOn = Date.now();
        logger.log(`Setting App State in DB`);
        db.setItem(appStateId, appState).catch(e => logger.error(e));
    }, SAVE_APP_STATE_TIMEOUT);
}

// DO NOT DELETE
// async function deleteState() {
//     logger.log(`Cleaning App State DB`);
//     await db.dropInstance();
// }
