import {pretests} from "../../__pretests__/_pretest.config";
import {LpUtils} from "../../_common/utils";
import {ActionUnitDbService} from "./action_unit_db.service";
import {IActionUnit, RunnerLogAU, UnitTestAU} from "../../_common/action-unit";
import UnitsChecker from "./units-checker";
import TagsService from "./tags.service";
import {ProjectDbService} from "./project_db.service";

pretests.init();
let tagService: TagsService;
let unitsChecker: UnitsChecker;
let actionUnitDb: ActionUnitDbService;
let firstRunnerLogAu: IActionUnit;
const ACTION_SET_ID = LpUtils.generateId();

describe("Service Initialisation", () => {
    it("should fail on usage of ActionUnitDbService before calling init", () => {
        try {
            new ActionUnitDbService()
        } catch (e) {
            const message = (e instanceof Error) ? e.message :
                (typeof e === "string") ? e : JSON.stringify(e);
            expect(message).toBe("ActionUnitDbService wasn't initialised yet. Call ActionUnitDbService.init() first.");
        }
    });

    it("should fail on calling ActionUnitDbService.init before calling UnitsChecker.init()", async () => {
        try {
            await ActionUnitDbService.init();
        } catch (e) {
            const message = (e instanceof Error) ? e.message :
                (typeof e === "string") ? e : JSON.stringify(e);
            expect(message).toBe("UnitsChecker wasn't initialised yet. Call UnitsChecker.init() first.");
        }
    });


    it("should initialise actionUnitDb", async () => {
        await ProjectDbService.init();
        await TagsService.init();
        tagService = new TagsService();
        await UnitsChecker.init(tagService);
        unitsChecker = new UnitsChecker();
        await ActionUnitDbService.init();
        actionUnitDb = new ActionUnitDbService();

        [
            "getActionUnit", "getActionUnitFromDb", "getActionUnitsFromDb", "count",
            "setActionUnit", "deleteActionUnit", "moveActionUnit", "clearDb"
        ].forEach(method => {
            // @ts-ignore
            expect(typeof actionUnitDb[method]).toBe("function");
        })
    });
});

describe("General tests on actionUnitDb methods", () => {

    beforeAll(() => {
        expect(actionUnitDb).toBeTruthy();
    })

    it(`should test "setActionUnit()"`, async () => {
        firstRunnerLogAu = new RunnerLogAU("_name_", ACTION_SET_ID);
        firstRunnerLogAu.modifiedOn--;
        firstRunnerLogAu.params.logMessage = "";

        const modifiedOn = firstRunnerLogAu.modifiedOn;
        const addedAu = await actionUnitDb.setActionUnit(firstRunnerLogAu, true);

        const invalidUnit = unitsChecker.getInvalidAUById(firstRunnerLogAu.id);

        expect(invalidUnit).toBeTruthy();
        expect(addedAu).toBe(firstRunnerLogAu);
        expect(addedAu.modifiedOn).toBeGreaterThan(modifiedOn);
    });


    it(`should test "getActionUnit()"`, async () => {
        const actionUnit = await actionUnitDb.getActionUnit(firstRunnerLogAu.id);
        expect(JSON.stringify(actionUnit)).toBe(JSON.stringify(firstRunnerLogAu));
    });


    it(`should test "getActionUnitFromDb()"`, async () => {
        const actionUnit = await actionUnitDb.getActionUnitFromDb(firstRunnerLogAu.id);
        expect(JSON.stringify(actionUnit)).toBe(JSON.stringify(firstRunnerLogAu));
    });


    it(`should test "getActionUnitsFromDb()"`, async () => {
        const newActionUnit = new UnitTestAU("_unit_test_name", ACTION_SET_ID);
        await actionUnitDb.setActionUnit(newActionUnit, true);

        const actionUnits = await actionUnitDb.getActionUnitsFromDb();

        expect(actionUnits.size).toBe(2);

        const theFirstOne = actionUnits.get(firstRunnerLogAu.id);
        if (!theFirstOne) return expect(theFirstOne).toBeTruthy();

        expect(JSON.stringify(theFirstOne)).toBe(JSON.stringify(firstRunnerLogAu));
    });


    it(`should test "count()"`, async () => {
        expect(await actionUnitDb.count()).toBe(2);
    });


    it(`should test "moveActionUnit()"`, async () => {
        const newParentId = LpUtils.generateId();
        await actionUnitDb.moveActionUnit(firstRunnerLogAu.id, newParentId, true);

        const actionUnit = await actionUnitDb.getActionUnit(firstRunnerLogAu.id);
        if (!actionUnit) return expect(actionUnit).toBeTruthy();

        expect(actionUnit.parentId).toBe(newParentId);
    });


    it(`should test "deleteActionUnit()"`, async () => {
        await actionUnitDb.deleteActionUnit(firstRunnerLogAu.id);

        expect(await actionUnitDb.count()).toBe(1);
    });


    it(`should test "clearDb()"`, async () => {
        await actionUnitDb.clearDb();
        expect(await actionUnitDb.count()).toBe(0);
    });

});


// describe("General tests on actionUnitDb methods", () => {
//
//     it(`should test "setActionUnit()"`, async () => {});
//
//     it(`should test "getActionUnit()"`, async () => {});
//
//     it(`should test "getActionUnitFromDb()"`, async () => {});
//
//     it(`should test "getActionUnitsFromDb()"`, async () => {});
//
//     it(`should test "count()"`, async () => {});
//
//     it(`should test "moveActionUnit()"`, async () => {});
//
//     it(`should test "deleteActionUnit()"`, async () => {});
//
//     it(`should test "clearDb()"`, async () => {});
//
// });
