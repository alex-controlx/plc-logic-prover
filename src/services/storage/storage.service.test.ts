import {plcTagObj, pretests} from "../../__pretests__/_pretest.config";
import StorageService, {
    AddActionUnitConfig,
    DeleteActionSetConfig,
    EditActionSetConfig,
    extractTagIdsFrom,
    MoveToActionUnitConfig
} from "./storage.service";
import {ActionSetDbService} from "./action_set_db.service";
import {ActionUnitDbService} from "./action_unit_db.service";
import {
    ActionUnitType,
    DEFAULT_AU_DUP_SUFFIX,
    DEFAULT_AU_NAME,
    IActionUnit,
    SetTagValuesAU,
    UnitTestAU
} from "../../_common/action-unit";
import {
    ActionSet,
    DpDisplayedType,
    IProjectTransfer,
    ITagUI,
    Project
} from "../../_common/interfaces";
import TagsService from "./tags.service";
import ResultsService from "./results_db.service";
import {IResultFromIpc, ResultType} from "../../_common/interfaces/result.class";
import {AppStateService} from "../app-state.service";
import {LpUtils} from "../../_common/utils";
import UnitsChecker from "./units-checker";


const project_0_2_0 = require("../../__pretests__/project_export-0_2_0.json");

pretests.init();
let storage: StorageService;
let actionSetDb: ActionSetDbService;
let actionUnitDb: ActionUnitDbService;
let tagService: TagsService;
let unitChecker: UnitsChecker;
let exportedProject: IProjectTransfer;
let resultsDb: ResultsService;

const NEW_PROJECT_NAME = "!!!__new_project_name__!!!";
const NEW_ACTION_SET_NAME = "!!!__new_as_name__!!!";
const tagsGlobal = Object.values(plcTagObj);

/**
 * in this test file:
 * 1. Storage init tests
 * 2. Setup storage
 * 3. Test availability of data in the database
 * 4. Modify Action Unit and make sure Tag ID has usage of this Action unit
 */

describe("Storage Initialisation", () => {
    it("should fail on usage of StorageService before init", async () => {
        try {
            new StorageService()
        } catch (e) {
            const message = (e instanceof Error) ? e.message :
                (typeof e === "string") ? e : JSON.stringify(e);
            expect(message).toBe("StorageService wasn't initialised yet. Call StorageService.init() first.");
        }
    })

    it("should initialise StorageService and set storage variable", async () => {
        await StorageService.init();
        storage = new StorageService();
        tagService = new TagsService();
        actionSetDb = new ActionSetDbService();
        actionUnitDb = new ActionUnitDbService();
        unitChecker = new UnitsChecker();
        resultsDb = new ResultsService();
        await addTagsTo(tagService, tagsGlobal);
    })
})

describe("Testing Project methods", () => {

    afterAll(async() => {
        await storage.clearProject();
    });

    it(`should test "getProject() & updateProject() & subscribeOnUpdateProject()"`, async () => {
        const project = storage.getProject();
        project.name = NEW_PROJECT_NAME;
        let returnedProject: Project | null = null;

        await new Promise<void>(async (accept) => {
            storage.subscribeOnUpdateProject((project: Project) => {
                returnedProject = project;
                accept()
            })
            await storage.updateProject(project);
        });

        const projectFromStorage = storage.getProject();
        expect(JSON.stringify(projectFromStorage)).toBe(JSON.stringify(returnedProject));
        expect(JSON.stringify(projectFromStorage)).toBe(JSON.stringify(project));
    });

    describe(`Testing "clearProject() & exportProject() & importProject()"`, () => {

        it(`should create 25 Action Units in 5 Action Sets => [5, 5, 5, 5, 5]`, async () => {
            await createBunchOfActions(storage, 5, 5);
            // resultQty has +1 is because there is an order entity of the results in DB
            await expectStructure([5, 5, 5, 5, 5], 8, 5 * 5 + 1);
        })

        it(`should test "exportProject()"`, async () => {
            exportedProject = await storage.exportProject();
            const project = exportedProject.project;

            expect(typeof project.name).toBe("string");
            expect(project.version).toBe(process.env.npm_package_version);
            expect(project.name.length).toBeGreaterThan(0);
            expect(exportedProject.actionSets.size).toBeGreaterThan(0);
            expect(exportedProject.actionUnits.size).toBeGreaterThan(0);
            expect(exportedProject.tags.length).toBeGreaterThan(0);
        });


        it(`should test "clearProject() & clearProjectSubscriber() & clearProjectCompletedSubscriber()" => []`,
            async () =>
        {
            const stub = jest.fn();

            await new Promise<void>(async (accept) => {
                storage.clearProjectSubscriber(stub);
                storage.clearProjectCompletedSubscriber(accept)
                await storage.clearProject(NEW_PROJECT_NAME);
            });

            const project = storage.getProject();

            expect(stub).toBeCalledTimes(1);

            expect(typeof project.name).toBe("string");
            expect(project.name.length).toBeGreaterThan(0);
            expect(await actionSetDb.count()).toBe(0);
            expect(await actionUnitDb.count()).toBe(0);
            expect(await resultsDb.count()).toBe(0);

            await expectStructure([]);
        });

        it(`should test v 0.2.0 "importProject()"  => [5, 5, 5, 5, 5]`, async () => {
            const appState = new AppStateService();
            const stub = jest.fn();

            expect(project_0_2_0.project).toBeTruthy();
            expect(Array.isArray(project_0_2_0.actionSets)).toBe(true);
            expect(Array.isArray(project_0_2_0.actionUnits)).toBe(true);
            expect(Array.isArray(project_0_2_0.tags)).toBe(true);

            await new Promise<void>(async (accept) => {
                storage.clearProjectSubscriber(stub);
                storage.clearProjectCompletedSubscriber(accept);
                await storage.importProject(project_0_2_0);
            });

            expect(stub).toBeCalledTimes(1);

            const project = storage.getProject();
            expect(project.name).toBe(NEW_PROJECT_NAME);
            expect(await actionSetDb.count()).toBeGreaterThan(0);
            expect(await actionUnitDb.count()).toBeGreaterThan(0);
            expect(await resultsDb.count()).toBe(0);
            expect(await tagService.count()).toBeGreaterThan(0);

            const detailsPanel = appState.getDetailsPanel();
            const defaultState = {
                actionUnitId: "", displayed: DpDisplayedType.StartPage, isDirty: false, isResultShown: true
            };
            expect(JSON.stringify(detailsPanel)).toBe(JSON.stringify(defaultState));
            expect(appState.sidebar().getExpanded().length).toBe(0);

            await expectStructure([5, 5, 5, 5, 5]);
        });
    });
});


describe("Testing Action Set methods", () => {
    let project: Project;

    beforeEach(() => {
        project = storage.getProject();
    })

    afterAll(async () => {
        await storage.clearProject();
    })

    afterEach(jest.clearAllMocks);

    it(`should create 25 Action Units in 5 Action Sets => [5, 5, 5, 5, 5]`, async () => {
        await createBunchOfActions(storage, 5, 5);
        await expectStructure([5, 5, 5, 5, 5]);
    })

    it(`should test "getActionSet()"`, async () => {
        await expectStructure([5, 5, 5, 5, 5]);

        const actionSetId = project.actionSetIds[project.actionSetIds.length - 1];
        const actionSet = storage.getActionSet(actionSetId);

        if (!actionSet) {
            expect(actionSet).toBeTruthy();
            return
        }

        expect(actionSet.id).toBe(actionSetId);
    });

    it(`should test "getFirstActionSet()"`, async () => {
        await expectStructure([5, 5, 5, 5, 5]);

        const actionSetId = project.actionSetIds[0];
        const actionSet = storage.getFirstActionSet();

        if (!actionSet) {
            expect(actionSet).toBeTruthy();
            return
        }

        expect(actionSet.id).toBe(actionSetId);
    });

    it(`should test "countActionSets()" => [5, 5, 5, 5, 5]`, async () => {
        const actionSetCount = storage.countActionSets();
        expect(actionSetCount).toBe(5);
    });

    it(`should test Edit of "editActionSet() & subscribeOnEditActionSet()" => [5, 5, 5, 5, 5]`, async () => {
        const actionSet = storage.getActionSet(project.actionSetIds[0]);
        if (!actionSet) {
            expect(actionSet).toBeTruthy();
            return
        }

        actionSet.name = "Modified Name";
        const config: EditActionSetConfig = {
            actionSet: actionSet, insertBeforeId: "", isAdding: false, showDialog: false
        }
        await testEditActionSet(config);
        await expectStructure([5, 5, 5, 5, 5]);
    });

    it(`should test Add of "editActionSet() & subscribeOnEditActionSet()" => [5, 5, 5, 5, 5, 0]`, async () => {
        const actionSet = new ActionSet(NEW_ACTION_SET_NAME, project.id);
        const config: EditActionSetConfig = {
            actionSet: actionSet, insertBeforeId: "", isAdding: false, showDialog: false
        }
        await testEditActionSet(config);

        const modifiedProject = storage.getProject();
        expect(modifiedProject.actionSetIds.includes(actionSet.id)).toBe(true);
        await expectStructure([5, 5, 5, 5, 5, 0]);
    });

    it(`should test MoveTo of "editActionSet() & subscribeOnEditActionSet()"`, async () => {
        const moveBeforeId = project.actionSetIds[0];
        const actionSet = storage.getActionSet(project.actionSetIds[project.actionSetIds.length - 1]);
        if (!actionSet) {
            expect(actionSet).toBeTruthy();
            return
        }
        const config: EditActionSetConfig = {
            actionSet: actionSet, insertBeforeId: moveBeforeId, isAdding: false, showDialog: false
        }
        await testEditActionSet(config);

        const modifiedProject = storage.getProject();
        expect(modifiedProject.actionSetIds.indexOf(actionSet.id)).toBe(0);
        await expectStructure([0, 5, 5, 5, 5, 5]);
    });


    it(`should test deletion of empty set with "deleteActionSet() & subscribeOnDeleteActionSet()" => [5, 5, 5, 5, 5]`, async () => {
        // delete the above created and moved Action Set
        const actionSetId = project.actionSetIds[0];
        const actionSet =  storage.getActionSet(actionSetId);
        if (!actionSet) {
            expect(actionSet).toBeTruthy();
            return
        }
        const deleteConf: DeleteActionSetConfig = {
            actionSet: actionSet, moveToId: "", showDialog: false, unitsToDelete: "", unitsToDeleteQty: 0
        };
        await testDeleteActionSet(deleteConf);
        await expectStructure([5, 5, 5, 5, 5]);
    });

    it(`should test MoveToId of "deleteActionSet() & subscribeOnDeleteActionSet()"  => [10, 5, 5, 5]`, async () => {
        const checkUnitsInActionSetSpy = jest.spyOn(storage, "checkUnitsInActionSet");
        // pick last ActionSet
        const deletedActionSetId = project.actionSetIds[project.actionSetIds.length - 1];
        const recipientActionSetId = project.actionSetIds[0];
        const deletedActionSet = storage.getActionSet(deletedActionSetId);
        const recipientAsBeforeDeletion = storage.getActionSet(recipientActionSetId);
        if (!deletedActionSet || !recipientAsBeforeDeletion) {
            expect(deletedActionSet).toBeTruthy();
            expect(recipientAsBeforeDeletion).toBeTruthy();
            return
        }

        const deleteConf: DeleteActionSetConfig = {
            actionSet: deletedActionSet, moveToId: recipientActionSetId, showDialog: false, unitsToDelete: "", unitsToDeleteQty: 0
        };
        await testDeleteActionSet(deleteConf);

        expect(checkUnitsInActionSetSpy).toBeCalledTimes(1);

        const recipientAsAfterDeletion = storage.getActionSet(recipientActionSetId);
        recipientAsBeforeDeletion.actionUnitIds.push(...deletedActionSet.actionUnitIds);
        expect(JSON.stringify(recipientAsAfterDeletion?.actionUnitIds))
            .toBe(JSON.stringify(recipientAsBeforeDeletion.actionUnitIds));
        await expectStructure([10, 5, 5, 5]);
    });

    it(`should test deletion of not empty set with "deleteActionSet() & subscribeOnDeleteActionSet()"  => [5, 5, 5]`, async () => {
        const deletedActionSetId = project.actionSetIds[0];
        const deletedActionSet = storage.getActionSet(deletedActionSetId);
        if (!deletedActionSet) {
            expect(deletedActionSet).toBeTruthy();
            return
        }

        const deleteConf: DeleteActionSetConfig = {
            actionSet: deletedActionSet, moveToId: "", showDialog: false, unitsToDelete: "", unitsToDeleteQty: 0
        };
        await testDeleteActionSet(deleteConf);

        await expectStructure([5, 5, 5]);
    });

    /**
     * @description Functionality: delete AS, check same delete config, check it is NOT in projectConf,
     *              check it is NOT in ActionSetDB
     * @param {DeleteActionSetConfig} deleteConf
     */
    async function testDeleteActionSet(deleteConf: DeleteActionSetConfig) {
        let returnedConfig: DeleteActionSetConfig | undefined;

        await new Promise<void>(async (accept) => {
            storage.subscribeOnDeleteActionSet((_config: DeleteActionSetConfig) => {
                returnedConfig = _config;
                accept();
            })
            await storage.deleteActionSet(deleteConf);
        });

        expect(deleteConf).toBe(returnedConfig);

        const project = storage.getProject();
        const asIndex = project.actionSetIds.indexOf(deleteConf.actionSet.id);
        expect(asIndex).toBe(-1);

        const deletedActionSet = storage.getActionSet(deleteConf.actionSet.id);
        expect(deletedActionSet).toBe(undefined);
    }

    async function testEditActionSet(config: EditActionSetConfig) {
        const checkUnitsInActionSetSpy = jest.spyOn(storage, "checkUnitsInActionSet");
        let returnedConfig: EditActionSetConfig | undefined;
        await new Promise<void>(async (accept) => {
            storage.subscribeOnEditActionSet((_returned: EditActionSetConfig) => {
                returnedConfig = _returned;
                accept();
            });
            await storage.editActionSet(config);
        });

        const asFromDb = storage.getActionSet(config.actionSet.id);
        expect(JSON.stringify(config.actionSet)).toBe(JSON.stringify(asFromDb));
        expect(config).toBe(returnedConfig);
        expect(checkUnitsInActionSetSpy).toBeCalledTimes(1);
    }
});



describe("Testing Action Units methods", () => {
    afterAll(async () => {
        await storage.clearProject();
    })

    afterEach(jest.clearAllMocks);


    it(`should create 25 Action Units in 5 Action Sets => [5, 5, 5, 5, 5]`, async () => {
        await createBunchOfActions(storage, 5, 5);
        await addTagsTo(tagService, tagsGlobal);
        await expectStructure([5, 5, 5, 5, 5], 8);
    });


    it(`should test "getActionUnit()" => [5, 5, 5, 5, 5]`, async () => {
        const notAnActionUnit = await storage.getActionUnit("");
        expect(notAnActionUnit).toBe(undefined);

        const actionSet = getActionSet(0);

        const actionUnitID = actionSet.actionUnitIds[0];
        const actionUnit = await storage.getActionUnit(actionUnitID);

        expect(actionUnit).toBeTruthy();
        expect(actionUnit?.parentId).toBe(actionSet.id);
    });


    it(`should test "countActionUnits()" => [5, 5, 5, 5, 5]`, async () => {
        const count = await storage.countActionUnits();
        expect(count).toBe(25);
    });


    it(`should test "addActionUnit():NONE & subscribeOnAddActionUnit()" => [5, 5, 5, 5, 5]`, async () => {
        const config: AddActionUnitConfig = {
            actionSetId: "dont_exist",
            actionUnitId: "",
            insertBeforeId: "",
            name: "",
            showDialog: false,
            type: ActionUnitType.RunnerLog
        };
        try {
            await new Promise(async (accept, reject) => {
                try {
                    storage.subscribeOnAddActionUnit(accept);
                    await storage.addActionUnit(config);
                } catch (e) {
                    reject(e)
                }
            });
        } catch (e) {
            const message = (e instanceof Error) ? e.message :
                (typeof e === "string") ? e : JSON.stringify(e);
            expect(message).toBe("There are no test sets yet. Add an Action Set first.")
        }
        await expectStructure([5, 5, 5, 5, 5]);
    });


    it(`should test "addActionUnit() & subscribeOnAddActionUnit()" => [7, 7, 6, 6, 6]`, async () => {
        const actionSet0 = getActionSet(0);
        const runnerLogConf = getDefAddActionUnitConfig(ActionUnitType.RunnerLog, actionSet0.id);
        await addActionUnit(runnerLogConf);
        const unitTestConf = getDefAddActionUnitConfig(ActionUnitType.UnitTest, actionSet0.id);
        await addActionUnit(unitTestConf);

        const actionSet1 = getActionSet(1);
        const stvConf = getDefAddActionUnitConfig(ActionUnitType.SetTagValue, actionSet1.id);
        await addActionUnit(stvConf);
        const ctvConf = getDefAddActionUnitConfig(ActionUnitType.CheckTagValue, actionSet1.id);
        await addActionUnit(ctvConf);

        const actionSet2 = getActionSet(2);
        const hbConf = getDefAddActionUnitConfig(ActionUnitType.Heartbeat, actionSet2.id);
        await addActionUnit(hbConf);

        const actionSet3 = getActionSet(3);
        const rtvConf = getDefAddActionUnitConfig(ActionUnitType.ResetTagValue, actionSet3.id);
        await addActionUnit(rtvConf);

        const actionSet4 = getActionSet(4);
        const sleepConf = getDefAddActionUnitConfig(ActionUnitType.Sleep, actionSet4.id);
        await addActionUnit(sleepConf);

        await expectStructure([7, 7, 6, 6, 6]);
    });

    it(`should test "deleteActionUnit() & subscribeOnDeleteActionUnit()" => [7, 6, 6, 6, 6]`, async () => {

        const actionSet1 = getActionSet(1);
        const actionUnit = storage.getActionUnit(actionSet1.actionUnitIds[actionSet1.actionUnitIds.length - 1]);
        if (!actionUnit) return expect(actionUnit).toBeTruthy();

        await deleteActionUnitTest(actionUnit);

        await expectStructure([7, 6, 6, 6, 6]);
    });

    it(`should test "moveActionUnit():same_parent & subscribeOnMoveActionUnit()" => [7, 6, 6, 6, 6]`, async () => {
        const fromActionSet4 = getActionSet(4);
        const actionUnit = storage.getActionUnit(fromActionSet4.actionUnitIds[fromActionSet4.actionUnitIds.length - 1]);
        if (!actionUnit) return expect(actionUnit).toBeTruthy();

        const config: MoveToActionUnitConfig = {
            actionUnitId: actionUnit.id,
            fromActionSetId: fromActionSet4.id,
            insertBeforeId: fromActionSet4.actionUnitIds[1],
            toActionSetId: fromActionSet4.id
        };

        await moveActionUnittest(config);
        await expectStructure([7, 6, 6, 6, 6]);
    });

    it(`should test "moveActionUnit():different_parent & subscribeOnMoveActionUnit()" => [7, 6, 6, 7, 5]`, async () => {
        const fromActionSet4 = getActionSet(4);
        const toActionSet3 = getActionSet(3);
        const actionUnit = storage.getActionUnit(fromActionSet4.actionUnitIds[fromActionSet4.actionUnitIds.length - 1]);
        if (!actionUnit) return expect(actionUnit).toBeTruthy();

        const config: MoveToActionUnitConfig = {
            actionUnitId: actionUnit.id,
            fromActionSetId: fromActionSet4.id,
            insertBeforeId: toActionSet3.actionUnitIds[1],
            toActionSetId: toActionSet3.id
        };

        await moveActionUnittest(config);
        await expectStructure([7, 6, 6, 7, 5]);
    });

    async function moveActionUnittest(config: MoveToActionUnitConfig) {

        await new Promise(async (accept) => {
            storage.subscribeOnMoveActionUnit(accept);
            await storage.moveActionUnit(config);
        })

        const removedFromActionSet4 = getActionSet(config.fromActionSetId);
        const recipientActionSet3 = getActionSet(config.toActionSetId);
        const actionUnitIdInNewPosition = recipientActionSet3.actionUnitIds[1];
        expect(actionUnitIdInNewPosition).toBe(config.actionUnitId);

        const isInFromSet = removedFromActionSet4.actionUnitIds.includes(config.actionUnitId);
        const isMovedWithinTheSameSet = config.fromActionSetId === config.toActionSetId;
        expect(isInFromSet).toBe(isMovedWithinTheSameSet);

    }


    it(`should test "updateActionUnit()"`, async () => {
        await expectStructure([7, 6, 6, 7, 5], 8);
        const setTagValueAU = (await getActionUnitByType(ActionUnitType.SetTagValue) as SetTagValuesAU);
        setTagValueAU.name = LpUtils.generateId();
        setTagValueAU.params.tagsToSet[0].tagId = plcTagObj.bool1.id;

        const auFromDb = (await updateActionUnitTest(setTagValueAU, true, true) as SetTagValuesAU);

        expect(auFromDb.params.tagsToSet[0].tagId).toBe(plcTagObj.bool1.id);

    });

    it(`should test "updateActionUnit() & subscribeOnUpdateActionUnit()"`, async () => {
        await expectStructure([7, 6, 6, 7, 5], 8);
        const unitTestAU = (await getActionUnitByType(ActionUnitType.UnitTest) as UnitTestAU);
        unitTestAU.params.tagsToModify[0].tagId = plcTagObj.bool0.id;
        unitTestAU.params.expectedChanges[0].tagId = plcTagObj.dint0.id;

        const auFromDb = (await updateActionUnitTest(unitTestAU, true) as UnitTestAU);

        expect(auFromDb.params.tagsToModify[0].tagId).toBe(plcTagObj.bool0.id);
        expect(auFromDb.params.expectedChanges[0].tagId).toBe(plcTagObj.dint0.id);
    });

    it(`should test deleteTag usage of dint0 on "updateActionUnit() & subscribeOnUpdateActionUnit()"`, async () => {
        await expectStructure([7, 6, 6, 7, 5], 8);
        const unitTestAU = (await getActionUnitByType(ActionUnitType.UnitTest) as UnitTestAU);

        const newTagId = plcTagObj.dint1.id;
        const oldTagId = unitTestAU.params.expectedChanges[0].tagId;
        expect(newTagId).not.toBe(oldTagId);

        let oldTag = tagService.getTag(oldTagId);
        if (!oldTag) return expect(oldTag).toBeTruthy();
        expect(oldTag.usage?.includes(unitTestAU.id)).toBe(true);

        // modify tag in expectedChanges array from dint0 to dint1
        unitTestAU.params.expectedChanges[0].tagId = newTagId;

        const auFromDb = (await updateActionUnitTest(unitTestAU, true) as UnitTestAU);

        expect(auFromDb.params.tagsToModify[0].tagId).toBe(plcTagObj.bool0.id);
        expect(auFromDb.params.expectedChanges[0].tagId).toBe(newTagId);

        oldTag = tagService.getTag(oldTagId);
        if (!oldTag) return expect(oldTag).toBeTruthy();

        expect(oldTag.usage).toBeTruthy();
        expect(oldTag.usage?.includes(unitTestAU.id)).toBe(false);
    });





    it(`should test deleteTag usage when "deleteActionUnit() & subscribeOnDeleteActionUnit()" => [6, 6, 6, 7, 5]`, async () => {

        const unitTestAU = (await getActionUnitByType(ActionUnitType.UnitTest) as UnitTestAU);
        const tagIds = extractTagIdsFrom(unitTestAU);
        expect(tagIds.length).toBe(2);


        // check both tags have this Action Unit in .usage array
        for (const tagId of tagIds) {
            if (!tagId) expect(tagId).toBeTruthy();

            const tag = tagService.getTag(tagId);
            if (!tag) expect(tag).toBeTruthy();

            expect(tag?.usage).toBeTruthy();
            expect(tag?.usage?.length).toBeGreaterThan(0);
            expect(tag?.usage?.includes(unitTestAU.id)).toBe(true);
        }

        await deleteActionUnitTest(unitTestAU);


        // check both tags have NO this Action Unit in .usage array
        for (const tagId of tagIds) {
            if (!tagId) expect(tagId).toBeTruthy();

            const tag = tagService.getTag(tagId);
            if (!tag) expect(tag).toBeTruthy();

            expect(tag?.usage).toBeTruthy();
            expect(tag?.usage?.includes(unitTestAU.id)).toBe(false);
        }

        await expectStructure([6, 6, 6, 7, 5]);
    });



    it(`should test "duplicateActionUnit() & subscribeOnAddActionUnit()" => [7, 7, 6, 7, 5]`, async () => {
        await expectStructure([6, 6, 6, 7, 5]);
        const actionSet = getActionSet(1);
        const actionUnit = storage.getActionUnit(actionSet.actionUnitIds[1]);
        if (!actionUnit) return expect(actionUnit).toBeTruthy();

        const config: AddActionUnitConfig = await new Promise(async (accept) => {
            storage.subscribeOnAddActionUnit(accept)

            await storage.duplicateActionUnit(actionUnit.id);
        });

        if (!config) return expect(config).toBeTruthy();

        const auFromDb = storage.getActionUnit(config.actionUnitId);
        if (!auFromDb) return expect(auFromDb).toBeTruthy();

        const asWithNewAu = getActionSet(1);

        expect(auFromDb.name).toBe(actionUnit.name + DEFAULT_AU_DUP_SUFFIX);
        expect(auFromDb.id).toBe(config.actionUnitId);
        expect(auFromDb.id).toBe(asWithNewAu.actionUnitIds[2]);
    });


    async function deleteActionUnitTest(actionUnit: IActionUnit) {
        const actionUnitId = actionUnit.id;

        await new Promise(async (accept) => {
            storage.subscribeOnDeleteActionUnit(accept);
            await storage.deleteActionUnit(actionUnit);
        })

        const actionSetAfterDelete = getActionSet(1);
        expect(actionSetAfterDelete.actionUnitIds.includes(actionUnitId)).toBe(false);

        const notExistingActionUnit = storage.getActionUnit(actionUnitId);
        expect(notExistingActionUnit).toBe(undefined);

    }

    async function addActionUnit(config: AddActionUnitConfig) {
        await new Promise(async (accept, reject) => {
            try {
                storage.subscribeOnAddActionUnit(accept);
                await storage.addActionUnit(config);
            } catch (e) {
                const message = (e instanceof Error) ? e.message :
                    (typeof e === "string") ? e : JSON.stringify(e);
                reject(message);
            }
        })

        const newActionUnit = await storage.getActionUnit(config.actionUnitId);
        if (!newActionUnit) return expect(newActionUnit).toBeTruthy();

        expect(newActionUnit.id).toBe(config.actionUnitId);
        expect(newActionUnit.parentId).toBe(config.actionSetId);
        expect(newActionUnit.type).toBe(config.type);

        const actionSet = storage.getActionSet(config.actionSetId);
        if (!actionSet) return expect(actionSet).toBeTruthy();

        expect(actionSet.actionUnitIds.includes(newActionUnit.id)).toBe(true);

    }
});


describe("Testing Invalid Units methods", () => {
    afterAll(async () => {
        await storage.clearProject();
    })

    afterEach(jest.clearAllMocks);

    it(`should create 25 Action Units in 5 Action Sets => [5, 5, 5, 5, 5]`, async () => {
        await createBunchOfActions(storage, 1, 2); // RunnerLog and UnitTests
        await addTagsTo(tagService, tagsGlobal);
        await expectStructure([2], 8);
    })

    it(`should test "setInvalidUnitWithUsedDeletedTag()`, async () => {
        const actionSet = getActionSet(0);
        const unitTestAU = (await addActionUnitToStorage(actionSet.id, ActionUnitType.UnitTest) as UnitTestAU);
        jest.clearAllMocks();

        unitTestAU.params.tagsToModify[0].tagId = plcTagObj.bool0.id;
        unitTestAU.params.expectedChanges[0].tagId = plcTagObj.dint0.id;

        unitTestAU.modifiedOn--;
        const auFromDb = (await updateActionUnitTest(unitTestAU, false, true) as UnitTestAU);

        expect(auFromDb.params.tagsToModify[0].tagId).toBe(plcTagObj.bool0.id);
        expect(auFromDb.params.expectedChanges[0].tagId).toBe(plcTagObj.dint0.id);

        const invalidUnit = unitChecker.getInvalidAUById(auFromDb.id);
        expect(invalidUnit).toBe(undefined);

        const deletedTagId = plcTagObj.bool0.id;
        await tagService.deleteTag(deletedTagId, true);
        await storage.setInvalidUnitWithUsedDeletedTag(auFromDb.id);

        const invalidUnitToCheck = unitChecker.getInvalidAUById(auFromDb.id);
        if (!invalidUnitToCheck) return expect(invalidUnitToCheck).toBeTruthy();

        expect(invalidUnitToCheck.name).toBe(auFromDb.name);
        expect(invalidUnitToCheck.message).toBe("Input tag was deleted");

    });

    it(`should test "checkUnitsInActionSet()"`, async () => {

        const count1 = await unitChecker.count();
        expect(count1).toBe(2);

        const actionSet = getActionSet(0);
        actionSet.enabled = false;
        const config: EditActionSetConfig = {
            actionSet: actionSet, insertBeforeId: "", isAdding: false, showDialog: false
        }
        // .checkUnitsInActionSet() called in .editActionSet() and sets all invalid messaged to FALSE
        await storage.editActionSet(config);

        const count2 = await unitChecker.count();
        expect(count2).toBe(2);

        const invalidAus = await unitChecker.getUnitsFromDb();
        const isDisabled = invalidAus.every(invalid => !invalid.isEnabled);
        expect(isDisabled).toBe(true);
    });

});

async function addActionUnitToStorage(actionSetId: string, type: ActionUnitType): Promise<IActionUnit> {
    const config: AddActionUnitConfig = {
        showDialog: false,
        name: LpUtils.generateId(),
        insertBeforeId: "",
        actionSetId: actionSetId,
        actionUnitId: "",
        type
    };
    const newActionUnit = await storage.addActionUnit(config);
    if (!newActionUnit) throw expect(newActionUnit).not.toBeFalsy();

    expect(newActionUnit.type).toBe(type);

    return newActionUnit;
}


async function updateActionUnitTest(actionUnit: IActionUnit, testTagUsage: boolean, doNotNotify = false): Promise<IActionUnit> {
    // @ts-ignore
    const dispatchEventSpy = jest.spyOn(storage, "dispatchEvent");
    const modifiedOn = actionUnit.modifiedOn;

    await new Promise<IActionUnit | void>(async (accept) => {
        storage.subscribeOnUpdateActionUnit(accept);

        await storage.updateActionUnit(actionUnit, doNotNotify);
        if (doNotNotify) accept();
    })


    const auFromDb = storage.getActionUnit(actionUnit.id);
    if (!auFromDb) {
        expect(auFromDb).toBeTruthy();
        throw new Error("auFromDb doesn't exist");
    }

    expect(auFromDb.type).toBe(actionUnit.type);
    expect(auFromDb).not.toBe(actionUnit);
    expect(auFromDb.modifiedOn).toBeGreaterThan(modifiedOn);
    expect(auFromDb.name).toBe(actionUnit.name);

    if (doNotNotify) expect(dispatchEventSpy).toBeCalledTimes(0);
    else expect(dispatchEventSpy).toBeCalledTimes(1);

    if (testTagUsage) {
        const tagIds = extractTagIdsFrom(auFromDb);
        expect(tagIds.length).toBeGreaterThan(0);

        for (const tagId of tagIds) {
            if (!tagId) continue;

            const tag = tagService.getTag(tagId);
            if (!tag) expect(tag).toBeTruthy();

            expect(tag?.usage).toBeTruthy();
            expect(tag?.usage?.length).toBeGreaterThan(0);
            expect(tag?.usage?.includes(auFromDb.id)).toBe(true);
        }
    }

    return auFromDb
}


async function createBunchOfActions(storage: StorageService, setsQty: number, actionsQty: number) {
    const resultsDb = new ResultsService();
    const auTypes = Object.values(ActionUnitType);
    let auTypeCount = 0;
    const auResults: IResultFromIpc[] = [];
    const project = storage.getProject();
    for (let i = 0; i < setsQty; i++) {

        const actionSet = new ActionSet("Set " + i, project.id);
        const asConf = {
            showDialog: false,
            isAdding: true,
            actionSet: actionSet,
            insertBeforeId: "",
        };

        await storage.editActionSet(asConf);
        for (let k = 0; k < actionsQty; k++) {
            if (auTypeCount > auTypes.length - 1) auTypeCount = 0;
            const auConf = {
                showDialog: false,
                name: auTypes[auTypeCount] + "_" + i + k,
                insertBeforeId: "",
                actionSetId: actionSet.id,
                actionUnitId: "",
                type: auTypes[auTypeCount]
            };
            await storage.addActionUnit(auConf);
            actionSet.actionUnitIds.push(auConf.actionUnitId);
            auTypeCount++;
            auResults.push({
                _error: "",
                finishedAt: 0,
                id: auConf.actionUnitId,
                message: "",
                passCondition: "",
                startedAt: 0,
                type: ResultType.AuResult
            })
        }
        project.actionSetIds.push(actionSet.id);
    }
    await storage.updateProject(project);
    await resultsDb.setAllResultsAtOnce(auResults);
}

async function addTagsTo(tagService: TagsService, tagsToAdd: ITagUI[]) {
    for (const tag of tagsToAdd) {
        await tagService.setTag(tag, true);
    }
}

async function expectStructure(caseStructure: number[] | null, tagsQty?: number, resultQty?: number) {
    if (caseStructure) {
        const project = storage.getProject();
        const actionSets = await actionSetDb.getActionSetsFromDb();
        const actionUnits = await actionUnitDb.getActionUnitsFromDb();

        expect(project.actionSetIds.length).toBe(caseStructure.length);
        expect(actionSets.size).toBe(caseStructure.length);
        expect(await actionSetDb.count()).toBe(caseStructure.length);

        let totalActionUnitsInActionSets = 0;
        let totalActionUnitsInStructure = 0;
        for (let i = 0; i < project.actionSetIds.length; i++) {
            const actionSetId = project.actionSetIds[i];
            const actionSet = actionSets.get(actionSetId);
            if (!actionSet) return expect(actionSet).toBeTruthy();

            expect(actionSet?.actionUnitIds.length).toBe(caseStructure[i]);

            totalActionUnitsInActionSets += (actionSet ? actionSet.actionUnitIds.length : 0);
            totalActionUnitsInStructure += caseStructure[i];

            expect(actionSet.parentId).toBe(project.id);

            for (const actionUnitId of actionSet.actionUnitIds) {
                const actionUnit = actionUnits.get(actionUnitId);
                if (!actionUnit) return expect(actionUnit).toBeTruthy();
                expect(actionUnit.parentId).toBe(actionSet.id);
            }
        }

        expect(actionUnits.size).toBe(totalActionUnitsInActionSets);
        expect(actionUnits.size).toBe(totalActionUnitsInStructure);
        expect(await actionUnitDb.count()).toBe(totalActionUnitsInStructure);
    }
    if (typeof tagsQty === "number") {
        const tagService = new TagsService();
        const tags = await tagService.getAllTags();

        expect(tags.length).toBe(tagsQty);
    }

    if (typeof resultQty === "number") {
        const resultsDb = new ResultsService();
        expect(await resultsDb.count()).toBe(resultQty);
    }
}

function getActionSet(index_or_id: number | string): ActionSet {
    const project = storage.getProject();
    const actionSetId = typeof index_or_id === "string" ?
        index_or_id :
        project.actionSetIds[index_or_id];
    const actionSet = storage.getActionSet(actionSetId);
    if (!actionSet) {
        expect(actionSet).toBeTruthy();
        throw new Error(`Cannot get Action Set at index/id ${index_or_id}`);
    }
    return actionSet
}

function getDefAddActionUnitConfig(auType: ActionUnitType, asId: string): AddActionUnitConfig {
    return {
        showDialog: false,
        name: DEFAULT_AU_NAME,
        insertBeforeId: "",
        actionSetId: asId,
        actionUnitId: "",
        type: auType
    }
}

async function getActionUnitByType(type: ActionUnitType): Promise<IActionUnit> {
    const actionUnits = await actionUnitDb.getActionUnitsFromDb();
    for (const [_, actionUnit] of actionUnits) {
        if (actionUnit.type === type) return actionUnit
    }
    throw new Error("There is no Action unit in DB with type: " + type);
}
