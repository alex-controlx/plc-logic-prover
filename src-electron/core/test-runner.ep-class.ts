import {ActionUnitType, AuCriticalityType, IActionUnit,} from "../../src/_common/action-unit";
import {AbTag} from "../_controllers/cip-tag.class";
import {LpUtils} from "../../src/_common/utils";
import {
    AsResult,
    AuResult,
    DISABLED_ADD_MESSAGE,
    LAST_RESULT_ID,
    Result,
    ResultTypes
} from "../../src/_common/interfaces/result.class";
import {IPlcConfig, IProjectConfig, IProjectTransfer} from "../../src/_common/interfaces";
import {CipController} from "../_controllers/cip-controller.class";
import LoggerMP, {isDev} from "../services/logger-ep.service";
import {getRunnerWindow} from "../window.runner";
import {IpcSubTopic} from "../../src/_common/interfaces/ipc.interfaces";
import * as moment from "moment";
import RunnerLogRunner from "./action-unit-classes/runner-log-au.ep-class";
import SetTagValuesRunner from "./action-unit-classes/set-tag-values-au.ep-class";
import SleepRunner from "./action-unit-classes/sleep-au.ep-class";
import CheckTagValuesRunner from "./action-unit-classes/check-tag-values-au.ep-class";
import HeartBeatRunner from "./action-unit-classes/heartbeat-au.ep-class";
import ResetTagValuesRunner from "./action-unit-classes/reset-tags-au.ep-class";
import UnitTestRunner from "./action-unit-classes/unit-test-au.ep-class";
import {AppConfigService} from "../services/app-config.ep-service";
import {IController} from "../_controllers/controller.interfaces";

const logger = new LoggerMP("TestRunner");
const FULL_DATE_FORMAT = "D MMM YYYY, h:mm:ss a";

export class TestRunner {
    private readonly rLogger: RunnerLogger;
    private unitRunner: UnitRunner | undefined;
    private isAborting: boolean = false;
    private currentProjectName: string = "";
    private numberOfTests: number = 0;
    private appConfig = AppConfigService.getConfig();

    constructor(results: ResultTypes[]) {
        this.rLogger = new RunnerLogger(results);
    }

    public async startRunner(projectExport: IProjectTransfer) {
        logger.log("   ------   BEGIN :: TestRunner:startRunner()    ------    ");

        this.currentProjectName = projectExport.project.name;
        this.numberOfTests = 0;

        // build map of AB Tags
        const tags = new Map<string, AbTag>();
        projectExport.tags.forEach(tag => {
            const abTag = new AbTag(tag);
            tags.set(tag.id, abTag);
        });

        this.unitRunner = new UnitRunner(tags, projectExport.project.plcConfig, projectExport.project.config);

        const projectResult =
            new Result(
                projectExport.project.id,
                ` --- Starting test of ${this.currentProjectName} at ` + moment().format(FULL_DATE_FORMAT)
            );
        this.rLogger.logResult(projectResult);

        try {
            await this.unitRunner.openPlcConnection(this.rLogger);
        } catch (e) {
            return this.handleCriticalError(e);
        }


        outer: for (const actionSetId of projectExport.project.actionSetIds) {
            if (this.isAborting) break;
            const actionSet = projectExport.actionSets.get(actionSetId);
            if (!actionSet) throw new Error(`No Action Set with ID ${actionSetId} not found.`);

            if (!actionSet.enabled) {
                const disabled = new AsResult(actionSetId, actionSet.name + DISABLED_ADD_MESSAGE, true);
                disabled.disabled = true;
                this.rLogger.logResult(disabled);
                continue;
            }

            const setResult = new AsResult(actionSetId, actionSet.name);
            this.rLogger.logResult(setResult);

            for (const actionUnitId of actionSet.actionUnitIds) {

                if (this.isAborting) break outer;

                const actionUnit = projectExport.actionUnits.get(actionUnitId);
                if (!actionUnit) throw new Error(`Action Unit with ID ${actionUnitId} not found.`);

                if (!actionUnit.enabled) {
                    const disabled =
                        new AuResult(actionUnitId, actionUnit.name + DISABLED_ADD_MESSAGE, true);
                    disabled.disabled = true;
                    this.rLogger.logResult(disabled);
                    continue;
                }

                const unitResult = new AuResult(actionUnitId, actionUnit.name);
                // sending to UI to log the Unit's name
                this.rLogger.logResult(unitResult);

                try {
                    await this.unitRunner.runUnit(actionUnit, unitResult);
                } catch (e) {
                    if (!e.message) e.message = "";
                    e.message += " [" + unitResult.message + "]";
                    return  this.handleCriticalError(e);
                }
                if (this.isAborting) unitResult.handleFail("Aborted by the user");

                this.numberOfTests++;

                if (unitResult.error && actionUnit.criticality && actionUnit.criticality !== AuCriticalityType.NoneCritical) {
                    const addMessage = actionUnit.criticality === AuCriticalityType.SetCritical ?
                        "Aborting current Action Set, as per the config." :
                        "Aborting project, as per the config.";
                    unitResult.handleFail(unitResult.error + ". " + addMessage);
                    this.rLogger.logResult(unitResult);

                    //
                    await LpUtils.sleep(this.appConfig.asQueueDelay);
                    setResult.finishedAt = Date.now();

                    if (actionUnit.criticality === AuCriticalityType.SetCritical) continue outer;
                    else break outer;
                } else {
                    this.rLogger.logResult(unitResult);
                }

                await LpUtils.sleep(this.appConfig.auQueueDelay);
            }

            await LpUtils.sleep(this.appConfig.asQueueDelay);
            setResult.finishedAt = Date.now();
        }

        await this.cleanUp();
        logger.log("   ------   END :: TestRunner:startRunner()    ------    ");
    }

    public abort() {
        this.isAborting = true;
        if (this.unitRunner) this.unitRunner.abortRunners();
    }


    private async handleCriticalError(error: Error) {
        if (isDev) console.error(error);
        await this.cleanUp(error);
    }

    private async cleanUp(error?: Error) {
        const terminationMessage = (this.isAborting) ? " --- Aborted by the user" : " --- Terminated by a critical error";
        const message = (error || this.isAborting) ?
            terminationMessage :
            ` --- ${this.numberOfTests} actions of ${this.currentProjectName} are completed`;

        const closingResult = new Result( LAST_RESULT_ID, message, true);

        closingResult.message += " on " + moment().format(FULL_DATE_FORMAT);
        if (error) closingResult.handleFail(error.message, "cleanUp with Error");

        if (this.unitRunner) await this.unitRunner.closePlcConnection(this.rLogger);
        this.rLogger.logResult(closingResult);
    }
}

const defIds = {
    openPlcConnectAsId: "connectionActionSetId",
    openPlcAuId: "openConnection",
    readTagsAuId: "readAllTags",
    closeAsResultId: "closeAsResult",
    cleanMemoryId: "cleanMemoryId",
    closeConnectionId: "closeConnectionId",
}

class UnitRunner {
    private readonly plc: IController;
    private isAborting: boolean = false;
    private runnerLogRunner = new RunnerLogRunner();
    private sleepRunner = new SleepRunner();
    private stvRunner: SetTagValuesRunner;
    private ctvRunner: CheckTagValuesRunner;
    private heartbeatRunner: HeartBeatRunner;
    private rtvRunner: ResetTagValuesRunner;
    private unitTestRunner: UnitTestRunner;
    private appConfig = AppConfigService.getConfig();

    constructor(
        private readonly tagsMap: Map<string, AbTag>,
        private readonly plcConfig: IPlcConfig,
        projectConfig: IProjectConfig
    ) {
        this.plc = new CipController(this.appConfig.commsQueueDelay);
        this.stvRunner = new SetTagValuesRunner(this.plc, this.tagsMap);
        this.ctvRunner = new CheckTagValuesRunner(this.plc, this.tagsMap);
        this.heartbeatRunner = new HeartBeatRunner(this.plc, this.tagsMap);
        this.rtvRunner = new ResetTagValuesRunner(this.plc, this.tagsMap);
        this.unitTestRunner = new UnitTestRunner(this.plc, this.tagsMap, projectConfig.unitTestTolerance);
    }

    public async openPlcConnection(rLogger: RunnerLogger) {
        const openPlcConnectionResult = new AsResult(defIds.openPlcConnectAsId, "Open PLC Connection");
        rLogger.logResult(openPlcConnectionResult);

        const connectResult = new AuResult(defIds.openPlcAuId, "Opening connection");
        rLogger.logResult(connectResult);
        try {
            await this.plc.openConnection(this.plcConfig.ipAddress, 10000, this.plcConfig.cpuSlot);
        } catch (e) {
            connectResult.handleFail(
                `Failed to connect to PLC at ${this.plcConfig.ipAddress}:${this.plcConfig.cpuSlot}`
            );
            rLogger.logResult(connectResult, true);
            throw e;
        }
        const props = this.plc.getProperties();
        connectResult.passCondition = `Connect to PLC at ${this.plcConfig.ipAddress}:${this.plcConfig.cpuSlot}` +
            ` [connected to ${props.name} with v.${props.version} | PLC is ${props.isFaulted ? "" : "NOT"} faulted]`;
        rLogger.logResult(connectResult, true);


        const tagsCheck = new AuResult(defIds.readTagsAuId, "Tags checks");
        rLogger.logResult(tagsCheck);
        try {
            await this.plc.readTags(this.tagsMap);
        } catch (e) {
            for (const tag of this.tagsMap.values()) {
                try {
                    await this.plc.readTag(tag);
                } catch (e) {
                    tagsCheck.handleFail(e.message);
                    rLogger.logResult(tagsCheck, true);
                    throw e;
                }
            }
        }
        tagsCheck.passCondition = this.tagsMap.size + " tag have been initialised and read from PLC";
        rLogger.logResult(tagsCheck, true);

        openPlcConnectionResult.finishedAt = Date.now();
    }

    public async closePlcConnection(rLogger: RunnerLogger) {

        const closeAsResult = new AsResult(defIds.closeAsResultId, "Close PLC Connection");
        rLogger.logResult(closeAsResult);

        const cleaningMemoryResult = new AuResult(defIds.cleanMemoryId, "Cleaning memory");
        rLogger.logResult(cleaningMemoryResult);
        await this._stopTests();
        await LpUtils.sleep(1000);
        cleaningMemoryResult.passCondition = `Tag scans and heartbeats should stop`;
        rLogger.logResult(cleaningMemoryResult, true);

        const closeResult = new AuResult(defIds.closeConnectionId, "Closing connection");
        rLogger.logResult(closeResult);
        this.plc.closeConnection();
        closeResult.passCondition = `TCP socket should close`;
        rLogger.logResult(closeResult, true);

        closeAsResult.finishedAt = Date.now();
    }


    public async runUnit(actionUnit: IActionUnit, result: AuResult) {

        if (!this.plc.isConnected) throw new Error("PLC is NOT connected, terminating the test.");

        result.startedAt = Date.now();
        switch (actionUnit.type) {
            case ActionUnitType.RunnerLog:
                await this.runnerLogRunner.run(actionUnit, result);
                break;
            case ActionUnitType.SetTagValue:
                await this.stvRunner.run(actionUnit, result);
                break;
            case ActionUnitType.CheckTagValue:
                await this.ctvRunner.run(actionUnit, result);
                break;
            case ActionUnitType.UnitTest:
                await this.unitTestRunner.run(actionUnit, result);
                break;
            case ActionUnitType.Sleep:
                await this.sleepRunner.run(actionUnit, result);
                break;
            case ActionUnitType.ResetTagValue:
                await this.rtvRunner.run(actionUnit, result);
                break;
            case ActionUnitType.Heartbeat:
                await this.heartbeatRunner.run(actionUnit, result);
                break;
            default:
                throw new Error("Action Unit type is not supported.");
        }
        result.finishedAt = Date.now();

    }

    public abortRunners() {
        this.isAborting = true;
        this._stopTests()
        this.plc.stopScan();
    }

    private _stopTests() {
        this.runnerLogRunner.abort();
        this.sleepRunner.abort();
        this.stvRunner.abort();
        this.ctvRunner.abort();
        this.heartbeatRunner.abort();
        this.rtvRunner.abort();
        this.unitTestRunner.abort();
    }
}


class RunnerLogger {
    private projectIndent = "  ";
    private setIndent = this.projectIndent.repeat(2);
    private unitIndent = this.projectIndent.repeat(4);
    private readonly results: ResultTypes[];

    constructor(results: ResultTypes[]) {
        this.results = results;
    }

    public logResult(result: ResultTypes, isFinal?: boolean) {
        if (isFinal) result.finishedAt = Date.now();

        if (this.results.length !== 0) {
            const lastResult = this.results[this.results.length - 1];
            if (lastResult.id === result.id) this.results.pop();
        }
        this.results.push(result);

        const runnerWindow = getRunnerWindow();
        if (runnerWindow) runnerWindow.webContents.send(IpcSubTopic.onNewRunnerResult, result);

        // if (result.type === ResultType.Result) return this.projectLog(result);
        // if (result.type === ResultType.AsResult) return this.setLog(result);
        // if (result.type === ResultType.AuResult) return this.unitLog(result);
        // logger.error("Not supported Result type");
    }


    private projectLog(result: Result) {
        console.log("");
        console.log(this.projectIndent + result.message);
        if (result.error) console.log(this.projectIndent + "ERROR: " + result.error);
    }

    private setLog(setResult: AsResult) {
        console.log("");
        console.log(this.setIndent + setResult.message);
    }

    private unitLog(unitResult: AuResult) {
        if (unitResult.finishedAt < 0) {
            console.log(this.unitIndent + unitResult.message);
        } else {
            const newLineIndent = "\n" + this.unitIndent.repeat(2);
            const elapsed = unitResult.finishedAt - unitResult.startedAt;
            const message = this.unitIndent +
                ((unitResult.error) ?
                    `  \u2715 FAIL after ${elapsed}ms: ` + unitResult.error :
                    `  \u2713 PASS after ${elapsed}ms: ` + newLineIndent +
                    (unitResult.passCondition.replace(/\n/g, newLineIndent)));

            if (unitResult.error) console.log("\x1b[31m%s\x1b[0m", message); // 31 - red, 32 - green, 33 - yellow
            else console.log(message);
        }
    }
}

