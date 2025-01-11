import {
    IGenericActionUnit,
    ActionUnitParams,
    ActionUnitType,
    DEFAULT_UNNAMED_AU,
    ISetTagValue,
    SetTagValue
} from "./action-unit.interface";
import {LpUtils} from "../utils";



interface ISetValuesAUParams extends ActionUnitParams {
    tagsToSet: ISetTagValue[]
}

export interface ISetValuesAU extends IGenericActionUnit {
    readonly type: ActionUnitType.SetTagValue;
    params: ISetValuesAUParams
}

export class SetTagValuesAU implements ISetValuesAU {
    desc: string = "";
    enabled: boolean = true;
    readonly id: string = LpUtils.generateId();
    // do not modify, it is a test property for new class
    modifiedOn: number = 0;
    readonly type: ActionUnitType.SetTagValue = ActionUnitType.SetTagValue;
    name: string;
    params: ISetValuesAUParams;
    parentId: string;

    constructor(name: string, parentId: string) {
        this.name = name || DEFAULT_UNNAMED_AU;
        this.parentId = parentId;

        this.params = {
            sleepBefore: 0,
            sleepAfter: 0,
            tagsToSet: [new SetTagValue()]
        }
    }
}
