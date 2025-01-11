import "./env-config";
import {app} from "electron";
import MenuBuilder from "./app-menu";
import "./services/ipc_main.service";
import LoggerMP from "./services/logger-ep.service";
import {createAppWindow} from "./window.app";
import AppUpdaterService from "./services/app-updater-service";

const logger = new LoggerMP("main.js");

const gotTheLock = app.requestSingleInstanceLock();

new MenuBuilder();

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        createAppWindow();
    })

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on("ready", () => {
        const mainWIn = createAppWindow();
        if (app.isPackaged) new AppUpdaterService(mainWIn);
    });

    // Quit when all windows are closed.
    app.on("window-all-closed", () => {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        // if (process.platform !== "darwin") {
        app.quit();
        // }
    });

    app.on("activate", () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        createAppWindow();
    });
}
