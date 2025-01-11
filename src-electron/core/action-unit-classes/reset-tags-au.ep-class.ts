import GenericUnitRunner, {ControlledSleep, IGenericRunner} from "./generic-au.ep-class";
import {ResetTagValueAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import LoggerMP from "../../services/logger-ep.service";

const logger = new LoggerMP("ResetTagValuesRunner");

export default class ResetTagValuesRunner extends GenericUnitRunner implements IGenericRunner {
    private sleep = new ControlledSleep();

    async run(actionUnit: ResetTagValueAU, result: AuResult): Promise<void> {
        logger.log("Running " + actionUnit.name);

        result.passCondition = "Hold " + GenericUnitRunner.modPassCondition(actionUnit.params.tagsToToggle, this.tagsMap, true);

        try {
            await this._toggleValues(actionUnit.params.tagsToToggle, this.sleep);
        } catch (e) {
            result.handleFail(e.message);
        }


        logger.log("Finished " + actionUnit.name);
    }

    abort(): void {
        logger.log("Aborting...");
        this.sleep.cancelAll();
    }

}
