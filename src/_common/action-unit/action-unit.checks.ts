import {ActionUnitType, IActionUnit} from "./action-unit.interface";
import {HeartbeatAU} from "./heartbeat-au.interface";
import {ResetTagValueAU} from "./reset-tag-value-au.interface";
import {SleepAU} from "./sleep-au.interface";
import {RunnerLogAU} from "./runner-log.interface";
import {SetTagValuesAU} from "./set-tag-value.interface";
import {CheckTagValuesAU} from "./check-tag-value.interface";
import {UnitTestAU} from "./unit-test.interface";
import {ACommonTag, ITagUI} from "../interfaces";
import {INVALID_MESSAGE} from "../strings.lang";

export interface IInvalidUnitMessage {
    actionUnitId: string,
    name: string,
    message: string,
    isEnabled: boolean
}

export interface TagContainer {
    getTag(tagId: string): ITagUI | undefined
}

export function getInvalidMessageOf(actionUnit: IActionUnit, tagContainer: TagContainer): string {
    switch (actionUnit.type) {
        case ActionUnitType.RunnerLog:
            return getInvalidConfigOfRunnerLogAU(actionUnit);
        case ActionUnitType.UnitTest:
            return getInvalidConfigOfUnitTestAU(actionUnit, tagContainer);
        case ActionUnitType.SetTagValue:
            return getInvalidConfigOfSetTagValuesAU(actionUnit, tagContainer);
        case ActionUnitType.CheckTagValue:
            return getInvalidConfigOfCheckTagValuesAU(actionUnit, tagContainer);
        case ActionUnitType.Heartbeat:
            return getInvalidConfigOfHeartbeatAU(actionUnit, tagContainer);
        case ActionUnitType.ResetTagValue:
            return getInvalidConfigOfResetTagValueAU(actionUnit, tagContainer);
        case ActionUnitType.Sleep:
            return getInvalidConfigOfSleepAU(actionUnit);
        default:
            return "Action Unit type is not supported."
    }
}

function getInvalidConfigOfHeartbeatAU(actionUnit: HeartbeatAU, tagMap: TagContainer): string {
    for (const tagMod of actionUnit.params.tagsToToggle) {
        if (!tagMod.tagId) return "A heartbeat tag was not selected";
        if (tagMod.fromValue === tagMod.toValue)  return "Heartbeat from and to values must not be equal";
        if (tagMod.after_s < 0.5) return "Heartbeat pulse must be greater or equal than 0.5s, but got " +
            tagMod.after_s + "s";

        const tag = tagMap.getTag(tagMod.tagId);
        if (!tag) return "Heartbeat tag was deleted";
        if (tagMod.bitNo > ACommonTag.getBitsQty(tag.datatype))
            return `Requested bit ${tagMod.bitNo} is out of range for ${tag.datatype} type`;
    }
    return "";
}

function getInvalidConfigOfResetTagValueAU(actionUnit: ResetTagValueAU, tagMap: TagContainer): string {
    for (const tagMod of actionUnit.params.tagsToToggle) {
        if (!tagMod.tagId) return "A reset tag was not selected";

        const tag = tagMap.getTag(tagMod.tagId);
        if (!tag) return "Tag was deleted";
    }
    return "";
}

function getInvalidConfigOfSleepAU(actionUnit: SleepAU): string {
    if (typeof actionUnit.params.sleep_s !== "number" || actionUnit.params.sleep_s < 0) {
        return "Time value must be greater or equal 0"
    }
    return ""
}

function getInvalidConfigOfRunnerLogAU(actionUnit: RunnerLogAU): string {
    if (!actionUnit.params.logMessage) {
        return INVALID_MESSAGE.RunnerLog.no_logMessage
    }
    return ""
}

function getInvalidConfigOfSetTagValuesAU(actionUnit: SetTagValuesAU, tagMap: TagContainer): string {
    if (actionUnit.params.tagsToSet.length === 0) {
        return INVALID_MESSAGE.SetTagValue.noTagsIn_tagsToSet
    }
    for (const tagToSet of actionUnit.params.tagsToSet) {
        if (!tagToSet.tagId) {
            return INVALID_MESSAGE.SetTagValue.noSelTagIn_tagsToSet
        }
        const tag = tagMap.getTag(tagToSet.tagId);
        if (!tag) return INVALID_MESSAGE.SetTagValue.tagWasDeleted;
    }
    return "";
}

function getInvalidConfigOfCheckTagValuesAU(actionUnit: CheckTagValuesAU, tagMap: TagContainer): string {
    if (actionUnit.params.tagsToCheck.length === 0) {
        return "There are no tags to check"
    }
    for (const tagToCheck of actionUnit.params.tagsToCheck) {
        if (!tagToCheck.tagId) {
            return "A tag was not selected"
        }
        const tag = tagMap.getTag(tagToCheck.tagId);
        if (!tag) return "Tag was deleted";
    }
    return "";
}

function getInvalidConfigOfUnitTestAU(actionUnit: UnitTestAU, tagMap: TagContainer): string {
    if (actionUnit.params.tagsToModify.length === 0) {
        return "There are no tags to set"
    }
    for (const tagMod of actionUnit.params.tagsToModify) {
        if (!tagMod.tagId) return "An input tag was not selected";
        const tag = tagMap.getTag(tagMod.tagId);
        if (!tag) return "Input tag was deleted";
    }

    if (actionUnit.params.expectedChanges.length === 0) {
        return "There are no output tags to check"
    }
    for (const tagMod of actionUnit.params.expectedChanges) {
        if (!tagMod.tagId) return "An output tag was not selected";
        const tag = tagMap.getTag(tagMod.tagId);
        if (!tag) return "Expected output tag was deleted";
    }

    for (const tagId of actionUnit.params.noChangeTagIds) {
        const tag = tagMap.getTag(tagId);
        if (!tag) return "Monitor for 'No Change' tag was deleted";
    }

    for (const tagMod of actionUnit.params.tagsToToggle) {
        if (!tagMod.tagId) return "A reset tag was not selected";
        const tag = tagMap.getTag(tagMod.tagId);
        if (!tag) return "Reset tag was deleted";
    }

    return "";
}
