import {ControlledSleep, IGenericRunner} from "./generic-au.ep-class";
import {ISleepAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import LoggerMP from "../../services/logger-ep.service";

const logger = new LoggerMP("SleepRunner");

export default class SleepRunner implements IGenericRunner {
    private sleep = new ControlledSleep();

    async run(actionUnit: ISleepAU, result: AuResult) {
        logger.log("Running " + actionUnit.name);

        result.passCondition = "Pause test runner for " + actionUnit.params.sleep_s + "s"
        if (actionUnit.params.sleep_s > 0) await this.sleep.for(actionUnit.params.sleep_s * 1000);

        logger.log("Finished " + actionUnit.name);
    }

    abort() {
        logger.log("Aborting...");
        this.sleep.cancelAll();
    }
}
