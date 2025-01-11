import Logger, {appVersion} from "../../_ui_common/logger.service";
import {projectLocalForage as db} from "./localforage.config";
import {confirmProjectProps, PlcType, Project} from "../../_common/interfaces";

const logger = new Logger("ProjectDbService");

let cachedProject = new Project(appVersion);
let isInitCompleted = false;

export class ProjectDbService {

    constructor() {
        if (!isInitCompleted)
            throw new Error("ProjectDbService wasn't initialised yet. Call ProjectDbService.init() first.");
    }

    static async init() {
        if (isInitCompleted) return;

        try {
            // checking if any in database and set a new one if not
            const projectFromDb = await ProjectDbService.getLastProject();
            cachedProject = projectFromDb || cachedProject;
            if (!projectFromDb) {
                cachedProject.modifiedOn = Date.now();
                await db.setItem(cachedProject.id, cachedProject);
            }
            else confirmProjectProps(cachedProject);
        } catch (e) {
            logger.error(e)
        }
        isInitCompleted = true;
    }

    private static async getLastProject(): Promise<Project | null> {
        const length = await db.length();
        const projectId = await db.key(length - 1);
        logger.log(`Found ${length} projects, selected: ${projectId}`);
        return db.getItem(projectId || "");
    }

    getProject(): Project {
        return getProjectCopyFrom(cachedProject);
    }

    static getProjectPlcType(): PlcType {
        return cachedProject.plcConfig.type
    }

    async getProjectFromDB(projectId?: string): Promise<Project | null> {
        projectId = projectId || cachedProject.id;
        logger.log(`Getting "${projectId}" from Project DB`);
        return db.getItem(projectId);
    }

    public async count(): Promise<number> {
        return db.length();
    }

    async setProject(project: Project): Promise<Project> {
        project.modifiedOn = Date.now();
        logger.log(`Setting "${project.name}" in Project DB`);
        const promise = db.setItem(project.id, project);
        cachedProject = getProjectCopyFrom(project);
        return promise;
    }

    async removeActionSets(actionSetIdsToDelete: string[]) {
        const actionSetIds = cachedProject.actionSetIds;
        for (let i = actionSetIds.length; i >= 0; i--) {
            if (actionSetIdsToDelete.includes(actionSetIds[i])) actionSetIds.splice(i, 1)
        }
        logger.log(`${actionSetIdsToDelete.length} Action Sets will be removed.`);

        await this.setProject(cachedProject);
    }

    async clearDb() {
        logger.log(`!!! - Cleaning Project DB`);
        await db.clear();
    }
}

export function getProjectCopyFrom(project: Project): Project {
    return {
        ...project,
        actionSetIds: [...project.actionSetIds],
        plcConfig: {...project.plcConfig},
        config: {...project.config},
    }
}

