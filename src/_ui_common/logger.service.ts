export const isDev = window ? false :
    process && process.env && process.env.NODE_ENV === "development";
export const isMac = navigator && navigator.platform && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

let notificationCallback: (message: string) => void;

const modulesToDebug: string[] =
    process.env.REACT_APP_DEBUG ? process.env.REACT_APP_DEBUG.split(",") : [];

// process.env.npm_package_version is only available in Jest tests
// in Logger.init() the appVersion is taken from Electron package
export let appVersion = window ? "0.0.0" : (process.env.npm_package_version || "0.0.0");
    // (process && process.env && process.env.npm_package_version) ?
    // process.env.npm_package_version : "browser-dev";

export default class Logger {
    private readonly tag: string;
    private readonly debug: boolean;

    static async init() {
        if (window.electronApi) appVersion = await window.electronApi.getAppVersion();
        console.log(`Running v${appVersion} in ${process.env.NODE_ENV} mode` +
            (modulesToDebug.length ? `, DEBUG=${modulesToDebug.join(",")}` : ""));
    }

    static registerCallback(callback: (message: string) => void) {
        notificationCallback = callback
    }

    constructor(className: string, debug?: boolean) {
        this.tag = className;
        this.debug = (debug !== undefined)? debug : modulesToDebug.includes(className);
    }

    public log(...args: any) {
        if (isDev && this.debug) console.log(this.tag + " >> ", ...args);
    }

    public error(error: Error | string | unknown) {
        const message = (error instanceof Error) ? error.message :
            (typeof error === "string") ? error : JSON.stringify(error);
        console.error(this.tag + " >> ", error);
        if (typeof notificationCallback === "function") {
            notificationCallback(message)
        }
    }
}

export const ERRORS = {
    err000: "E0: No Action Sets not found in the project.",
    err001: "E1: Tree Node not found by Action Set ID.",
    err002: "E2: Cannot find action sets to delete in the project.",
    err003: "E3: Action Set already in the project.",
    err004: "E4: Action Set not found by Action Set ID.",
    err005: "E5: Action Unit not found by Action Unit ID.",
    err006: "E6: Cannot find IActionSet for inserting new Action Unit.",
    err007: "E7: Action Unit is already in the Action Set.",
    err008: "E8: Cannot find parent node to move.",
    err009: "E9: Action Set not found for Action Unit deletion.",
    err010: "E10: Couldn't find action set to delete in the project.",
    err011: "E11: Add IActionSet before adding Action unit.",
    err012: "E12: Tree Node not found by Action Set ID.",
    err013: "E13: Action Unit not found by Action Unit ID.",
    err014: "E14: Action Unit not found by Action Unit ID.",
    err015: "E15: Action Unit not found by Action Unit ID.",
    err016: "E16: Action Unit not selected to be deleted.",
    err017: "E17: Child Tree Node not found by Action Unit ID.",
    err018: "E18: Action Unit not selected to be moved.",
    err019: "E19: Action Unit does not exist in the parent Set.",
    err020: "E20: Action Unit not found by its parent ID.",
    err021: "E21: Action Unit not found by Action Unit ID.",
    ws000: "WS0: Action Set not found by Action Set ID.",
    ws001: "WS1: There is no parent to save this Action Unit.",
    ws002: "WS2: Action Unit not selected to be duplicated.",
    ws003: "WS3: Action Unit not selected to be displayed.",
    ws004: "WS4: Type of Action unit is not supported.",
    ut000: "UT0: Tag is not selected for changing its value.",
    // Action Unit dialogs
    aud000: "AUD0: Action Unit not found to be deleted.",
    trv000: "TRV0: Action Set not found by ID.",
    trv001: "TRV1: Action Unit not found by ID.",
    // Tags page
    tp000: "TP0: Tag is not selected to delete.",
    tp001: "TP1: Tag is not found to duplicate.",
    tp002: "TP2: Tag is not selected to duplicate.",
    // Action Unit Database
    audb0: "AUDB1: Action Unit not found to be moved.",
    // Storage
    str01: "STR01: Action Unit not found in DB",
    str02: "STR02: Action Unit not found in cache",
    str03: "STR03: Action Set not found in cache",
    str04: "STR04: Action Set not found in cache",
    str05: "STR05: Action Set not found in cache",
    // Sidebar
    sb01: "SB01: Action Unit not found in DB",
    sb02: "SB02: Action Unit not found in DB"
};
