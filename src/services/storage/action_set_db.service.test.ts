import {pretests} from "../../__pretests__/_pretest.config";
import {ActionSetDbService} from "./action_set_db.service";
import {ActionSet} from "../../_common/interfaces";
import {LpUtils} from "../../_common/utils";

pretests.init();
let actionSetDb: ActionSetDbService;
let firstActionSet: ActionSet;
const PROJECT_ID = LpUtils.generateId();

describe("Service Initialisation", () => {
    it("should fail on usage of ActionSetDbService before calling init", () => {
        try {
            new ActionSetDbService()
        } catch (e) {
            const message = (e instanceof Error) ? e.message :
                (typeof e === "string") ? e : JSON.stringify(e);
            expect(message).toBe("ActionSetDbService wasn't initialised yet. Call ActionSetDbService.init() first.");
        }
    });

    it("should initialise projectDb", async () => {
        await ActionSetDbService.init();
        actionSetDb = new ActionSetDbService();

        [
            "getActionSet", "getActionSetFromDb", "getActionSetsFromDb", "getSize", "count",
            "setActionSet", "deleteActionSet", "clearDb", "removeActionUnits"
        ].forEach(method => {
            // @ts-ignore
            expect(typeof actionSetDb[method]).toBe("function");
        })
    });
});


describe("General tests on actionSetDb methods", () => {

    it(`should test "setActionSet()"`, async () => {
        firstActionSet = new ActionSet("new_action_set1", PROJECT_ID);
        firstActionSet.modifiedOn--;
        const modifiedOn = firstActionSet.modifiedOn;

        const addedActionSet = await actionSetDb.setActionSet(firstActionSet);

        expect(addedActionSet).toBe(firstActionSet);
        expect(addedActionSet.modifiedOn).toBeGreaterThan(modifiedOn);
    });

    it(`should test "getActionSet()"`, async () => {
        const actionSet = await actionSetDb.getActionSet(firstActionSet.id);
        expect(JSON.stringify(actionSet)).toBe(JSON.stringify(firstActionSet));
    });

    it(`should test "getActionSetFromDb()"`, async () => {
        const actionSet = await actionSetDb.getActionSetFromDb(firstActionSet.id);
        expect(JSON.stringify(actionSet)).toBe(JSON.stringify(firstActionSet));
    });

    it(`should test "getActionSetsFromDb()"`, async () => {
        const actionSet = new ActionSet("new_action_set2", PROJECT_ID);
        await actionSetDb.setActionSet(actionSet);

        const actionSets = await actionSetDb.getActionSetsFromDb();
        expect(actionSets.size).toBe(2);

        const theFirstActionSet = actionSets.get(firstActionSet.id);
        expect(JSON.stringify(theFirstActionSet)).toBe(JSON.stringify(firstActionSet));
    });

    it(`should test "getSize()"`, async () => {
        expect(actionSetDb.getSize()).toBe(2);
    });

    it(`should test "count()"`, async () => {
        expect(await actionSetDb.count()).toBe(2);
    });

    it(`should test "deleteActionSet()"`, async () => {
        const actionSets = await actionSetDb.getActionSetsFromDb();
        let actionSetIdToDelete = "";
        for (const [_, actionSet] of actionSets) {
            if (actionSet.id !== firstActionSet.id) {
                actionSetIdToDelete = actionSet.id;
                break;
            }
        }

        await actionSetDb.deleteActionSet(actionSetIdToDelete);

        expect(actionSetDb.getSize()).toBe(1);
        expect(await actionSetDb.count()).toBe(1);
    });

    it(`should test "removeActionUnits()"`, async () => {
        const [auId1, auId2, auId3] = [LpUtils.generateId(), LpUtils.generateId(), LpUtils.generateId()];
        firstActionSet.actionUnitIds.push(auId1, auId2, auId3);
        await actionSetDb.setActionSet(firstActionSet);

        let actionSet = await actionSetDb.getActionSet(firstActionSet.id);
        if (!actionSet) return expect(actionSet).toBeTruthy();
        expect(actionSet.actionUnitIds.length).toBe(3);

        await actionSetDb.removeActionUnits(firstActionSet, [auId1, auId2]);

        actionSet = await actionSetDb.getActionSet(firstActionSet.id);
        if (!actionSet) return expect(actionSet).toBeTruthy();
        expect(actionSet.actionUnitIds.length).toBe(1);
        expect(actionSet.actionUnitIds[0]).toBe(auId3);
    });

    it(`should test "clearDb()"`, async () => {
        await actionSetDb.clearDb();

        expect(actionSetDb.getSize()).toBe(0);
        expect(await actionSetDb.count()).toBe(0);
        const actionSets = await actionSetDb.getActionSetsFromDb();
        expect(actionSets.size).toBe(0);
    });
})
