import {ICheckValuesAU, ISetTagValue, ModTagValue} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import GenericUnitRunner, {
    IGenericRunner,
    RunnerError,
    RunnerErrorCode,
    TAG_NOT_FOUND_MESSAGE
} from "./generic-au.ep-class";
import LoggerMP from "../../services/logger-ep.service";

const logger = new LoggerMP("CheckTagValuesRunner");

export default class CheckTagValuesRunner extends GenericUnitRunner implements IGenericRunner {

    async run(actionUnit: ICheckValuesAU, result: AuResult) {
        logger.log("Running " + actionUnit.name);

        result.passCondition = "Checked " + GenericUnitRunner.setPassCondition(actionUnit.params.tagsToCheck, this.tagsMap);

        try {
            await this.checkTagValues(actionUnit.params.tagsToCheck);
        } catch (e) {
            if (!e.code) throw e;
            result.handleFail(e.message);
        }

        logger.log("Finished " + actionUnit.name);
    }

    private async checkTagValues(tagsToCheck: ISetTagValue[] | ModTagValue[]): Promise<void> {
        for (const tagToCheck of tagsToCheck) {
            const tag = this.tagsMap.get(tagToCheck.tagId);
            if (!tag) throw new RunnerError(TAG_NOT_FOUND_MESSAGE, RunnerErrorCode.CHECK);

            await this._checkTagValue(tag, tagToCheck);
        }
    }

    abort() {}
}
