import {IGenericActionUnit, ActionUnitParams, ActionUnitType, DEFAULT_UNNAMED_AU} from "./action-unit.interface";
import {LpUtils} from "../utils";

interface ISleepAUParams extends ActionUnitParams {
    sleep_s: number
}

export interface ISleepAU extends IGenericActionUnit {
    readonly type: ActionUnitType.Sleep;
    params: ISleepAUParams
}

export class SleepAU implements ISleepAU {
    desc: string = "";
    enabled: boolean = true;
    readonly id: string = LpUtils.generateId();
    // do not modify, it is a test property for new class
    modifiedOn: number = 0;
    readonly type: ActionUnitType.Sleep = ActionUnitType.Sleep;
    name: string;
    params: ISleepAUParams;
    parentId: string;

    constructor(name: string, parentId: string) {
        this.name = name || DEFAULT_UNNAMED_AU;
        this.parentId = parentId;

        this.params = {
            sleepBefore: 0,
            sleepAfter: 0,
            sleep_s: 0
        }
    }
}
