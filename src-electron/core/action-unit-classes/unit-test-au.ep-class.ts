import GenericUnitRunner, {
    ControlledSleep,
    IGenericRunner,
    RunnerError,
    RunnerErrorCode,
    TAG_NOT_FOUND_MESSAGE
} from "./generic-au.ep-class";
import {AbTag} from "../../_controllers/cip-tag.class";
import {LpUtils} from "../../../src/_common/utils";
import LoggerMP, {ERRORS_EP} from "../../services/logger-ep.service";
import {IUnitTestAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {IController} from "../../_controllers/controller.interfaces";

const logger = new LoggerMP("UnitTestRunner");

export default class UnitTestRunner extends GenericUnitRunner implements IGenericRunner {
    private isAborting: boolean = false;
    private sleep = new ControlledSleep();

    constructor(plc: IController, tagsMap: Map<string, AbTag>, private timeTolerance_ms: number) {
        super(plc, tagsMap);
    }


    async run(actionUnit: IUnitTestAU, result: AuResult) {
        logger.log("Running " + actionUnit.name);

        const whenSet = "When set " + GenericUnitRunner.setPassCondition(actionUnit.params.tagsToModify, this.tagsMap);
        const expectOut = "Expect " + GenericUnitRunner.modPassCondition(actionUnit.params.expectedChanges, this.tagsMap);
        const monitor = (!actionUnit.params.noChangeTagIds.length) ? "" :
            "No changes in " + actionUnit.params.noChangeTagIds.map(tagId => this.tagsMap.get(tagId)?.fullName).join(",");
        result.passCondition = whenSet + "\n" + expectOut + "\n" + monitor; // + "\n" + andReset;

        try {
            await this.unitTestRunner(actionUnit);
        } catch (e) {
            this.plc.stopScan();
            this.sleep.cancelAll();
            if (!e.code) throw e;
            result.handleFail(e.message);
        }

        logger.log("Finished " + actionUnit.name);
    }

    abort() {
        logger.log("Aborting...");
        this.isAborting = true;
        this.plc.stopScan();
        this.sleep.cancelAll();
    }

    private async unitTestRunner(actionUnit: IUnitTestAU) {
        const startedAt = Date.now();

        if (actionUnit.params.tagsToModify.length === 0)
            throw new RunnerError(`No input tags configured.`, RunnerErrorCode.UNIT_TEST);

        const tagToMonitor = new Map<string, AbTag>();
        actionUnit.params.expectedChanges.forEach(item => {
            if (!item.tagId) throw new RunnerError(TAG_NOT_FOUND_MESSAGE, RunnerErrorCode.UNIT_TEST);
            const tag = this.tagsMap.get(item.tagId);
            if (tag) tagToMonitor.set(tag.id, tag);
        });

        actionUnit.params.noChangeTagIds.forEach(tagId => {
            const tag = this.tagsMap.get(tagId);
            if (tag) tagToMonitor.set(tag.id, tag);
        });

        if (tagToMonitor.size === 0) {
            throw new RunnerError(
                `Nothing to monitor: neither of "Expected changes" nor "Monitor for change" are configured.`,
                RunnerErrorCode.UNIT_TEST
            );
        }

        const handleFail = (failMessage: string) => {
            logger.log("FAILED: " + failMessage);
            this.plc.stopScan();
            throw new RunnerError(failMessage, RunnerErrorCode.UNIT_TEST);
            // result.handleFail(failMessage);
        };

        const eachScanCallback = () => {
            const elapsedTime = Date.now() - startedAt;

            // value change check
            for (const [tagId, tag] of tagToMonitor.entries()) {
                if (tag.fromValue !== tag.value) {

                    logger.log(`Change detected in ${tag.fullName} from ${tag.fromValue} to value ${tag.value} after ${elapsedTime}ms`);

                    if (actionUnit.params.noChangeTagIds.includes(tag.id)) {
                        handleFail(`${tag.fullName} changed to ${tag.value} from ${tag.fromValue} when it should not.`);
                        return;
                    }

                    for (const expectedChange of actionUnit.params.expectedChanges) {

                        if (expectedChange.tagId !== tagId) continue;

                        // expecting the entire value to be changed
                        if (expectedChange.bitNo < 0) {
                            if (tag.value === expectedChange.toValue) {

                                if ((elapsedTime + this.timeTolerance_ms) < (expectedChange.after_s * 1000)) {
                                    handleFail(`${tag.fullName} changed from ${tag.fromValue} to ${tag.value}` +
                                        ` TOO early [${elapsedTime}ms] when should after ${expectedChange.after_s}s`);
                                    return;
                                }

                                // when PASS set the timer parameter to -1 so it wont be picked up by overtime check
                                expectedChange.after_s = -1;
                            }
                            continue;
                        }

                        // expecting a changed in its bits
                        const tagBitValue = LpUtils.testBit(tag.value, expectedChange.bitNo);
                        if (tagBitValue === expectedChange.toValue) {

                            if ((elapsedTime + this.timeTolerance_ms) < (expectedChange.after_s * 1000)) {
                                handleFail(tag.fullName + GenericUnitRunner.getBitText(expectedChange.bitNo) +
                                    ` changed from ` +
                                    `${LpUtils.testBit(tag.fromValue, expectedChange.bitNo)} to ${tagBitValue}` +
                                    ` TOO early [${elapsedTime}ms] when should after ${expectedChange.after_s}s`);
                                return;
                            }

                            // when PASS set the timer parameter to -1 so it wont be picked up by overtime check
                            expectedChange.after_s = -1;
                        }
                    }
                }
            }

            let moreTime = -1;
            // overtime check
            for (const expectedChange of actionUnit.params.expectedChanges) {
                if (expectedChange.after_s > moreTime) moreTime = expectedChange.after_s;

                if (expectedChange.after_s >= 0 && (elapsedTime - this.timeTolerance_ms) > (expectedChange.after_s * 1000)) {
                    const tag = this.tagsMap.get(expectedChange.tagId);
                    if (!tag) throw new RunnerError(
                        ERRORS_EP.ut001 + ", id=" + expectedChange.tagId, RunnerErrorCode.UNIT_TEST
                    );
                    const fromValue = (expectedChange.bitNo < 0) ?
                        tag.fromValue :
                        LpUtils.testBit(tag.fromValue || 0, expectedChange.bitNo);

                    handleFail(tag.fullName + GenericUnitRunner.getBitText(expectedChange.bitNo) +
                        ` with value ${fromValue} hasn't changed` +
                        ` to expected value ${expectedChange.toValue}` +
                        ` after ${expectedChange.after_s}s`);
                }
            }

            if (moreTime === -1) {
                logger.log("NO more to check. Stopping scan.");
                this.plc.stopScan();
            }
        };

        await this.rememberCurrentValuesOf(actionUnit.params.tagsToModify);

        logger.log("Pre-scan sets");
        await this.plc.readTags(tagToMonitor);

        await this.setTagValues(actionUnit.params.tagsToModify);

        logger.log("Starting scan");
        await this.plc.scan(tagToMonitor, eachScanCallback);

        await this.resetPreviousValuesFor(actionUnit.params.tagsToModify);



        // Post Execution Config

        if (actionUnit.params.tagsToToggle.length && !this.isAborting) {
            logger.log("Toggling " + actionUnit.params.tagsToToggle.length + " tags");

            await this._toggleValues(actionUnit.params.tagsToToggle, this.sleep);

            logger.log("Toggling " + actionUnit.params.tagsToToggle.length + " tags finished");
        }
    }
}
