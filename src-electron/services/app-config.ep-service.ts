import {AppConfig} from "../../src/_common/interfaces";

const electron = require('electron');
const path = require('path');
const fs = require('fs');

const configPath = path.join(electron.app.getPath('userData'), 'app-config.json');
const appConfig = new AppConfig();
AppConfig.mergerConfigs(parseDataFile(configPath), appConfig);
fs.writeFileSync(configPath, JSON.stringify(appConfig));



export class AppConfigService {

    static getConfig(): AppConfig {
        return appConfig
    }

    static setConfig(conf: AppConfig) {
        AppConfig.mergerConfigs(conf, appConfig);
        fs.writeFileSync(configPath, JSON.stringify(conf));
    }
}



function parseDataFile(filePath: string) {
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch(error) {
        return new AppConfig();
    }
}
