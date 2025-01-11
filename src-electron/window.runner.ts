import {BrowserWindow} from "electron";
import * as path from "path";
import * as url from "url";
import LoggerMP, {isDev} from "./services/logger-ep.service";
import AppStateMainService, {WindowType} from "./services/app-state.main-service";
import {DEFAULT_RUNNER_WIN_NAME, getWebPreferences} from "../src/_common/defaults";

const logger = new LoggerMP("createTestRunnerWindow");
const mainAppState = new AppStateMainService();
let testRunnerWindow: Electron.BrowserWindow | undefined;

export function getRunnerWindow(): Electron.BrowserWindow | undefined {
    return testRunnerWindow
}

export function createTestRunnerWindow(): Electron.BrowserWindow {

    if (testRunnerWindow != null) {
        if (testRunnerWindow.isMinimized()) testRunnerWindow.restore();
        testRunnerWindow.focus();
        return testRunnerWindow;
    }

    const { width, height } = mainAppState.getWinBounds(WindowType.Runner);
    const runnerWinPos = mainAppState.getWindowPosition(WindowType.Runner);

    // Create the browser window.
    testRunnerWindow = new BrowserWindow({
        title: DEFAULT_RUNNER_WIN_NAME,
        x: runnerWinPos[0],
        y: runnerWinPos[1],
        width: width,
        height: height,
        webPreferences: getWebPreferences(path.join(__dirname, "/window._preload.js"))
    });

    testRunnerWindow.loadURL( (isDev)?
        "http://localhost:3000#/test-runner" :
        url.format({
            pathname: path.join(__dirname, "/../../build/index.html"),
            protocol: "file:",
            slashes: true
        }) + "#/test-runner"
    ).catch(e => { throw e });

    // window.webContents.openDevTools();

    // Emitted when the window is closed.
    testRunnerWindow.on("closed", () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        testRunnerWindow = undefined;
    });

    testRunnerWindow.on('resize', () => {
        if (!testRunnerWindow) return;
        const { width, height } = testRunnerWindow.getBounds();
        mainAppState.setWindowBounds(WindowType.Runner,{ width, height });
    });

    testRunnerWindow.on('move', () => {
        if (!testRunnerWindow) return;
        const position = testRunnerWindow.getPosition();
        mainAppState.setWindowPosition(WindowType.Runner, [position[0], position[1]]);
    });

    return testRunnerWindow;
}
