import {TestRunner} from "./test-runner.ep-class";
import MpLogger from "../services/logger-ep.service";
import {IProjectTransfer} from "../../src/_common/interfaces";
import {getRunnerWindow} from "../window.runner";
import {getAppWindow} from "../window.app";
import {IpcSubTopic, IRunnerStatus} from "../../src/_common/interfaces/ipc.interfaces";
import {IResultFromIpc, ResultTypes} from "../../src/_common/interfaces/result.class";

const logger = new MpLogger("TestRunnerService");

let testRunner: TestRunner | undefined;
const results: ResultTypes[] = [];

export default class TestRunnerService {

    static async start(projectExport: IProjectTransfer) {
        logger.log("Runner start");
        if (testRunner) throw new Error("Cannot run a few Test Runners simultaneously.");

        results.length = 0;
        testRunner = new TestRunner(results);
        const runnerStartStatus: IRunnerStatus = { isRunning: true };

        // on test start
        getAppWindow()?.webContents.send(IpcSubTopic.onRunnerStatusChange, runnerStartStatus);
        getRunnerWindow()?.webContents.send(IpcSubTopic.onRunnerStatusChange, runnerStartStatus);



        let error = "";
        try {
            await testRunner.startRunner(projectExport);
        } catch (e) {
            logger.error(e);
            error = e.message;
        }

        // on test finished
        const runnerFinishStatus: IRunnerStatus = {
            isRunning: false,
            error,
            results: (results as unknown as IResultFromIpc[])
        };
        const runnerWindow = getRunnerWindow();
        if (runnerWindow) {
            runnerWindow.webContents.send(IpcSubTopic.onRunnerStatusChange, runnerFinishStatus);
            delete runnerFinishStatus.results;
        }
        getAppWindow()?.webContents.send(IpcSubTopic.onRunnerStatusChange, runnerFinishStatus);

        //TODO send "results" to controlx.io here


        logger.log("Runner finished");
        testRunner = undefined;
    }

    static getLastResults(): ResultTypes[] {
        return results;
    }

    static isRunning(): boolean {
        return !!testRunner;
    }

    static abort() {
        if (testRunner) testRunner.abort();
    }
}
