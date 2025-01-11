import {LpUtils} from "../utils";
import {
    IGenericActionUnit,
    ActionUnitParams,
    ActionUnitType, DEFAULT_UNNAMED_AU,
} from "./action-unit.interface";

interface RunnerLogAuParams extends ActionUnitParams {
    logMessage: string
}

export interface IRunnerLogAU extends IGenericActionUnit {
    readonly type: ActionUnitType.RunnerLog;
    params: RunnerLogAuParams
}

export class RunnerLogAU implements IRunnerLogAU {
    desc: string = "";
    enabled: boolean = true;
    readonly id: string = LpUtils.generateId();
    // do not modify, it is a test property for new class
    modifiedOn: number = 0;
    readonly type: ActionUnitType.RunnerLog = ActionUnitType.RunnerLog;
    name: string;
    params: RunnerLogAuParams;
    parentId: string;

    constructor(name: string, parentId: string) {
        this.name = name || DEFAULT_UNNAMED_AU;
        this.parentId = parentId;

        this.params = {
            sleepBefore: 0,
            sleepAfter: 0,
            logMessage: "A message from " + name,
        }
    }
}
