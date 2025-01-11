import {ActionUnitType, AuCriticalityType, IActionUnit} from "../_common/action-unit";
import {IconNames} from "@blueprintjs/icons";

export interface IOptionObject {
    key: string,
    value: string
}

/**
 * Primarily used by UI
 */
export const getSupportedActionUnits = (): IOptionObject[] => {
    return [
        {
            key: ActionUnitType.SetTagValue,
            value: "Set Tag Value"
        },
        {
            key: ActionUnitType.CheckTagValue,
            value: "Check Tag Value"
        },
        {
            key: ActionUnitType.ResetTagValue,
            value: "Reset Tag Value"
        },
        {
            key: ActionUnitType.Heartbeat,
            value: "Heartbeat"
        },
        {
            key: ActionUnitType.UnitTest,
            value: "Unit Test"
        },
        {
            key: ActionUnitType.Sleep,
            value: "Power Nap"
        },
        {
            key: ActionUnitType.RunnerLog,
            value: "Runner Log"
        },
    ];
};

export function getActionUnitIcon(actionUnit: IActionUnit) {
    switch (actionUnit.type) {
        case ActionUnitType.SetTagValue: return IconNames.FLOW_END;
        case ActionUnitType.CheckTagValue: return IconNames.FLOW_LINEAR;
        case ActionUnitType.UnitTest: return IconNames.MERGE_LINKS;
        case ActionUnitType.RunnerLog: return IconNames.CONSOLE;
        case ActionUnitType.Heartbeat: return IconNames.PIVOT;
        case ActionUnitType.ResetTagValue: return IconNames.FLOW_REVIEW;
        case ActionUnitType.Sleep: return IconNames.STOPWATCH;
    }
    return IconNames.DOCUMENT;
}

export function getDefLastAsPosition(): IOptionObject {
    return {
        key: "_last_one_",
        value: "...place it last",
    }
}

export function listAuCriticalityOptions(): IOptionObject[] {
    return [
        {
            key: AuCriticalityType.NoneCritical,
            value: "non critical"
        },
        {
            key: AuCriticalityType.SetCritical,
            value: "set critical"
        },
        {
            key: AuCriticalityType.ProjectCritical,
            value: "project critical"
        }
    ]
}
