import {LpUtils} from "../utils";
import {
    IGenericActionUnit,
    ActionUnitParams,
    ActionUnitType, DEFAULT_UNNAMED_AU,
    ModTagValueTimed
} from "./action-unit.interface";

interface IResetValueAUParams extends ActionUnitParams {
    /**
     * This tags will be toggled: set to fromValue and then to toValue.
     * It used to reset Alarm generated by the Unit Test.
     */
    tagsToToggle: ModTagValueTimed[],
}

export interface IResetValueAU extends IGenericActionUnit {
    readonly type: ActionUnitType.ResetTagValue;
    params: IResetValueAUParams
}

export class ResetTagValueAU implements IResetValueAU {
    desc: string = "";
    enabled: boolean = true;
    readonly id: string = LpUtils.generateId();
    // do not modify, it is a test property for new class
    modifiedOn: number = 0;
    readonly type: ActionUnitType.ResetTagValue = ActionUnitType.ResetTagValue;
    name: string;
    params: IResetValueAUParams;
    parentId: string;

    constructor(name: string, parentId: string) {
        this.name = name || DEFAULT_UNNAMED_AU;
        this.parentId = parentId;
        this.params = {
            sleepBefore: 0,
            sleepAfter: 0,
            tagsToToggle: [new ModTagValueTimed()],
        }
    }
}