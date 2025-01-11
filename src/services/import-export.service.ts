import {ActionSet, IDataExport, IProjectExport, ITagUI, validateTagUIProperties} from "../_common/interfaces";
import Logger, {appVersion} from "../_ui_common/logger.service";
import StorageService from "./storage/storage.service";
import {LpUtils} from "../_common/utils";
import {ActionUnitType, IActionUnit} from "../_common/action-unit";
import {EXPORT_FILE_EXTENSION, EXPORT_WARNING_MESSAGE, NOT_A_SECRET} from "../_common/defaults";
import {MD5} from "crypto-js"


const logger = new Logger("ImportExportService");

export default class ImportExportService {

    static async getProjectExportData(): Promise<IDataExport> {

        const storage = new StorageService();
        const projectExport = await storage.exportProject();

        const projectExportBuffer: IProjectExport = {
            ...projectExport,
            actionSets: [...projectExport.actionSets.values()],
            actionUnits: [...projectExport.actionUnits.values()],
        };
        const projectExportStr = JSON.stringify(projectExportBuffer);
        return {
            warning: EXPORT_WARNING_MESSAGE,
            name: projectExport.project.name,
            version: appVersion,
            hash: MD5(NOT_A_SECRET + projectExportStr).toString(),
            data: projectExportStr,
        };
    }

    static async exportProject() {
        const exportData = await ImportExportService.getProjectExportData();
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(exportData)], {type: "text/plain"});
        element.href = URL.createObjectURL(file);
        element.download = exportData.name + " [export]" + EXPORT_FILE_EXTENSION;
        element.click();
    }

    static async handleConfirmedImport(file: File) {
        if (!(file instanceof File)) return logger.error("File not selected.");
        const text = await file.text();

        // check import file and parse projectExport
        const projectExport = checkValidityOfImport(text);
        if (!projectExport) return logger.error("Project file is invalid or corrupted.");

        // clear the DB and import new project into the DB
        await new StorageService().importProject(projectExport);
    }
}

function checkValidityOfImport(importText: string): IProjectExport | undefined {
    try {
        const importData: IDataExport = JSON.parse(importText);
        if (importData.hash !== MD5(NOT_A_SECRET + importData.data).toString()) {
            logger.error("Checksums don't match.")
            return;
        }

        const projectImport: IProjectExport = JSON.parse(importData.data);
        const project = projectImport.project;
        if (!project || typeof project.id !== "string" || typeof project.version !== "string" ||
            typeof project.name !== "string" || typeof project.modifiedOn !== "number" ||
            !Array.isArray(project.actionSetIds)) {
            logger.error("Corrupted .project data");
            return;
        }
        const plcConfig = project.plcConfig;
        if (!plcConfig || typeof plcConfig.type !== "string" || !LpUtils.isIpAddress(plcConfig.ipAddress) ||
            typeof plcConfig.cpuSlot !== "number") {
            logger.error("Corrupted .plcConfig data");
            return;
        }

        const actionSets = projectImport.actionSets;
        if (!Array.isArray(actionSets)) return;

        const actionUnits = projectImport.actionUnits;
        if (!Array.isArray(actionUnits)) return;

        // looping in the direction of opposite to splice(ing)
        for (let i = project.actionSetIds.length; i >= 0; i--) {
            const actionSetId = project.actionSetIds[i];
            const actionSet = actionSets.find(item => item.id === actionSetId);
            if (!actionSet) {
                project.actionSetIds.splice(i, 1);
                continue;
            }
            if (!ActionSet.isValidObject(actionSet)) {
                logger.error("Corrupted Action Set " + actionSet.name);
                return;
            }

            for (let i = actionSet.actionUnitIds.length; i >= 0; i--) {
                const actionUnitId = actionSet.actionUnitIds[i];
                const actionUnit = actionUnits.find(item => item.id === actionUnitId);
                if (!actionUnit) {
                    actionSet.actionUnitIds.splice(i, 1);
                    continue;
                }
                if (!isActionUnitValid(actionUnit)) {
                    logger.error("Corrupted Action Unit " + actionUnit.name + `[${actionUnit.type}]`);
                    return
                }
            }
        }


        const tags: ITagUI[] = [];
        if (!Array.isArray(projectImport.tags)) return;
        for (const tag of projectImport.tags) {
            if (!validateTagUIProperties(tag)) {
                // logger.error("Corrupted Tag " + tag.tagname);
                continue;
            }
            tags.push(tag);
        }

        return {project, actionSets, actionUnits, tags};
    } catch (e) {
        logger.error(e);
        return
    }
}



function isActionUnitValid(actionUnit: IActionUnit): boolean {
    if (typeof actionUnit.id !== "string") return false;
    if (typeof actionUnit.name !== "string") return false;
    if (typeof actionUnit.enabled !== "boolean") return false;
    if (typeof actionUnit.parentId !== "string") return false;
    if (typeof actionUnit.params !== "object") return false;

    if (actionUnit.type === ActionUnitType.RunnerLog) {
        return typeof actionUnit.params.logMessage === "string";
    }

    if (actionUnit.type === ActionUnitType.CheckTagValue) {
        if (!Array.isArray(actionUnit.params.tagsToCheck) || !actionUnit.params.tagsToCheck.length) return false;
        return true;
    }

    if (actionUnit.type === ActionUnitType.SetTagValue) {
        if (!Array.isArray(actionUnit.params.tagsToSet) || !actionUnit.params.tagsToSet.length) return false;
        return true;
    }

    if (actionUnit.type === ActionUnitType.UnitTest) {
        if (!Array.isArray(actionUnit.params.tagsToModify) || !actionUnit.params.tagsToModify.length) return false;
        if (!Array.isArray(actionUnit.params.expectedChanges) || !actionUnit.params.expectedChanges.length) return false;
        if (!Array.isArray(actionUnit.params.noChangeTagIds)) return false;
        if (!Array.isArray(actionUnit.params.tagsToToggle)) return false;
        return true;
    }

    // Heartbeat ResetTagValue Sleep
    if (actionUnit.type === ActionUnitType.Heartbeat) {
        if (!Array.isArray(actionUnit.params.tagsToToggle) || !actionUnit.params.tagsToToggle.length) return false;
        return true;
    }
    if (actionUnit.type === ActionUnitType.ResetTagValue) {
        if (!Array.isArray(actionUnit.params.tagsToToggle) || !actionUnit.params.tagsToToggle.length) return false;
        return true;
    }
    if (actionUnit.type === ActionUnitType.Sleep) {
        if (typeof actionUnit.params.sleep_s !== "number") return false;
        return true;
    }


    return false;
}
