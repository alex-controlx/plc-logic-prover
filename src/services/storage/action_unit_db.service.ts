import Logger, {ERRORS} from "../../_ui_common/logger.service";
import {actionUnitsLocalForage as db} from "./localforage.config";
import {LpUtils} from "../../_common/utils";
import {DEFAULT_AU_DUP_SUFFIX, IActionUnit} from "../../_common/action-unit";
import UnitsChecker from "./units-checker";

const logger = new Logger("ActionUnitDbService");

let isInitCompleted = false;
const actionUnits = new Map<string, IActionUnit>();
let unitChecker: UnitsChecker;

export class ActionUnitDbService {

    constructor() {
        if (!isInitCompleted)
            throw new Error("ActionUnitDbService wasn't initialised yet. Call ActionUnitDbService.init() first.");
    }

    static async init() {
        if (isInitCompleted) return;
        unitChecker = new UnitsChecker();
        actionUnits.clear();
        await db.iterate((value: IActionUnit, key) => {
            actionUnits.set(key, value);
        });
        isInitCompleted = true;
    }

    getActionUnit(actionUnitId: string): IActionUnit | undefined {
        const actionUnit = actionUnits.get(actionUnitId);
        if (!actionUnit) return;
        return getActionUnitCopyFrom(actionUnit);
    }

    async getActionUnitFromDb(actionUnitId: string): Promise<IActionUnit | null> {
        logger.log(`Getting "${actionUnitId}" from ActionUnits DB`);
        return db.getItem(actionUnitId);
    }

    async getActionUnitsFromDb(): Promise<Map<string, IActionUnit>> {
        const actionUnitsFromDb = new Map<string, IActionUnit>();
        await db.iterate((value: IActionUnit, key) => {
            actionUnitsFromDb.set(key, value);
        });
        return actionUnitsFromDb;
    }

    public async count(): Promise<number> {
        return db.length();
    }

    async setActionUnit(actionUnit: IActionUnit, isParentEnabled: boolean): Promise<IActionUnit> {
        actionUnit.modifiedOn = Date.now();
        logger.log(`Setting "${actionUnit.name}" in ActionUnits DB`);
        // setItem returns the same object
        const addedActionUnit =  await db.setItem<IActionUnit>(actionUnit.id, actionUnit);
        actionUnits.set(actionUnit.id, getActionUnitCopyFrom(actionUnit));
        await unitChecker.checkActionUnit(actionUnit, isParentEnabled);
        return addedActionUnit;
    }

    async deleteActionUnit(actionUnitId: string): Promise<void> {
        logger.log(`Deleting ${actionUnitId} from ActionUnits DB`);
        await db.removeItem(actionUnitId);
        await unitChecker.deleteInvalidUnit(actionUnitId);
        actionUnits.delete(actionUnitId);
    }

    async moveActionUnit(actionUnitId: string, newParentId: string, isParentEnabled: boolean): Promise<IActionUnit | undefined> {
        const actionUnit = actionUnits.get(actionUnitId);
        if (!actionUnit) {
            logger.error(ERRORS.audb0);
            return;
        }
        actionUnit.parentId = newParentId;
        await this.setActionUnit(actionUnit, isParentEnabled);
    }

    async clearDb(): Promise<void> {
        logger.log(`Clearing ActionUnits DB`);
        await db.clear();
        actionUnits.clear();
        await unitChecker.clearDb();
    }
}

export function getActionUnitCopyFrom(actionUnit: IActionUnit, isDuplicate?: boolean): IActionUnit {
    //TODO add type guard here and separate the Plugins
    const copy = JSON.parse(JSON.stringify((actionUnit)));
    copy.id = (isDuplicate) ? LpUtils.generateId() : actionUnit.id;
    copy.name = (isDuplicate) ? actionUnit.name + DEFAULT_AU_DUP_SUFFIX : actionUnit.name;
    return copy;
}
