import {LpUtils} from "../utils";
import {IActionSet} from "./action-set.interface";
import {IActionUnit} from "../action-unit";
import {ITagUI} from "./tag-ui.class";
import {IOptionObject} from "../../_ui_common/ui.interfaces";

export const DEFAULT_PROJECT_NAME = "New project";
export const DEFAULT_UNNAMED_PROJECT = "[Unnamed project]";
export const DEFAULT_PLC_IP_ADDRESS = "192.168.1.100";
export const DEFAULT_PLC_CPU_SLOT = 0;


export enum PlcType {
    AB_CL = "AB_CL",
    SE_M340 = "SE_M340"
}

export const plcTypesForUi: IOptionObject[] = [
    {
        key: PlcType.AB_CL,
        value: "AB ControlLogix/CompactLogix",
    },
    // {
    //     key: PlcType.SE_M340,
    //     value: "Schneider M340",
    // },
];

export interface IPlcConfig {
    type: PlcType,
    ipAddress: string,
    cpuSlot: number
}

export function confirmProjectProps(testedProject: any) {
    const defaultProject = new Project("");

    // .config added in v0.1.11
    if (!testedProject.config) {
        testedProject.config = {
            unitTestTolerance: defaultProject.config.unitTestTolerance
        };
    } else {
        if (typeof testedProject.config.unitTestTolerance !== "number"  || testedProject.config.unitTestTolerance < 1) {
            testedProject.config.unitTestTolerance = defaultProject.config.unitTestTolerance;
        }
    }
}

export class Project {
    readonly version: string = "0.0.0";
    readonly id: string = LpUtils.generateId();
    readonly plcConfig: IPlcConfig;
    // do not modify, it is a test property for the default project
    modifiedOn: number = 0;
    name: string = DEFAULT_PROJECT_NAME;
    config: IProjectConfig;
    actionSetIds: string[] = [];

    constructor(appVersion: string) {
        this.version = appVersion;
        this.plcConfig = {
            type: PlcType.AB_CL,
            ipAddress: DEFAULT_PLC_IP_ADDRESS,
            cpuSlot: DEFAULT_PLC_CPU_SLOT
        }
        this.config = {
            unitTestTolerance: 100
        }
    }
}

export interface IProjectConfig {
    unitTestTolerance: number;
}

export interface IProjectTransfer {
    project: Project,
    actionSets: Map<string, IActionSet>,
    actionUnits: Map<string, IActionUnit>,
    tags: ITagUI[],
}

export interface IProjectExport {
    project: Project,
    actionSets: IActionSet[],
    actionUnits: IActionUnit[],
    tags: ITagUI[],
}

export interface IDataExport {
    warning: string,
    name: string,
    version: string,
    hash: string,
    data: string,
}
