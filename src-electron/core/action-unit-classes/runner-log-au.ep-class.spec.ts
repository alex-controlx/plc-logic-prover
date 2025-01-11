import {RunnerLogAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {expect} from "chai";
import RunnerLogRunner from "./runner-log-au.ep-class";

describe("Testing RunnerLogRunner", () => {

    it(`should have passCondition = "this is a log message"`, async () => {
        const runner = new RunnerLogRunner();
        const runnerLogAU = new RunnerLogAU("runnerLogAU", "actionSetId");
        const result = new AuResult("resultId", "result name");
        runnerLogAU.params.logMessage = "this is a log message";

        await runner.run(runnerLogAU, result);
        expect(result.passCondition).to.be.equal(runnerLogAU.params.logMessage);
    })

})
