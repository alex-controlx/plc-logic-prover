import {plcTagObj, pretests} from "../../__pretests__/_pretest.config";
import UnitsChecker from "./units-checker";
import TagsService from "./tags.service";
import {
    CheckTagValuesAU, HeartbeatAU,
    IActionUnit,
    IInvalidUnitMessage, ModTagValue, ModTagValueTimed, ResetTagValueAU, RunnerLogAU, SetTagValue,
    SetTagValuesAU, SleepAU, UnitTestAU
} from "../../_common/action-unit";
import {ActionSet} from "../../_common/interfaces";
import {INVALID_MESSAGE} from "../../_common/strings.lang";
import {ProjectDbService} from "./project_db.service";

pretests.init();
let unitsChecker: UnitsChecker;
let tagService: TagsService;
const testTag = plcTagObj.bool0;
const CHECK_VALID = "__valid__";

describe("Service Initialisation", () => {
    it("should fail on usage of UnitsChecker before calling init", () => {
        try {
            new UnitsChecker()
        } catch (e) {
            const message = (e instanceof Error) ? e.message :
                (typeof e === "string") ? e : JSON.stringify(e);
            expect(message).toBe("UnitsChecker wasn't initialised yet. Call UnitsChecker.init() first.");
        }
    })

    it("should initialise UnitsChecker and set unitsChecker variable", async () => {
        await ProjectDbService.init();
        await TagsService.init();
        tagService = new TagsService();

        await UnitsChecker.init(tagService);
        unitsChecker = new UnitsChecker();

        expect(typeof unitsChecker.checkActionUnit).toBe("function");
        expect(typeof unitsChecker.clearDb).toBe("function");
        expect(typeof unitsChecker.deleteInvalidUnit).toBe("function");
        expect(typeof unitsChecker.getUnitsFromDb).toBe("function");
        expect(typeof unitsChecker.onUpdatedInvalidUnitsSubscriber).toBe("function");
        expect(typeof unitsChecker.setInvalidUnit).toBe("function");
        expect(typeof unitsChecker.count).toBe("function");
    })

    it("confirms tagService has required tags", async() => {
        await tagService.setTag(testTag, true);
        const tags = await tagService.getAllTags();
        expect(tags.length).toBe(1);
    })
});


describe("General tests on UnitChecker methods", () => {
    const tempActionUnit = new SetTagValuesAU("tempInvalidUnit", "parentId");
    const invalidUnit: IInvalidUnitMessage = {
        actionUnitId: tempActionUnit.id,
        isEnabled: tempActionUnit.enabled,
        message: "This is the test message",
        name: tempActionUnit.name,
    };

    beforeAll(() => {
        expect(unitsChecker).toBeTruthy();
    })

    it("should test setInvalidUnit method", async () => {
        await unitsChecker.setInvalidUnit(invalidUnit);
        await generalTestsOnInvalidUnit(tempActionUnit, invalidUnit.message);
    })

    it("should test count method", async () => {
        const count = await unitsChecker.count();
        expect(count).toBe(1);
    })

    it("should test deleteInvalidUnit method", async () => {
        await unitsChecker.deleteInvalidUnit(tempActionUnit.id);
        await checkUnitCheckerDbIsEmpty(tempActionUnit.id);
    })

    it("should test onUpdatedInvalidUnitsSubscriber method", async () => {
        let response: IInvalidUnitMessage | string = {actionUnitId: "", isEnabled: false, message: "", name: "a"};

        await new Promise<void>(async (accept) => {
            unitsChecker.onUpdatedInvalidUnitsSubscriber((invalidAu: IInvalidUnitMessage | string) => {
                response = invalidAu;
                accept();
            })
            await unitsChecker.setInvalidUnit(invalidUnit, true);
        })

        expect(typeof response).not.toBe("string");
        expect(response.actionUnitId).toBe(invalidUnit.actionUnitId);


        await new Promise<void>(async (accept) => {
            unitsChecker.onUpdatedInvalidUnitsSubscriber((invalidAu: IInvalidUnitMessage | string) => {
                response = invalidAu;
                accept();
            })
            await unitsChecker.deleteInvalidUnit(invalidUnit.actionUnitId, true);
        })

        expect(response).toBe(invalidUnit.actionUnitId);
    })


    it("should test clearDb method", async () => {
        await unitsChecker.setInvalidUnit(invalidUnit);
        const invalidUnits = await unitsChecker.getUnitsFromDb();
        expect(invalidUnits.length).toBeGreaterThanOrEqual(1);

        await unitsChecker.clearDb();
        await checkUnitCheckerDbIsEmpty(tempActionUnit.id);
    })
})


describe(
    `Test Action Units: "Runner Log", "Unit Test", "Set Tag Value", "Check Tag Value", ` +
    `"Heartbeat", "Reset Tag Value", "Sleep"`,
    () =>
{
    const actionSet = new ActionSet("ActionSet 1", "projectId");

    describe(`Test invalid messages on "Runner Log"`, () => {
        const currentActionUnit =  new RunnerLogAU("AU Name", actionSet.id);

        const testCases: IPreCheckAction[] = [
            {
                message: INVALID_MESSAGE.RunnerLog.no_logMessage,
                action: () => {
                    currentActionUnit.params.logMessage = "";
                }
            }, {
                message: CHECK_VALID,
                action: () => {
                    currentActionUnit.params.logMessage = "not empty"
                }
            }
        ];
        runTestCases(currentActionUnit, testCases);
    })

    describe(`Test invalid messages on "Unit Test"`, () => {
        const unitTestAU =  new UnitTestAU("AU Name", actionSet.id);

        const testCases: IPreCheckAction[] = [
            {
                message: "An input tag was not selected",
                action: () => {}
            }, {
                message: "Input tag was deleted",
                action: () => {
                    unitTestAU.params.tagsToModify[0].tagId = "newId";
                }
            }, {
                message: "There are no tags to set",
                action: () => {
                    unitTestAU.params.tagsToModify.length = 0;
                }
            }, {
                message: "An output tag was not selected",
                action: () => {
                    unitTestAU.params.tagsToModify.push(new ModTagValue(testTag.id));
                }
            }, {
                message: "Expected output tag was deleted",
                action: () => {
                    unitTestAU.params.expectedChanges[0].tagId = "non_existing_id";
                }
            }, {
                message: "There are no output tags to check",
                action: () => {
                    unitTestAU.params.expectedChanges.length = 0;
                }
            }, {
                message: "Monitor for 'No Change' tag was deleted",
                action: () => {
                    unitTestAU.params.expectedChanges.push(new ModTagValueTimed(testTag.id));
                    unitTestAU.params.noChangeTagIds.push("non_existing_id");
                }
            }, {
                message: "A reset tag was not selected",
                action: () => {
                    unitTestAU.params.noChangeTagIds.length = 0;
                    unitTestAU.params.tagsToToggle.push(new ModTagValueTimed());
                }
            }, {
                message: "Reset tag was deleted",
                action: () => {
                    unitTestAU.params.tagsToToggle[0].tagId = "non_existing_id";
                }
            }, {
                message: CHECK_VALID,
                action: () => {
                    unitTestAU.params.tagsToToggle.length = 0;
                    unitTestAU.params.tagsToToggle.push(new ModTagValueTimed(testTag.id));
                }
            }
        ];

        runTestCases(unitTestAU, testCases);
    })


    describe(`Test invalid messages on "Set Tag Value"`, () => {
        const currentActionUnit =  new SetTagValuesAU("AU Name", actionSet.id);

        const testCases: IPreCheckAction[] = [
            {
                message: INVALID_MESSAGE.SetTagValue.noSelTagIn_tagsToSet,
                action: () => {}
            }, {
                message: INVALID_MESSAGE.SetTagValue.tagWasDeleted,
                action: () => {
                    currentActionUnit.params.tagsToSet[0].tagId = "newId";
                }
            }, {
                message: INVALID_MESSAGE.SetTagValue.noTagsIn_tagsToSet,
                action: () => {
                    currentActionUnit.params.tagsToSet.length = 0;
                }
            }, {
                message: CHECK_VALID,
                action: () => {
                    currentActionUnit.params.tagsToSet.push(new SetTagValue(testTag.id))
                }
            }
        ];

        runTestCases(currentActionUnit, testCases);
    })

    describe(`Test invalid messages on "Check Tag Values"`, () => {
        const currentActionUnit =  new CheckTagValuesAU("AU Name", actionSet.id);

        const testCases: IPreCheckAction[] = [
            {
                message: "A tag was not selected",
                action: () => {}
            }, {
                message: "Tag was deleted",
                action: () => {
                    currentActionUnit.params.tagsToCheck[0].tagId = "newId";
                }
            }, {
                message: "There are no tags to check",
                action: () => {
                    currentActionUnit.params.tagsToCheck.length = 0;
                }
            }, {
                message: CHECK_VALID,
                action: () => {
                    currentActionUnit.params.tagsToCheck.push(new SetTagValue(testTag.id))
                }
            }
        ];

        runTestCases(currentActionUnit, testCases);
    })

    describe(`Test invalid messages on "Heartbeat"`, () => {
        const heartbeatAU =  new HeartbeatAU("AU Name", actionSet.id);

        const testCases: IPreCheckAction[] = [
            {
                message: "A heartbeat tag was not selected",
                action: () => {}
            }, {
                message: "Heartbeat tag was deleted",
                action: () => {
                    heartbeatAU.params.tagsToToggle[0].tagId = "newId";
                }
            }, {
                message: "Heartbeat from and to values must not be equal",
                action: () => {
                    heartbeatAU.params.tagsToToggle.length = 0;
                    heartbeatAU.params.tagsToToggle.push(new ModTagValueTimed(testTag.id))
                    heartbeatAU.params.tagsToToggle[0].toValue = 10;
                    heartbeatAU.params.tagsToToggle[0].fromValue = 10;
                }
            }, {
                message: "Heartbeat pulse must be greater or equal than 0.5s, but got 0.3s",
                action: () => {
                    heartbeatAU.params.tagsToToggle[0].toValue = 20;
                    heartbeatAU.params.tagsToToggle[0].after_s = 0.3;
                }
            }, {
                message: "Requested bit 2 is out of range for BOOL type",
                action: () => {
                    heartbeatAU.params.tagsToToggle[0].after_s = 1;
                    heartbeatAU.params.tagsToToggle[0].bitNo = 2;
                }
            }, {
                message: CHECK_VALID,
                action: () => {
                    heartbeatAU.params.tagsToToggle[0].bitNo = 1;
                }
            }
        ];

        runTestCases(heartbeatAU, testCases);
    })

    describe(`Test invalid messages on "Reset Tag Value"`, () => {
        const resetTagValueAU =  new ResetTagValueAU("AU Name", actionSet.id);

        const testCases: IPreCheckAction[] = [
            {
                message: "A reset tag was not selected",
                action: () => {}
            }, {
                message: "Tag was deleted",
                action: () => {
                    resetTagValueAU.params.tagsToToggle[0].tagId = "newId";
                }
            }, {
                message: CHECK_VALID,
                action: () => {
                    resetTagValueAU.params.tagsToToggle.length = 0;
                    resetTagValueAU.params.tagsToToggle.push(new ModTagValueTimed(testTag.id))
                }
            }
        ];
        runTestCases(resetTagValueAU, testCases);
    })

    describe(`Test invalid messages on "Sleep"`, () => {
        const sleepAU =  new SleepAU("AU Name", actionSet.id);

        const testCases: IPreCheckAction[] = [
            {
                message: "Time value must be greater or equal 0",
                action: () => {
                    sleepAU.params.sleep_s = -1;
                }
            }, {
                message: CHECK_VALID,
                action: () => {
                    sleepAU.params.sleep_s = 0;
                }
            }
        ];
        runTestCases(sleepAU, testCases);
    })
})

function runTestCases(currentActionUnit: IActionUnit, testCases: IPreCheckAction[]) {
    testCases.forEach((testCase) => {
        it("should check " + testCase.message, async () => {
            testCase.action();
            await unitsChecker.checkActionUnit(currentActionUnit, true);
            const invalidUnits = await unitsChecker.getUnitsFromDb();
            if (testCase.message === CHECK_VALID) {
                expect(invalidUnits.length).toBe(0);
                return;
            }
            expect(invalidUnits.length).toBe(1);
            await generalTestsOnInvalidUnit(currentActionUnit, testCase.message);
        })
    })
}

async function generalTestsOnInvalidUnit(actionUnit: IActionUnit, invalidUnitMessage: string) {
    // check unit in cache
    const invalidUnit = unitsChecker.getInvalidAUById(actionUnit.id);
    checkPropertiesOfInvalidActionUnit(actionUnit, invalidUnit);
    expect(invalidUnit?.message).toBe(invalidUnitMessage);

    // check unit in Database
    const invalidUnitFromDb = (await unitsChecker.getUnitsFromDb())[0];
    expect(JSON.stringify(invalidUnit)).toBe(JSON.stringify(invalidUnitFromDb));
}

function checkPropertiesOfInvalidActionUnit(actionUnit: IActionUnit, invalidUnit?: IInvalidUnitMessage) {
    expect(invalidUnit?.name).toBe(actionUnit.name);
    expect(invalidUnit?.actionUnitId).toBe(actionUnit.id);
    expect(invalidUnit?.isEnabled).toBe(actionUnit.enabled);
}

async function checkUnitCheckerDbIsEmpty(actionUnitId: string) {
    const notAInvalidUnit = unitsChecker.getInvalidAUById(actionUnitId);
    expect(notAInvalidUnit).toBe(undefined);

    const invalidUnits = await unitsChecker.getUnitsFromDb();
    expect(invalidUnits.length).toBe(0);
}

interface IPreCheckAction {
    message: string,
    action(): void,
}
