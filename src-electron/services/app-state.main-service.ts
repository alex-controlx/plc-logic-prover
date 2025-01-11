import {
    SAVE_WIN_POSITION_TIMEOUT,
    WINDOW_RUNNER_HEIGHTS,
    WINDOW_RUNNER_WIDTH,
    WINDOW_HEIGHTS,
    WINDOW_WIDTH, WINDOW_BIT_SETTER_HEIGHTS, WINDOW_BIT_SETTER_WIDTH, WINDOW_ABOUT_WIDTH, WINDOW_ABOUT_HEIGHTS
} from "../../src/_common/defaults";
import {isDev} from "./logger-ep.service";

const electron = require('electron');
const path = require('path');
const fs = require('fs');

export enum WindowType {
    BitSetter,
    Main,
    Runner,
    About,
}

const statePath = path.join(electron.app.getPath('userData'), 'app-state.json');
const appState: AppMainState = getDefaultAppState();
const parsedState: AppMainState = parseDataFile(statePath);
mergerStates(appState, parsedState);

let newPositionTimeoutId: NodeJS.Timeout;

export default class AppStateMainService {

    getWinBounds(winType: WindowType): IWindowBounds {
        return getWindowsState(winType).bounds;
    }

    setWindowBounds(winType: WindowType, windowBounds: IWindowBounds) {
        getWindowsState(winType).bounds = windowBounds;
        fs.writeFileSync(statePath, JSON.stringify(appState));
    }


    getWindowPosition(winType: WindowType): number[] {
        return getWindowsState(winType).position;
    }

    setWindowPosition(winType: WindowType, position: number[]) {
        clearTimeout(newPositionTimeoutId);
        newPositionTimeoutId = setTimeout(() => {
            getWindowsState(winType).position = position;
            fs.writeFileSync(statePath, JSON.stringify(appState));

        }, SAVE_WIN_POSITION_TIMEOUT);
    }
}

function getWindowsState(winType: WindowType): IWindowState {
    switch (winType) {
        case WindowType.Main: return appState.mainWin;
        case WindowType.Runner: return appState.runnerWin;
        case WindowType.BitSetter: return appState.bitSetter;
        case WindowType.About: return appState.aboutWin;
    }
}

function parseDataFile(filePath: string) {
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch(error) {
        return getDefaultAppState();
    }
}

interface IWindowBounds {
    width: number,
    height: number,
}

interface IWindowState {
    bounds: IWindowBounds,
    position: number[]
}

interface AppMainState {
    mainWin: IWindowState,
    runnerWin: IWindowState,
    bitSetter: IWindowState,
    aboutWin: IWindowState,
}

function getDefaultAppState(): AppMainState {
    return {
        mainWin: {
            bounds: {
                width: WINDOW_WIDTH + ((isDev)? 800 : 0),
                height: WINDOW_HEIGHTS,
            },
            position: [70, 50]
        },
        runnerWin: {
            bounds: {
                width: WINDOW_RUNNER_WIDTH,
                height: WINDOW_RUNNER_HEIGHTS,
            },
            position: [120, 100]
        },
        bitSetter: {
            bounds: {
                width: WINDOW_BIT_SETTER_WIDTH,
                height: WINDOW_BIT_SETTER_HEIGHTS,
            },
            position: [120, 100]
        },
        aboutWin: {
            bounds: {
                width: WINDOW_ABOUT_WIDTH,
                height: WINDOW_ABOUT_HEIGHTS,
            },
            position: [200, 200]
        }
    }
}

function mergerStates(appState: AppMainState, parsedState: AppMainState) {
    if (parsedState.mainWin) {
        mergeWinState(appState.mainWin.bounds, appState.mainWin.position,
            parsedState.mainWin.bounds, parsedState.mainWin.position)
    }
    if (parsedState.runnerWin) {
        mergeWinState(appState.runnerWin.bounds, appState.runnerWin.position,
            parsedState.runnerWin.bounds, parsedState.runnerWin.position)
    }
    if (parsedState.bitSetter) {
        mergeWinState(appState.bitSetter.bounds, appState.bitSetter.position,
            parsedState.bitSetter.bounds, parsedState.bitSetter.position)
    }
    if (parsedState.aboutWin) {
        mergeWinState(appState.aboutWin.bounds, appState.aboutWin.position,
            parsedState.aboutWin.bounds, parsedState.aboutWin.position)
    }
}

function mergeWinState(
    stateBounds: IWindowBounds, statePosition: number[], bounds?: IWindowBounds, position?: number[]
) {
    if (bounds) {
        stateBounds.width = bounds.width
        stateBounds.height = bounds.height
    }
    if (Array.isArray(position)) {
        statePosition.length = 0;
        statePosition.push(...position)
    }
}
