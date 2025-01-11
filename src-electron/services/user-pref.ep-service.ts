import * as electron from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {LpUtils} from "../../src/_common/utils";

const userPath = path.join(electron.app.getPath('userData'), 'user');
const parsedUser: IUserPref = parseUserFile(userPath);

if (!parsedUser.clientId) {
    parsedUser.clientId = LpUtils.generateId();
    fs.writeFileSync(userPath, JSON.stringify(parsedUser));
}

export const user = {
    clientId: parsedUser.clientId
};

function parseUserFile(filePath: string) {
    try {
        return JSON.parse(fs.readFileSync(filePath, {encoding: "utf8"}));
    } catch(error) {
        return {};
    }
}

export interface IUserPref {
    clientId: string
}
