import {ISetValuesAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import GenericUnitRunner, {IGenericRunner} from "./generic-au.ep-class";
import LoggerMP from "../../services/logger-ep.service";

const logger = new LoggerMP("SetTagValuesRunner");

export default class SetTagValuesRunner extends GenericUnitRunner implements IGenericRunner {

    async run(actionUnit: ISetValuesAU, result: AuResult) {
        logger.log("Running " + actionUnit.name);

        result.passCondition = "Set " + GenericUnitRunner.setPassCondition(actionUnit.params.tagsToSet, this.tagsMap);

        try {
            await this.setTagValues(actionUnit.params.tagsToSet);
        } catch (e) {
            if (!e.code) throw e;
            result.handleFail(e.message);
        }

        logger.log("Finished " + actionUnit.name);
    }

    abort() {}
}
