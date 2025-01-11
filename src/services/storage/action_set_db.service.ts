import {actionSetsLocalForage as db} from "./localforage.config";
import Logger from "../../_ui_common/logger.service";
import {ActionSet, IActionSet} from "../../_common/interfaces";

const logger = new Logger("ActionSetDbService");

const actionSets = new Map<string, ActionSet>();
let isInitCompleted = false;

export class ActionSetDbService {

    constructor() {
        if (!isInitCompleted)
            throw new Error("ActionSetDbService wasn't initialised yet. Call ActionSetDbService.init() first.");
    }

    static async init() {
        if (isInitCompleted) return;
        actionSets.clear();
        await db.iterate((actionSetObj: IActionSet, actionSetId) => {
            const actionSet = ActionSet.createFrom(actionSetObj);
            actionSets.set(actionSetId, actionSet);
        });
        isInitCompleted = true;
    }

    getActionSet(actionSetId: string): ActionSet | undefined {
        const actionSet = actionSets.get(actionSetId);
        if (!actionSet) return;
        return actionSet.getIdentical();
    }

    async getActionSetFromDb(actionSetId: string): Promise<ActionSet | undefined> {
        logger.log(`Getting "${actionSetId}" from Action Set DB`);
        const actionSetObj = await db.getItem<IActionSet>(actionSetId);
        if (!actionSetObj) return;
        return ActionSet.createFrom(actionSetObj);
    }

    async getActionSetsFromDb(): Promise<Map<string, ActionSet>> {
        const actionSetsFromDb = new Map<string, ActionSet>();
        await db.iterate((value: ActionSet, key) => {
            actionSetsFromDb.set(key, value);
        });
        return actionSetsFromDb;
    }

    getSize(): number {
        return actionSets.size;
    }

    public async count(): Promise<number> {
        return db.length();
    }


    async setActionSet(actionSet: ActionSet): Promise<ActionSet> {
        actionSet.modifiedOn = Date.now();
        logger.log(`Setting "${actionSet.name}" in ActionSets DB`);
        const addedActionSet = await db.setItem(actionSet.id, actionSet); // returns the same object reference
        actionSets.set(actionSet.id, actionSet.getIdentical());
        return addedActionSet;
    }

    async deleteActionSet(actionSetId: string): Promise<void> {
        logger.log(`Deleting ${actionSetId} from ActionSets DB`);
        await db.removeItem(actionSetId);
        actionSets.delete(actionSetId);
    }

    async clearDb() {
        logger.log(`Clearing ActionSets DB`);
        await db.clear();
        actionSets.clear();
    }

    async removeActionUnits(actionSet: ActionSet, actionUnitIds: string[]) {
        const len = actionSet.actionUnitIds.length;
        for (let i = len; i >= 0; i--) {
            if (actionUnitIds.includes(actionSet.actionUnitIds[i]))
                actionSet.actionUnitIds.splice(i, 1);
        }
        await this.setActionSet(actionSet);
    }
}

// export function getActionSetCopyFrom(actionSet: ActionSet): ActionSet {
//     return {
//         ...actionSet,
//         actionUnitIds: [...actionSet.actionUnitIds],
//     }
// }
