import {BrowserWindow} from "electron";
import * as path from "path";
import * as url from "url";
import LoggerMP, {isDev} from "./services/logger-ep.service";
import AppStateMainService, {WindowType} from "./services/app-state.main-service";
import {DEFAULT_RUNNER_WIN_NAME, getWebPreferences} from "../src/_common/defaults";

const logger = new LoggerMP("createBitSetterWindow");
const mainAppState = new AppStateMainService();
let bitSetterWindow: Electron.BrowserWindow | undefined;

export function getBitSetterWindow(): Electron.BrowserWindow | undefined {
    return bitSetterWindow
}

export function createBitSetterWindow(): Electron.BrowserWindow {
    logger.log("Creating Bit Setter Window!");

    if (bitSetterWindow != null) {
        if (bitSetterWindow.isMinimized()) bitSetterWindow.restore();
        bitSetterWindow.focus();
        return bitSetterWindow;
    }

    const { width, height } = mainAppState.getWinBounds(WindowType.BitSetter);
    const runnerWinPos = mainAppState.getWindowPosition(WindowType.BitSetter);

    // Create the browser window.
    bitSetterWindow = new BrowserWindow({
        title: DEFAULT_RUNNER_WIN_NAME,
        x: runnerWinPos[0],
        y: runnerWinPos[1],
        width: width,
        height: height,
        webPreferences: getWebPreferences(path.join(__dirname, "/window._preload.js"))
    });

    bitSetterWindow.loadURL( (isDev)?
        "http://localhost:3000#/bit-setter" :
        url.format({
            pathname: path.join(__dirname, "/../../build/index.html"),
            protocol: "file:",
            slashes: true
        }) + "#/bit-setter"
    ).catch(e => { throw e });

    // window.webContents.openDevTools();

    // Emitted when the window is closed.
    bitSetterWindow.on("closed", () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        bitSetterWindow = undefined;
    });

    bitSetterWindow.on('resize', () => {
        if (!bitSetterWindow) return;
        const { width, height } = bitSetterWindow.getBounds();
        mainAppState.setWindowBounds(WindowType.BitSetter,{ width, height });
    });

    bitSetterWindow.on('move', () => {
        if (!bitSetterWindow) return;
        const position = bitSetterWindow.getPosition();
        mainAppState.setWindowPosition(WindowType.BitSetter, [position[0], position[1]]);
    });

    return bitSetterWindow;
}
