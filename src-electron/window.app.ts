import AppStateMainService, {WindowType} from "./services/app-state.main-service";
import {app, BrowserWindow, dialog} from "electron";
import {DEFAULT_APP_NAME, getWebPreferences} from "../src/_common/defaults";
import * as url from "url";
import * as path from "path";
import {isDev} from "./services/logger-ep.service";
import TestRunnerService from "./core/runner.ep-service";

let appWindow: Electron.BrowserWindow | undefined;
let aboutWindow: Electron.BrowserWindow | undefined;
const mainAppState = new AppStateMainService();
const preloadPath = path.join(__dirname, "/window._preload.js");

export function getAppWindow(): Electron.BrowserWindow | undefined {
    return appWindow
}

export function createAppWindow(): Electron.BrowserWindow {

    if (appWindow != null) {
        if (appWindow.isMinimized()) appWindow.restore();
        appWindow.focus();
        return appWindow;
    }

    const { width, height } = mainAppState.getWinBounds(WindowType.Main);
    const mainWinPos = mainAppState.getWindowPosition(WindowType.Main);

    // Create the browser window.
    appWindow = new BrowserWindow({
        title: DEFAULT_APP_NAME,
        x: mainWinPos[0],
        y: mainWinPos[1],
        width: width,
        height: height,
        webPreferences: getWebPreferences(preloadPath)
    });

    const appUrl = isDev ?
        new url.URL("http://localhost:3000#/app") :
        new url.URL("file:///" + path.join(__dirname, "/../../build/index.html"));


    appWindow.loadURL(appUrl.toString()).catch(console.error);

    appWindow.on("close", (event: Event) => {
        if (appWindow && TestRunnerService.isRunning()) {
            const dialogOpts = {
                type: "info",
                buttons: ["Close", "Cancel"],
                title: "Closing PLC Logic Prover",
                message: "Do you want to close PLC Logic Prover?",
                detail: "You are about to close PLC Logic Prover. The test process " +
                    "will be terminated and log will not be saved."
            };

            const response = dialog.showMessageBoxSync(appWindow, dialogOpts);
            if (response === 1) {
                event.preventDefault();
            }
        }
    })

    // Emitted when the window is closed.
    appWindow.on("closed", () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        // @ts-ignore
        appWindow = null;
        app.quit();
    });

    appWindow.on('resize', () => {
        if (!appWindow) return;
        const { width, height } = appWindow.getBounds();
        mainAppState.setWindowBounds(WindowType.Main,{ width, height });
    });

    appWindow.on('move', () => {
        if (!appWindow) return;
        const position = appWindow.getPosition();
        mainAppState.setWindowPosition(WindowType.Main, [position[0], position[1]]);
    });

    return appWindow;
}

export function createAboutWindow(): Electron.BrowserWindow {

    if (aboutWindow != null) {
        if (aboutWindow.isMinimized()) aboutWindow.restore();
        aboutWindow.focus();
        return aboutWindow;
    }

    const { width, height } = mainAppState.getWinBounds(WindowType.About);
    const winPosition = mainAppState.getWindowPosition(WindowType.About);

    aboutWindow = new BrowserWindow({
        x: winPosition[0],
        y: winPosition[1],
        width: width,
        height: height,
        minimizable: false,
        maximizable: false,
        webPreferences: getWebPreferences(preloadPath)
    });

    const winPath = isDev ?
        path.join(__dirname, "/../../public/about.html") :
        path.join(__dirname, "/../../build/about.html")

    aboutWindow.loadURL(
        url.format({
            pathname: winPath,
            protocol: "file:",
            slashes: true
        })
    );

    // Emitted when the window is closed.
    aboutWindow.on("closed", () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        // @ts-ignore
        aboutWindow = null;
    });

    aboutWindow.on('resize', () => {
        if (!aboutWindow) return;
        const { width, height } = aboutWindow.getBounds();
        mainAppState.setWindowBounds(WindowType.About,{ width, height });
    });

    aboutWindow.on('move', () => {
        if (!aboutWindow) return;
        const position = aboutWindow.getPosition();
        mainAppState.setWindowPosition(WindowType.About, [position[0], position[1]]);
    });

    return aboutWindow;
}
