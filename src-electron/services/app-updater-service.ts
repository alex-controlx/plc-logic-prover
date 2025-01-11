import {autoUpdater, UpdateDownloadedEvent} from "electron-updater";
import log from "electron-log";
import {dialog} from "electron";
import {DEFAULT_UPDATE_CHECK_INTERVAL} from "../../src/_common/defaults";
import {user} from "./user-pref.ep-service";

let mainWin: Electron.BrowserWindow;

export default class AppUpdaterService {
    private intervalId?: NodeJS.Timeout;
    constructor(appWin: Electron.BrowserWindow) {
        mainWin = appWin;
        log.transports.file.level = "debug";
        autoUpdater.logger = log;
        autoUpdater.requestHeaders = {
            cid: user.clientId
        };
        autoUpdater.checkForUpdatesAndNotify();

        this.intervalId = setInterval(() => {
            autoUpdater.checkForUpdatesAndNotify().catch(e => {
                log.error(e);
                if (this.intervalId) clearInterval(this.intervalId);
            });
        }, DEFAULT_UPDATE_CHECK_INTERVAL);
    }
}

autoUpdater.on("error", log.error);

autoUpdater.on("update-downloaded", async (event: UpdateDownloadedEvent) => {
    const {releaseName} = event;

    const dialogOpts = {
        type: "info",
        buttons: ["Restart", "Later"],
        title: "Application Update",
        message: Array.isArray(releaseName) ? releaseName[0].note : releaseName,
        detail: "A new version has been downloaded. Restart the application to apply the updates."
    };

    if (mainWin) {
        const response = await dialog.showMessageBox(mainWin, dialogOpts);
        if (response.response === 0) {
            autoUpdater.quitAndInstall();
        }
    }
});
