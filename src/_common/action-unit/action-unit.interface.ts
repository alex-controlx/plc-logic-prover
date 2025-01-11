import {IRunnerLogAU} from "./runner-log.interface";
import {IUnitTestAU} from "./unit-test.interface";
import {ISetValuesAU} from "./set-tag-value.interface";
import {ICheckValuesAU} from "./check-tag-value.interface";
import {ISleepAU} from "./sleep-au.interface";
import {IResetValueAU} from "./reset-tag-value-au.interface";
import {IHeartbeatAU} from "./heartbeat-au.interface";


/*
        Adding new Action Unit
        * Add new name into ActionUnitType (below)
        * Create new interface in "_common/action-unit" folder
        * Add the interface file in the index
        * Add new name into type IActionUnit (below)
        * Create new Test Runner interpreter
        * Create new view in views/action-unit-views folder
        * Add condition in "if" statement to display new AU in views/details-panel.tsx
        * Add condition in "if" statement in addActionUnit in storage.service.ts
        * Add new AU to getSupportedActionUnits (action-unit.checks)
        * Add getter to getActionUnitIcon (action-unit.checks)
        * Add check function in checkActionUnit (storage/units-checker)
        * Add action unit check in ImportExportService isActionUnitValid
        * Add action unit to .extractTagIdsFrom() in Storage Service
 */





export const DEFAULT_AU_NAME = ""; // "It should "
export const DEFAULT_UNNAMED_AU = "[unnamed]";
export const DEFAULT_AU_DUP_SUFFIX = " - copy";

export enum ActionUnitType {
    //     DO NOT CHANGE => it will break everything
    RunnerLog = "runnerLog",            // logs a message in the test runner
    UnitTest = "unitTest",              // unit test
    SetTagValue = "setTagValue",        // sets values for number of tags
    CheckTagValue = "checkTagValue",    // checks values for number of tags
    Heartbeat = "heartbeat",            // creates a pulsing tag
    ResetTagValue = "resetTagValue",    // toggles a value
    Sleep = "sleep"                     // pauses test runner for set time
}

export interface ActionUnitParams {
    sleepBefore: number,
    sleepAfter: number,
}

export enum AuCriticalityType {
    //     DO NOT CHANGE => it will break everything
    NoneCritical = "non_critical",
    SetCritical = "set_critical",
    ProjectCritical = "project_critical",
}

export interface IGenericActionUnit {
    readonly id: string,
    parentId: string,
    name: string,
    desc: string,
    enabled: boolean,
    modifiedOn: number,
    criticality?: AuCriticalityType,
}

export type IActionUnit = IRunnerLogAU | IUnitTestAU | ISetValuesAU |
    ICheckValuesAU | ISleepAU | IResetValueAU | IHeartbeatAU;

/**
 * Below interfaces which are grouped to be accepted by SetToValue Input Group
 */
export type ISetValueAuType = ISetValuesAU | IUnitTestAU | ICheckValuesAU | IResetValueAU | IHeartbeatAU;
/**
 * Below interfaces which are grouped to be accepted by SetToValueTimed Input Group. It has to have
 * a time "after_s" property in interface.
 *
 *
 * These are UnitTest, ResetTagValue, Heartbeat
 */
export type ISetValueTimedAuType = IUnitTestAU | IResetValueAU | IHeartbeatAU;

export interface ISetTagValue {
    tagId: string,
    bitNo: number,
    toValue: number,
    fromValue?: number;
    after_s?: number;
}
export class SetTagValue implements ISetTagValue {
    fromValue?: number;
    after_s?: number;

    constructor(tagId?: string) {
        if (tagId) this.tagId = tagId
    }

    tagId: string = "";
    bitNo: number = -1;
    toValue: number = 1;
}
export class CheckTagValue implements ISetTagValue {
    tagId: string = "";
    bitNo: number = -1;
    toValue: number = 1;
}

export interface IModTagValue extends ISetTagValue {
    fromValue: number
}
export class ModTagValue extends SetTagValue {
    fromValue: number = 0;
}

export class ModTagValueTimed extends ModTagValue {
    after_s: number = 1;
}

export class ExpectedChangeConf extends ModTagValueTimed {
    isStrict: boolean = true;
}


export enum ParamsTimedProp {
    expectedChanges,
    tagsToToggle,
}

export function getActionUnitConfigDescription(actionUnitType: ActionUnitType) {
    switch (actionUnitType) {
        case ActionUnitType.SetTagValue:
            return "this Action writes tag values.";
        case ActionUnitType.CheckTagValue:
            return "this Action reads and checks tag values."
        case ActionUnitType.ResetTagValue:
            return "this Action sets tag values to defined value and resets to previous value after defined time."
        case ActionUnitType.Heartbeat:
            return "Note: this Action creates a pulsing tag. This tag will continue pulsing during set " +
                "duration or for the entire test."
        case ActionUnitType.RunnerLog:
            return "this Action logs a message to Test Runner output."
        case ActionUnitType.Sleep:
            return "this Action pauses Test Runner for defined number of seconds."
        case ActionUnitType.UnitTest:
            return "this Action implements test by comparing output tag change to the expected value " +
                "after setting input tags and waiting for defined number of seconds. On completion the " +
                "input tag will be set to initial value and reset tags (in Post execution parameters) " +
                "will be triggered."
    }
    return "DESCRIPTION NOT FOUND";
}
