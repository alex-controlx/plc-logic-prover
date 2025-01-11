import {app, ipcMain, IpcMainEvent} from "electron";
import {IpcRequest, IpcPubTopic, IpcSubTopic, IpcRemote} from "../../src/_common/interfaces/ipc.interfaces";
import TestRunnerService from "../core/runner.ep-service";
import {createTestRunnerWindow, getRunnerWindow} from "../window.runner";
import {IInvalidUnitMessage} from "../../src/_common/action-unit";
import {IProjectTransfer} from "../../src/_common/interfaces";
import {user} from "./user-pref.ep-service";
import {AppConfigService} from "./app-config.ep-service";


ipcMain.on(IpcPubTopic.initiateRunner, async (event: IpcMainEvent, req: IpcRequest) => {

    const projectExport: IProjectTransfer = req.data;
    // const tempData = new TestData();
    // const projectExport = tempData.getData();
    event.reply(req.responseChannel, {success: true, message: "Starting Runner"})

    await TestRunnerService.start(projectExport);
});

ipcMain.on(IpcPubTopic.isRunnerActive, (event: IpcMainEvent, req: IpcRequest) => {
    event.reply(req.responseChannel, TestRunnerService.isRunning())
});
ipcMain.on(IpcPubTopic.openRunner, (event: IpcMainEvent, req: IpcRequest) => {
    createTestRunnerWindow();
    event.reply(req.responseChannel, {success: true})
});
ipcMain.on(IpcPubTopic.closeRunner, (event: IpcMainEvent, req: IpcRequest) => {
    const runnerWindow = getRunnerWindow();
    if (runnerWindow) runnerWindow.close();
    event.reply(req.responseChannel, {success: true})
});

ipcMain.on(IpcPubTopic.abortRunner, (event: IpcMainEvent, req: IpcRequest) => {
    TestRunnerService.abort();
    event.reply(req.responseChannel, {success: true})
});

// this used to send Invalid Units array from appWindow to testRunnerWindow.
ipcMain.on(IpcPubTopic.setInvalidUnits, (event: IpcMainEvent, req: IpcRequest) => {
    const data: IInvalidUnitMessage[] = req.data;
    const runnerWindow = getRunnerWindow();
    if (runnerWindow) runnerWindow.webContents.send(IpcSubTopic.onInvalidUnitsUpdate, data);
    event.reply(req.responseChannel, {success: true})
});

// request last test results from runner.service.ts
ipcMain.on(IpcPubTopic.getResults, (event: IpcMainEvent, req: IpcRequest) => {
    event.reply(req.responseChannel, TestRunnerService.getLastResults())
});

ipcMain.on(IpcPubTopic.getAppConfig, (event: IpcMainEvent, req: IpcRequest) => {
    event.reply(req.responseChannel, AppConfigService.getConfig())
});

ipcMain.on(IpcPubTopic.setAppConfig, (event: IpcMainEvent, req: IpcRequest) => {
    AppConfigService.setConfig(req.data);
    event.reply(req.responseChannel, {success: true})
});


ipcMain.handle(IpcRemote.appVersion, async () => {
    return app.getVersion();
});

ipcMain.handle(IpcRemote.getClientId, async () => {
    return user.clientId;
});
