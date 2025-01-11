import {pretests} from "../../__pretests__/_pretest.config";
import ResultsService from "./results_db.service";
import {IResultFromIpc, ResultType} from "../../_common/interfaces/result.class";
import {LpUtils} from "../../_common/utils";

pretests.init();
let resultDb: ResultsService;
const fakeResults: IResultFromIpc[] = generateFakeResults();

describe("Service Initialisation", () => {

    it("should initialise projectDb", async () => {
        resultDb = new ResultsService();

        [
            "getResultFromDb", "count", "setAllResultsAtOnce", "clearResultsDb", "getResultsFromDb"
        ].forEach(method => {
            // @ts-ignore
            expect(typeof resultDb[method]).toBe("function");
        })
    });
});

describe("General tests on actionSetDb methods", () => {

    it(`should test "setAllResultsAtOnce()"`, async () => {
        await resultDb.setAllResultsAtOnce(fakeResults);
    });

    it(`should test "count()"`, async () => {
        // 3 results and 1 order
        expect(await resultDb.count()).toBe(4);
    });

    it(`should test "getResultFromDb()"`, async () => {
        const resultFromDb = await resultDb.getResultFromDb(fakeResults[0].id);
        if (!resultFromDb) return expect(resultFromDb).toBeTruthy();

        expect(resultFromDb.id).toBe(fakeResults[0].id);
        expect(resultFromDb.message).toBe(fakeResults[0].message);

    });

    it(`should test "getResultsFromDb()"`, async () => {
        const resultsFromDb = await resultDb.getResultsFromDb();

        expect(resultsFromDb.length).toBe(3);
        expect(JSON.stringify(resultsFromDb[0])).toBe(JSON.stringify(fakeResults[0]));
        expect(JSON.stringify(resultsFromDb[1])).toBe(JSON.stringify(fakeResults[1]));
        expect(JSON.stringify(resultsFromDb[2])).toBe(JSON.stringify(fakeResults[2]));
    });

    it(`should test "clearResultsDb()"`, async () => {
        await resultDb.clearResultsDb();

        const resultsFromDb = await resultDb.getResultsFromDb();
        expect(resultsFromDb.length).toBe(0);
        expect(await resultDb.count()).toBe(0);
    });

});

function generateFakeResults() {
    return [
        {
            _error: "",
            disabled: false,
            finishedAt: 0,
            id: LpUtils.generateId(),
            message: "Project wide result",
            passCondition: "",
            startedAt: 0,
            type: ResultType.Result
        }, {
            _error: "",
            disabled: false,
            finishedAt: 0,
            id: LpUtils.generateId(),
            message: "Action Set result",
            passCondition: "passCondition 2",
            startedAt: 0,
            type: ResultType.AsResult
        }, {
            _error: "",
            disabled: false,
            finishedAt: 0,
            id: LpUtils.generateId(),
            message: "Action Unit result",
            passCondition: "passCondition 3",
            startedAt: 0,
            type: ResultType.AuResult
        },
    ]
}
