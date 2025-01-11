import {WebPreferences} from "electron";

export const DEFAULT_APP_NAME = "PLC Logic Prover";
export const DEFAULT_APP_WIN_NAME = "Test Builder";
export const DEFAULT_RUNNER_WIN_NAME = "Test Runner";
export const DEFAULT_BIT_SETTER_NAME = "Bit Setter";
export const WINDOW_WIDTH = 1000;
export const WINDOW_HEIGHTS = 800;
export const WINDOW_RUNNER_WIDTH = 740;
export const WINDOW_RUNNER_HEIGHTS = 600;
export const WINDOW_BIT_SETTER_WIDTH = 550;
export const WINDOW_BIT_SETTER_HEIGHTS = 300;
export const WINDOW_ABOUT_WIDTH = 310;
export const WINDOW_ABOUT_HEIGHTS = 500;
export const SAVE_WIN_POSITION_TIMEOUT = 1000;
export const SAVE_APP_STATE_TIMEOUT = 500;
export const TAGS_COLUMNS_WIDTHS = {
    tagname: 190,
    program: 140,
    datatype: 120,
    desc: 280,
    usage: 90,
    mbAddress: 140
};
export const EXPORT_WARNING_MESSAGE = "DO NOT MODIFY THIS FILE!!! THIS IS AUTOMATICALLY GENERATED AND WILL FAIL IF CHECKSUMS DO NOT MATCH!";
export const NOT_A_SECRET = "controlx.io";
export const EXPORT_FILE_EXTENSION = ".lpex";
export const EXPORT_TEST_EXTENSION = ".lptr";
export const CSV_FILE_EXTENSION = ".csv";
export const DUPLICATED_TAG = "__duplicated_tag__";

export const DEFAULT_TOAST_TIMEOUT = 1200;
export const DEFAULT_WARNING_TOAST_TIMEOUT = 1200;
export const DEFAULT_DANGER_TOAST_TIMEOUT = 4000;
export const DEFAULT_SUCCESS_TOAST_TIMEOUT = 2000;

export const DOCS_LINK = "https://github.com/controlx-io/logic-prover-support/wiki/Documentation";
export const REPORT_BUG_LINK = "https://github.com/controlx-io/logic-prover-support/issues";
export const SUGGESTION_LINK = "https://github.com/controlx-io/logic-prover-support/issues";

export const DEFAULT_UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 2; // 1000 * 60 * 60 * 2 = 2 hours

export function getWebPreferences(pathToPreloadFile: string): WebPreferences {
    return {
        sandbox: false,
        nodeIntegration: false,
        spellcheck: true,
        contextIsolation: true,
        preload: pathToPreloadFile
    }
}
