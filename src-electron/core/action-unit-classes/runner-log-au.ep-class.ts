import {IRunnerLogAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {IGenericRunner} from "./generic-au.ep-class";

export default class RunnerLogRunner implements IGenericRunner {

    run(actionUnit: IRunnerLogAU, result: AuResult) {
        result.passCondition = actionUnit.params.logMessage;
    }

    abort() {}
}
