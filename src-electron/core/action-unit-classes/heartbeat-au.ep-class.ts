import GenericUnitRunner, {
    ControlledSleep,
    IGenericRunner,
    RunnerError,
    RunnerErrorCode,
    TAG_NOT_FOUND_MESSAGE
} from "./generic-au.ep-class";
import {getInvalidMessageOf, IHeartbeatAU, ModTagValueTimed} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {AbTag} from "../../_controllers/cip-tag.class";
import LoggerMP from "../../services/logger-ep.service";

const logger = new LoggerMP("HeartBeatRunner");

export default class HeartBeatRunner extends GenericUnitRunner implements IGenericRunner {
    private heartbeatTimeouts: NodeJS.Timeout[] = [];
    private sleep = new ControlledSleep();
    private pulsarPermissions = new Map<string, boolean>();


    async run(actionUnit: IHeartbeatAU, result: AuResult) {
        logger.log("Running " + actionUnit.name);

        const invalidMessage = getInvalidMessageOf(actionUnit, this.tagGetter);
        if (invalidMessage) return result.handleFail(invalidMessage);

        result.passCondition = "Pulsing " + GenericUnitRunner.pulsePassCondition(actionUnit.params.tagsToToggle, this.tagsMap);

        try {
            await this.heartbeatRunner(actionUnit);
        } catch (e) {
            if (!e.code) throw e;
            result.handleFail(e.message);
        }

        logger.log("Finished init for " + actionUnit.name);
    }

    abort() {
        logger.log("Aborting...");
        this.heartbeatTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.pulsarPermissions.clear();
        this.sleep.cancelAll();
    }

    private async heartbeatRunner(actionUnit: IHeartbeatAU) {

        // setting initial values to toValues - not needed as it sets on first call of _pulsar()
        // await this.setTagValues(actionUnit.params.tagsToToggle);

        // create async pulsar function and add permissions to the permissionsMap
        for (const [i, tagToToggle] of actionUnit.params.tagsToToggle.entries()) {

            const tag = this.tagsMap.get(tagToToggle.tagId);
            if (!tag) throw new RunnerError(TAG_NOT_FOUND_MESSAGE, RunnerErrorCode.HEARTBEAT);

            const pulsarId = actionUnit.id + tagToToggle.tagId + i;

            this.pulsarPermissions.set(pulsarId, true);
            this._pulsar(pulsarId, false, tag, tagToToggle).catch(e => {
                console.error("Unhandled Promise Rejection", e.message)
            });
        }

        // stop heartbeat after set duration
        if (actionUnit.params.duration_s > 0) {
            this.heartbeatTimeouts.push(
                setTimeout(() => {

                    actionUnit.params.tagsToToggle.forEach( (tagToToggle, i) => {
                        const pulsarId = actionUnit.id + tagToToggle.tagId + i;
                        this.pulsarPermissions.delete(pulsarId);
                        this.sleep.cancel(pulsarId);
                    })

                    logger.log("Stopped " + actionUnit.name + " after " + actionUnit.params.duration_s);

                }, actionUnit.params.duration_s * 1000)
            )
        }
    }

    private async _pulsar(pulsarId: string, useFromValue: boolean, tag: AbTag, tagToToggle: ModTagValueTimed) {
        while (this.pulsarPermissions.has(pulsarId)) {
            const value = useFromValue? tagToToggle.fromValue : undefined;
            await this._setTagValue(tag, tagToToggle, value);

            await this.sleep.for(tagToToggle.after_s * 1000, pulsarId);
            await this._pulsar(pulsarId, !useFromValue, tag, tagToToggle);
        }
    }

}
