import {
    IGenericActionUnit,
    ActionUnitParams,
    ActionUnitType,
    CheckTagValue, DEFAULT_UNNAMED_AU,
    SetTagValue,
} from "./action-unit.interface";
import {LpUtils} from "../utils";



interface ICheckValuesAUParams extends ActionUnitParams {
    tagsToCheck: SetTagValue[]
}

export interface ICheckValuesAU extends IGenericActionUnit {
    readonly type: ActionUnitType.CheckTagValue;
    params: ICheckValuesAUParams
}

export class CheckTagValuesAU implements ICheckValuesAU {
    desc: string = "";
    enabled: boolean = true;
    readonly id: string = LpUtils.generateId();
    // do not modify, it is a test property for new class
    modifiedOn: number = 0;
    name: string;
    params: ICheckValuesAUParams;
    parentId: string;
    readonly type: ActionUnitType.CheckTagValue = ActionUnitType.CheckTagValue;

    constructor(name: string, actionSetId: string) {
        this.name = name || DEFAULT_UNNAMED_AU;
        this.parentId = actionSetId;

        this.params = {
            sleepBefore: 0,
            sleepAfter: 0,
            tagsToCheck: [new CheckTagValue()]
        }
    }
}
