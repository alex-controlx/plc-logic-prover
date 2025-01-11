import {ProjectDbService} from "./project_db.service";
import {ActionSetDbService} from "./action_set_db.service";
import {ActionUnitDbService, getActionUnitCopyFrom} from "./action_unit_db.service";
import Logger, {appVersion, ERRORS} from "../../_ui_common/logger.service";
import TagsService from "./tags.service";
import {
    ActionSet,
    confirmProjectProps,
    DEFAULT_AS_UNNAMED,
    DEFAULT_UNNAMED_PROJECT,
    DpDisplayedType,
    IActionSet,
    IProjectExport, IProjectTransfer,
    Project
} from "../../_common/interfaces";
import {
    ActionUnitType,
    CheckTagValuesAU,
    DEFAULT_UNNAMED_AU,
    getInvalidMessageOf,
    HeartbeatAU,
    IActionUnit,
    ResetTagValueAU,
    RunnerLogAU,
    SetTagValuesAU,
    SleepAU,
    UnitTestAU
} from "../../_common/action-unit";
import UnitsChecker from "./units-checker";
import ResultsService from "./results_db.service";
import {AppStateService} from "../app-state.service";
import PubSub_LP from "../_pubsub.aclass";

const logger = new Logger("StorageService");

let projectDb: ProjectDbService;
let actionSetDb: ActionSetDbService;
const resultsDb = new ResultsService();
let actionUnitDb: ActionUnitDbService;
let unitChecker: UnitsChecker;
let tagService: TagsService;

let isInitCompleted = false;

enum StorageActions {
    ClearingProject = "ClearingProject",
    ClearingProjectCompleted = "ClearingProjectCompleted",
    UpdateProject = "UpdateProject",
    EditActionSet = "EditActionSet",
    DeleteActionSet = "DeleteActionSet",
    AddActionUnit = "AddActionUnit",
    UpdateActionUnit = "UpdateActionUnit",
    MoveActionUnit = "MoveActionUnit",
    DeleteActionUnit = "DeleteActionUnit",
}

export default class StorageService extends PubSub_LP {

    constructor() {
        super();
        if (!isInitCompleted) throw new Error("StorageService wasn't initialised yet. Call StorageService.init() first.")
    }

    static async init() {
        if (isInitCompleted) return;

        await ProjectDbService.init();
        projectDb = new ProjectDbService();

        await TagsService.init();
        tagService = new TagsService();

        await ActionSetDbService.init();
        actionSetDb = new ActionSetDbService();

        await UnitsChecker.init(tagService);
        unitChecker = new UnitsChecker();

        await ActionUnitDbService.init();
        actionUnitDb = new ActionUnitDbService();

        isInitCompleted = true;
    }


    getProject(): Project {
        return projectDb.getProject();
    }

    public subscribeOnUpdateProject(callback: (project: Project) => void) {
        return this.subscribeOnChange(StorageActions.UpdateProject, callback)
    }
    async updateProject(newProject: Project): Promise<Project> {
        try {
            const promise = await projectDb.setProject(newProject);
            this.dispatchEvent(StorageActions.UpdateProject, newProject);
            return promise;
        } catch (e) {
            logger.error(e);
            throw e
        }

    }

    async clearProject(newName?: string) {
        this.dispatchEvent(StorageActions.ClearingProject);
        const newProject = new Project(appVersion);
        newProject.name = newName || DEFAULT_UNNAMED_PROJECT;

        await projectDb.clearDb();
        await this.updateProject(newProject);
        await actionSetDb.clearDb();
        await actionUnitDb.clearDb();
        await resultsDb.clearResultsDb();

        await tagService.clearDb();

        this.dispatchEvent(StorageActions.ClearingProjectCompleted);
    }
    public clearProjectSubscriber(callback: () => void) {
        return this.subscribeOnChange(StorageActions.ClearingProject, callback)
    }
    public clearProjectCompletedSubscriber(callback: () => void) {
        return this.subscribeOnChange(StorageActions.ClearingProjectCompleted, callback)
    }

    async importProject(importProject: IProjectExport) {
        this.dispatchEvent(StorageActions.ClearingProject);
        await projectDb.clearDb();
        await actionSetDb.clearDb();
        await actionUnitDb.clearDb();
        await resultsDb.clearResultsDb();
        await tagService.clearDb();

        const appState = new AppStateService();
        appState.sidebar().removeAllExpandedIds();
        appState.setDetailsPanel({
            actionUnitId: "", displayed: DpDisplayedType.StartPage, isDirty: false, isResultShown: true
        })

        if (await projectDb.count() > 0) logger.error("projectDb was not cleared properly.");
        if (await actionSetDb.count() > 0) logger.error("actionSetDb was not cleared properly.");
        if (await actionUnitDb.count() > 0) logger.error("actionUnitDb was not cleared properly.");
        if (await resultsDb.count() > 0) logger.error("resultsDb was not cleared properly.");
        if (await tagService.count() > 0) logger.error("tagService was not cleared properly.");
        if (await unitChecker.count() > 0) logger.error("unitChecker was not cleared properly.");

        confirmProjectProps(importProject.project);

        for (const tag of importProject.tags) {
            await tagService.setTag(tag, true);
        }

        await projectDb.setProject(importProject.project);
        for (const actionSetObj of importProject.actionSets) {
            const actionSet = ActionSet.createFrom(actionSetObj);
            await actionSetDb.setActionSet(actionSet);
        }
        for (const actionUnit of importProject.actionUnits) {
            const actionSet = actionSetDb.getActionSet(actionUnit.parentId);
            if (actionSet) {
                const addedActionUnit = await actionUnitDb.setActionUnit(actionUnit, actionSet.enabled);
                await setTagUsageTo(tagService, addedActionUnit);
            }
        }

        this.dispatchEvent(StorageActions.ClearingProjectCompleted);
    }

    async exportProject(): Promise<IProjectTransfer> {
        const project = await projectDb.getProjectFromDB();
        if (!project) throw new Error("Project does not exist.");

        const actionSets = await actionSetDb.getActionSetsFromDb();
        const actionUnits = await actionUnitDb.getActionUnitsFromDb();
        const tags = await tagService.getAllTags();

        return {
            project,
            actionSets,
            actionUnits,
            tags
        };
    }




    getActionSet(actionSetId: string): ActionSet | undefined {
        return actionSetDb.getActionSet(actionSetId);
    }

    getFirstActionSet(): ActionSet | undefined {
        const actionSetId = projectDb.getProject().actionSetIds[0];
        return actionSetDb.getActionSet(actionSetId);
    }

    countActionSets(): number {
        return actionSetDb.getSize();
    }

    public subscribeOnEditActionSet(callback: (config: EditActionSetConfig) => void) {
        return this.subscribeOnChange(StorageActions.EditActionSet, callback)
    }
    async editActionSet(config: EditActionSetConfig): Promise<ActionSet> {
        const actionSet = config.actionSet;
        actionSet.name = actionSet.name || DEFAULT_AS_UNNAMED;
        const project = projectDb.getProject();

        const isToAdd = !project.actionSetIds.includes(actionSet.id);
        if (isToAdd) {
            addActionSetToProject(project, actionSet.id, config.insertBeforeId);
            await projectDb.setProject(project);
        } else {
            // check if relocating is required
            if (config.insertBeforeId && config.insertBeforeId !== actionSet.id) {
                logger.log("Relocating the action set in Project");

                moveActionSetInProject(project, actionSet.id, config.insertBeforeId);
                await projectDb.setProject(project);
            } else {
                logger.log("Action set stays in the same spot");
            }
        }

        const addedActionSet = await actionSetDb.setActionSet(actionSet);
        await this.checkUnitsInActionSet(actionSet.id)
        this.dispatchEvent(StorageActions.EditActionSet, config);
        return addedActionSet;
    }

    public subscribeOnDeleteActionSet(callback: (config: DeleteActionSetConfig) => void) {
        return this.subscribeOnChange(StorageActions.DeleteActionSet, callback)
    }
    async deleteActionSet(config: DeleteActionSetConfig) {
        const actionSetToDelete = config.actionSet;
        const isToBeMoved = (
            actionSetToDelete.actionUnitIds.length &&
            config.moveToId &&
            config.moveToId !== actionSetToDelete.id
        );

        if (isToBeMoved) {
            const actionUnitIds = actionSetToDelete.actionUnitIds;

            const actionSetRecipient = actionSetDb.getActionSet(config.moveToId);
            if (!actionSetRecipient) return logger.error("Action Set Recipient is NOT found!");

            // move the Units
            logger.log(`Moving ${actionUnitIds.length} units to "${actionSetRecipient.name}" `);

            for (const actionUnitId of actionUnitIds) {
                await actionUnitDb.moveActionUnit(actionUnitId, actionSetRecipient.id, actionSetRecipient.enabled);
            }

            actionSetRecipient.actionUnitIds.push(...actionUnitIds);

            await actionSetDb.setActionSet(actionSetRecipient);
            await this.checkUnitsInActionSet(actionSetRecipient.id);
        } else {
            // if not isToBeMoved then delete the Action Units from DB
            for (const actionUnitId of actionSetToDelete.actionUnitIds) {
                const actionUnit = actionUnitDb.getActionUnit(actionUnitId);
                if (actionUnit) await deleteActionUnit(actionUnit);
            }
        }

        await actionSetDb.deleteActionSet(actionSetToDelete.id);
        await projectDb.removeActionSets([actionSetToDelete.id]);

        this.dispatchEvent(StorageActions.DeleteActionSet, config);

        // if (isDev) await testDeletionProcess(config.actionSet, !isToBeMoved);
    }




    getActionUnit(actionUnitId: string): IActionUnit | undefined {
        return actionUnitDb.getActionUnit(actionUnitId);
    }

    async countActionUnits(): Promise<number> {
        return actionUnitDb.count();
    }

    public subscribeOnAddActionUnit(callback: (config: AddActionUnitConfig) => void) {
        return this.subscribeOnChange(StorageActions.AddActionUnit, callback)
    }
    async addActionUnit(config: AddActionUnitConfig): Promise<IActionUnit> {
        const actionSetId = config.actionSetId;
        const actionSet = actionSetDb.getActionSet(actionSetId);
        if (!actionSet) {
            throw new Error("There are no test sets yet. Add an Action Set first.");
        }

        config.name = config.name || DEFAULT_UNNAMED_AU;

        let newActionUnit;
        if (config.type === ActionUnitType.RunnerLog) {
            newActionUnit = new RunnerLogAU(config.name, actionSet.id);

        } else if (config.type === ActionUnitType.UnitTest) {
            newActionUnit = new UnitTestAU(config.name, actionSet.id);

        } else if (config.type === ActionUnitType.SetTagValue) {
            newActionUnit = new SetTagValuesAU(config.name, actionSet.id);

        } else if (config.type === ActionUnitType.CheckTagValue) {
            newActionUnit = new CheckTagValuesAU(config.name, actionSet.id);

        } else if (config.type === ActionUnitType.Sleep) {
            newActionUnit = new SleepAU(config.name, actionSet.id);

        } else if (config.type === ActionUnitType.ResetTagValue) {
            newActionUnit = new ResetTagValueAU(config.name, actionSet.id);

        } else if (config.type === ActionUnitType.Heartbeat) {
            newActionUnit = new HeartbeatAU(config.name, actionSet.id);

        } else throw new Error("Not supported Plugin Type");

        config.actionUnitId = newActionUnit.id;

        insertActionUnitId(actionSet, config.actionUnitId, config.insertBeforeId);

        await actionSetDb.setActionSet(actionSet);
        await actionUnitDb.setActionUnit(newActionUnit, actionSet.enabled);

        this.dispatchEvent(StorageActions.AddActionUnit, config);

        return newActionUnit;
    }

    public subscribeOnDeleteActionUnit(callback: (config: IActionUnit) => void) {
        return this.subscribeOnChange(StorageActions.DeleteActionUnit, callback)
    }
    async deleteActionUnit(actionUnit: IActionUnit) {
        const actionSet = actionSetDb.getActionSet(actionUnit.parentId);
        if (!actionSet) return logger.error(ERRORS.err009);

        await actionSetDb.removeActionUnits(actionSet, [actionUnit.id]);
        await deleteActionUnit(actionUnit);

        this.dispatchEvent(StorageActions.DeleteActionUnit, actionUnit);
    }

    public subscribeOnMoveActionUnit(callback: (config: MoveToActionUnitConfig) => void) {
        return this.subscribeOnChange(StorageActions.MoveActionUnit, callback)
    }
    async moveActionUnit(config: MoveToActionUnitConfig) {

        const {actionUnitId, toActionSetId, fromActionSetId, insertBeforeId} = config;

        const actionUnit = actionUnitDb.getActionUnit(actionUnitId);
        if (!actionUnit) throw new Error(ERRORS.err013);

        const toActionSet = actionSetDb.getActionSet(toActionSetId);
        if (!toActionSet) throw new Error(ERRORS.err004);

        const fromActionSet = (toActionSetId === fromActionSetId) ?
            toActionSet : actionSetDb.getActionSet(fromActionSetId);
        if (!fromActionSet) throw new Error(ERRORS.err020);

        // removing from original Action Set
        const index = fromActionSet.actionUnitIds.indexOf(actionUnitId);
        if (index !== -1) fromActionSet.actionUnitIds.splice(index, 1);
        else throw new Error(ERRORS.err019);

        // inserting to Action Set
        insertActionUnitId(toActionSet, actionUnitId, insertBeforeId);

        // if new parent then...
        if (toActionSetId !== fromActionSetId) {
            // setting old parent with this action unit removed
            await actionSetDb.setActionSet(fromActionSet);
            // assigning the new parent = toActionSet
            await actionUnitDb.moveActionUnit(actionUnitId, toActionSetId, toActionSet.enabled);
        }
        await actionSetDb.setActionSet(toActionSet);

        this.dispatchEvent(StorageActions.MoveActionUnit, config);
    }

    public subscribeOnUpdateActionUnit(callback: (config: IActionUnit) => void) {
        return this.subscribeOnChange(StorageActions.UpdateActionUnit, callback)
    }
    async updateActionUnit(actionUnitToUpdate: IActionUnit, doNotNotify = false) {

        const actionSet = actionSetDb.getActionSet(actionUnitToUpdate.parentId);
        if (!actionSet) throw new Error(ERRORS.str04);

        const oldActionUnit = actionUnitDb.getActionUnit(actionUnitToUpdate.id);
        // oldActionUnit does not exist when updateActionUnit() called for Action Unit duplication
        await deleteTagUsageFrom(tagService, oldActionUnit);

        await actionUnitDb.setActionUnit(actionUnitToUpdate, actionSet.enabled);
        await setTagUsageTo(tagService, actionUnitToUpdate);

        if (!doNotNotify) this.dispatchEvent(StorageActions.UpdateActionUnit, actionUnitToUpdate);
    }

    /**
     * @description Gets ActionUnit by ID and creates a deep copy
     * @param actionUnitId - ID of the original action unit
     */
    async duplicateActionUnit(actionUnitId: string) {
        const actionUnit = actionUnitDb.getActionUnit(actionUnitId);
        if (!actionUnit) throw new Error(ERRORS.err013);

        const theDuplicate = getActionUnitCopyFrom(actionUnit, true);

        const toActionSet = actionSetDb.getActionSet(theDuplicate.parentId);
        if (!toActionSet) throw new Error(ERRORS.err004);

        const currentPos = toActionSet.actionUnitIds.indexOf(actionUnit.id);
        const insertBeforeId = toActionSet.actionUnitIds[currentPos + 1] || "";
        // inserting to new Action Set
        insertActionUnitId(toActionSet, theDuplicate.id, insertBeforeId);

        await this.updateActionUnit(theDuplicate, true);
        await actionSetDb.setActionSet(toActionSet);

        const config: AddActionUnitConfig = {
            showDialog: false,
            name: theDuplicate.name,
            insertBeforeId: insertBeforeId,
            actionSetId: toActionSet.id,
            actionUnitId: theDuplicate.id,
            type: theDuplicate.type
        };

        this.dispatchEvent(StorageActions.AddActionUnit, config);
    }




    public async setInvalidUnitWithUsedDeletedTag(actionUnitId: string) {
        const actionUnit = actionUnitDb.getActionUnit(actionUnitId);
        if (!actionUnit) return logger.error(ERRORS.str02);

        const actionSet = actionSetDb.getActionSet(actionUnit.parentId);
        if (!actionSet) return logger.error(ERRORS.str03);

        const invalidMessage = getInvalidMessageOf(actionUnit, tagService);
        await unitChecker.setInvalidUnit({
            actionUnitId,
            name: actionUnit.name,
            message: invalidMessage,
            isEnabled: actionUnit.enabled && actionSet.enabled
        }, true)
    }

    async checkUnitsInActionSet(actionSetId: string) {
        const actionSet = actionSetDb.getActionSet(actionSetId);
        if (!actionSet) throw new Error(ERRORS.str05);

        for (const actionUnitId of actionSet.actionUnitIds) {
            const actionUnit = actionUnitDb.getActionUnit(actionUnitId);
            if (!actionUnit) {
                logger.error(ERRORS.trv001);
                continue;
            }

            await unitChecker.checkActionUnit(actionUnit, actionSet.enabled);
        }
    }

}

function addActionSetToProject(project: Project, actionSetId: string, insertBeforeId: string) {
    // check if Action Set already is in the project.
    if (project.actionSetIds.includes(actionSetId)) return logger.error(ERRORS.err003);

    const position = project.actionSetIds.indexOf(insertBeforeId);
    if (position >= 0) {
        project.actionSetIds.splice(position, 0, actionSetId);
    } else {
        project.actionSetIds.push(actionSetId);
    }
}

function moveActionSetInProject(project: Project, actionSetId: string, insertBeforeId: string) {
    const positionToRemove = project.actionSetIds.indexOf(actionSetId);
    if (!(positionToRemove >= 0)) return logger.error(ERRORS.err010);

    project.actionSetIds.splice(positionToRemove, 1);

    addActionSetToProject(project, actionSetId, insertBeforeId);
}

function insertActionUnitId(actionSet: IActionSet, actionUnitId: string, insertBeforeId: string) {
    const newPosition = actionSet.actionUnitIds.indexOf(insertBeforeId);
    if (newPosition >= 0) {
        actionSet.actionUnitIds.splice(newPosition, 0, actionUnitId);
    } else {
        actionSet.actionUnitIds.push(actionUnitId);
    }
}

export interface EditActionSetConfig {
    showDialog: boolean,
    isAdding: boolean,          // for UI and Edit/Add dialog
    actionSet: ActionSet,
    insertBeforeId: string,
}

export interface DeleteActionSetConfig {
    showDialog: boolean,
    actionSet: ActionSet,
    unitsToDelete: string,      // for UI and Delete dialog
    unitsToDeleteQty: number,   // for UI and Delete dialog
    moveToId: string,
}

export interface AddActionUnitConfig {
    showDialog: boolean,
    name: string,
    insertBeforeId: string,
    actionSetId: string,
    actionUnitId: string,
    type: ActionUnitType
}

export interface MoveToActionUnitConfig {
    actionUnitId: string,
    insertBeforeId: string,
    toActionSetId: string,
    fromActionSetId: string,
}


export function extractTagIdsFrom(actionUnit: IActionUnit): string[] {
    const tagIds: string[] = [];

    if (actionUnit.type === ActionUnitType.SetTagValue) {
        tagIds.push(...actionUnit.params.tagsToSet.map(value => value.tagId));

    } else if (actionUnit.type === ActionUnitType.CheckTagValue) {
        tagIds.push(...actionUnit.params.tagsToCheck.map(value => value.tagId));

    } else if (actionUnit.type === ActionUnitType.ResetTagValue) {
        tagIds.push(...actionUnit.params.tagsToToggle.map(value => value.tagId));

    } else if (actionUnit.type === ActionUnitType.Heartbeat) {
        tagIds.push(...actionUnit.params.tagsToToggle.map(value => value.tagId));

    } else if (actionUnit.type === ActionUnitType.UnitTest) {
        tagIds.push(...actionUnit.params.tagsToModify.map(value => value.tagId));
        tagIds.push(...actionUnit.params.expectedChanges.map(value => value.tagId));
        tagIds.push(...actionUnit.params.tagsToToggle.map(value => value.tagId));

        tagIds.push(...actionUnit.params.noChangeTagIds);
    }

    // if (actionUnit.type === ActionUnitType.RunnerLog) return tagIds;
    // if (actionUnit.type === ActionUnitType.Sleep) return tagIds;
    return tagIds;
}

async function setTagUsageTo(tagService: TagsService, actionUnit: IActionUnit) {
    const tagIds = extractTagIdsFrom(actionUnit);
    if (tagIds.length) await tagService.setUsage(tagIds, actionUnit.id);
}

async function deleteTagUsageFrom(tagService: TagsService, actionUnit?: IActionUnit) {
    if (!actionUnit) return;
    const tagIds = extractTagIdsFrom(actionUnit);
    if (tagIds.length) await tagService.deleteUsage(tagIds, actionUnit.id);
}

async function deleteActionUnit(actionUnit: IActionUnit) {
    const tagIds = extractTagIdsFrom(actionUnit);
    if (tagIds.length) await tagService.deleteUsage(tagIds, actionUnit.id);
    await actionUnitDb.deleteActionUnit(actionUnit.id);
}
