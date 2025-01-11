import {LpUtils} from "../utils";

export const DEFAULT_AS_NAME = "New Action Set";
export const DEFAULT_AS_UNNAMED = "[Unnamed]";

export interface IActionSet {
    readonly id: string,
    parentId: string,
    name: string
    desc: string,
    enabled: boolean,
    modifiedOn: number,
    actionUnitIds: string[],
}

export class ActionSet implements IActionSet {
    readonly id: string = LpUtils.generateId();
    public desc: string = "";
    public enabled: boolean = true;
    public modifiedOn: number = Date.now();
    public actionUnitIds: string[] = [];

    static makeCopy(actionSet: IActionSet, isIdentical?: boolean, isDuplicate?: boolean): ActionSet {
        const id = isIdentical ? actionSet.id : undefined;
        const name = isDuplicate ? actionSet.name + "_copy" : actionSet.name;
        const newAs = new ActionSet(name, actionSet.parentId, id);
        newAs.desc = actionSet.desc;
        newAs.enabled = actionSet.enabled;
        newAs.modifiedOn = actionSet.modifiedOn;
        newAs.actionUnitIds = [...actionSet.actionUnitIds];
        return newAs;
    }

    static isValidObject(actionSetObj: IActionSet) {
        if (typeof actionSetObj.id !== "string") return false;
        if (typeof actionSetObj.name !== "string") return false;
        if (typeof actionSetObj.enabled !== "boolean") return false;
        if (typeof actionSetObj.parentId !== "string") return false;
        if (!Array.isArray(actionSetObj.actionUnitIds)) return false;
        if (!actionSetObj.actionUnitIds.every(auId => typeof auId === "string")) return false;
        return true;
    }

    constructor(public name: string, public parentId: string, id?: string) {
        if (id) this.id = id;
    }

    public getIdentical(): ActionSet {
        return ActionSet.makeCopy(this, true);
    }

    public duplicate(): ActionSet {
        return ActionSet.makeCopy(this, false, true);
    }

    static createFrom(actionSet: IActionSet): ActionSet {
        return ActionSet.makeCopy(actionSet, true)
    }
}
