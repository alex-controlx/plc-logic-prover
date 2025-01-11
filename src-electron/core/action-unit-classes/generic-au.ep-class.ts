import {
    IActionUnit,
    IModTagValue,
    ModTagValue,
    ModTagValueTimed,
    SetTagValue, TagContainer
} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {AbTag} from "../../_controllers/cip-tag.class";
import {LpUtils} from "../../../src/_common/utils";
import LoggerMP from "../../services/logger-ep.service";
import {IController} from "../../_controllers/controller.interfaces";
import {ACommonTag} from "../../../src/_common/interfaces";

const logger = new LoggerMP("GenericUnitRunner");

export const TAG_NOT_FOUND_MESSAGE = "No Tag in config";
export class RunnerError extends Error {
    public code: RunnerErrorCode;
    constructor(message:string, code: RunnerErrorCode) {
        super(message);
        this.code = code;
    }
}

export enum RunnerErrorCode {
    CHECK = "CHECK",
    SET = "SET",
    TOGGLE = "TOGGLE",
    HEARTBEAT = "HEARTBEAT",
    UNIT_TEST = "UNIT_TEST",
}


export interface IGenericRunner {
    run(actionUnit: IActionUnit, result: AuResult): Promise<void> | void,
    abort(): void,
}

export default class GenericUnitRunner {

    constructor(public plc: IController, public tagsMap: Map<string, AbTag>) {}

    protected tagGetter: TagContainer = {
        getTag: (tagId: string) => {
            return this.tagsMap.get(tagId)
        }
    }

    protected async setTagValues(tagsToSet: SetTagValue[] | ModTagValue[]) {
        for (const tagToSet of tagsToSet) {
            const tag = this.tagsMap.get(tagToSet.tagId);
            if (!tag) throw new RunnerError(TAG_NOT_FOUND_MESSAGE, RunnerErrorCode.SET);

            await this._setTagValue(tag, tagToSet);
        }
    }

    protected async _setTagValue(tag: AbTag, tagToSet: SetTagValue | ModTagValue, diffValue?: number) {
        const toValue = (diffValue != null) ? diffValue : tagToSet.toValue;
        // logger.log("Setting " + tag.fullName + " to " + toValue);

        if (tagToSet.bitNo < 0) {
            tag.toValue = toValue;
            await this.plc.writeTag(tag);
            return;
        }

        if (tagToSet.bitNo > ACommonTag.getBitsQty(tag.datatype))
            throw new RunnerError(`Requested bit ${tagToSet.bitNo} is out of range for ${tag.datatype} type`,
                RunnerErrorCode.SET);

        //TODO group and read tags before calling _setTagValue()
        await this.plc.readTag(tag);
        tag.toValue = (toValue) ?
            LpUtils.setBit(tag.value, tagToSet.bitNo) :
            LpUtils.clearBit(tag.value, tagToSet.bitNo);
        await this.plc.writeTag(tag);

        // logger.log("Set " + tag.fullName + " to " + toValue);
    }

    protected async _checkTagValue(tag: AbTag, tagToCheck: SetTagValue | ModTagValue) {
        await this.plc.readTag(tag);

        if (tagToCheck.bitNo < 0) {
            if (tagToCheck.toValue !== tag.value) {
                throw new RunnerError(
                    `${tag.fullName} is ${tag.value} when expected ${tagToCheck.toValue}`,
                    RunnerErrorCode.CHECK
                );
            }
            return;
        }

        if (tagToCheck.bitNo > ACommonTag.getBitsQty(tag.datatype)) {
            throw new RunnerError(
                `Requested bit ${tagToCheck.bitNo} is out of range for ${tag.datatype} type`,
                RunnerErrorCode.CHECK
            );
        }

        const bitValue = LpUtils.testBit(tag.value, tagToCheck.bitNo);
        if (bitValue !== tagToCheck.toValue) {
            throw new RunnerError(tag.fullName + GenericUnitRunner.getBitText(tagToCheck.bitNo) +
                ` is ${bitValue} when expected ${tagToCheck.toValue}`, RunnerErrorCode.CHECK);
        }
    }


    protected async _toggleValues(tagsToToggle: ModTagValueTimed[], sleep: ControlledSleep) {

        // remembering .value to .fromValue property
        await this.rememberCurrentValuesOf(tagsToToggle);

        // setting initial toggled values (toValue)
        await this.setTagValues(tagsToToggle);

        const returnToFromValue = async (tag: AbTag, tagToToggle: ModTagValueTimed) => {
            await sleep.for(tagToToggle.after_s * 1000);
            // logger.log(`Toggling: returning to ${tagToToggle.fromValue} after ${tagToToggle.after_s}s`);
            await this._setTagValue(tag, tagToToggle, tagToToggle.fromValue);
        }

        let maximumSleepTime = 0;
        for (const tagToToggle of tagsToToggle) {
            const tag = this.tagsMap.get(tagToToggle.tagId);
            if (!tag) throw new RunnerError(TAG_NOT_FOUND_MESSAGE, RunnerErrorCode.TOGGLE);

            maximumSleepTime = (tagToToggle.after_s > maximumSleepTime) ? tagToToggle.after_s : maximumSleepTime;
            //TODO handle this type of catches
            returnToFromValue(tag, tagToToggle).catch((e) => {
                console.error("Unhandled Promise Rejection", e.message);
            });
        }

        if (maximumSleepTime > 0) await sleep.for(maximumSleepTime * 1000);
    }


    /**
     * @description Reads tags associated with IModTagValue array and saves
     *   values to .fromValue property of IModTagValue(s)
     * @param tagsToModify
     */
    protected async rememberCurrentValuesOf(tagsToModify: IModTagValue[] | ModTagValueTimed[]) {

        // getting tags map which is relevant to tagsToModify array
        const tagsMap = GenericUnitRunner.filterTagsFromModTagValues(this.tagsMap, tagsToModify);
        // reading current values from PLC and save them in tag.value property
        await this.plc.readTags((tagsMap as Map<string, AbTag>));

        // setting fromValue which equals current value inside toggle objects
        for (const tagToToggle of tagsToModify) {
            const tag = tagsMap.get(tagToToggle.tagId);
            if (!tag) throw new RunnerError(TAG_NOT_FOUND_MESSAGE, RunnerErrorCode.TOGGLE);

            tagToToggle.fromValue = (tagToToggle.bitNo < 0) ?
                tag.value :
                LpUtils.testBit(tag.value, tagToToggle.bitNo);
        }
    }

    /**
     * @description Sets tag values from .fromValue property of IModTagValue array
     * @param tagsToSet
     */
    protected async resetPreviousValuesFor(tagsToSet: IModTagValue[]) {
        for (const tagToSet of tagsToSet) {
            const tag = this.tagsMap.get(tagToSet.tagId);
            if (!tag) throw new RunnerError(TAG_NOT_FOUND_MESSAGE, RunnerErrorCode.UNIT_TEST);

            await this._setTagValue(tag, tagToSet, tagToSet.fromValue);
        }
    }













    static setPassCondition(tagsToSet: SetTagValue[], tagsMap: Map<string, AbTag>) {
        let outStr = "";
        // have to use forEach as we return on empty tagId
        tagsToSet.forEach((tagToSet, index) => {
            if (!tagToSet.tagId) return;

            outStr += tagsMap.get(tagToSet.tagId)?.fullName + this.getBitText(tagToSet.bitNo) + " = " + tagToSet.toValue;
            if (index !== tagsToSet.length - 1) outStr += ", ";
        });
        return outStr;
    }

    static modPassCondition(tagsToSet: ModTagValueTimed[], tagsMap: Map<string, AbTag>, isReset?: boolean) {
        let outStr = "";
        const afterOrFor = isReset ? " for " : " after ";
        // have to use forEach as we return on empty tagId
        tagsToSet.forEach((tagToSet, index) => {
            if (!tagToSet.tagId) return;

            outStr += tagsMap.get(tagToSet.tagId)?.fullName + this.getBitText(tagToSet.bitNo) + " = " +
                tagToSet.toValue + afterOrFor + tagToSet.after_s + "s";
            if (index !== tagsToSet.length - 1) outStr += ", ";
        });
        return outStr;
    }

    static pulsePassCondition(tagsToSet: ModTagValueTimed[], tagsMap: Map<string, AbTag>) {
        let outStr = "";
        // have to use forEach as we return on empty tagId
        tagsToSet.forEach((tagToSet, index) => {
            if (!tagToSet.tagId) return;

            outStr += tagsMap.get(tagToSet.tagId)?.fullName + this.getBitText(tagToSet.bitNo) + " from " +
                tagToSet.fromValue + " to " + tagToSet.toValue + " each " + tagToSet.after_s + "s";
            if (index !== tagsToSet.length - 1) outStr += ", ";
        });
        return outStr;
    }

    static filterTagsFromModTagValues(
        tagsMap: Map<string, ACommonTag>,
        modTagValues: SetTagValue[] | ModTagValue[] | ModTagValueTimed[]
    ): Map<string, ACommonTag>
    {
        const tags = new Map<string, ACommonTag>();
        modTagValues.forEach(item => {
            const tag = tagsMap.get(item.tagId);
            if (tag) tags.set(tag.id, tag);
        });
        return tags;
    }

    static getBitText(bitNo: number): string {
        return (bitNo >= 0) ? ` bit ${bitNo}` : "";
    }
}



export interface IControlledSleepFeedback {
    timeout: NodeJS.Timeout,
    resolveFn: () => void,
}
export class ControlledSleep {
    private timeoutFeedbacks = new Map<string, IControlledSleepFeedback>();

    public async for(ms: number, timeoutId?: string) {
        const m_timeoutId = timeoutId? timeoutId : LpUtils.generateId();
        return new Promise<void>((accept) => {
            const timeout = setTimeout(() => {
                this.timeoutFeedbacks.delete(m_timeoutId);
                accept();
            }, ms);
            this.timeoutFeedbacks.set(m_timeoutId, {
                timeout,
                resolveFn: accept,
            });
        });
    }

    public getTimeouts() {
        return this.timeoutFeedbacks;
    }

    public cancel(timeoutId: string) {
        const timeoutFb = this.timeoutFeedbacks.get(timeoutId);
        if (timeoutFb) {
            clearTimeout(timeoutFb.timeout);
            timeoutFb.resolveFn();
        }
        this.timeoutFeedbacks.delete(timeoutId);
    }

    public cancelAll() {
        this.timeoutFeedbacks.forEach(timeoutFb => {
            clearTimeout(timeoutFb.timeout);
            timeoutFb.resolveFn();
        });
        this.timeoutFeedbacks.clear();
    }
}
