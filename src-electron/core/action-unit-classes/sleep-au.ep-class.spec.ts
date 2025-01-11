import {SleepAU} from "../../../src/_common/action-unit";
import SleepRunner from "./sleep-au.ep-class";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {expect} from "chai";

describe("Testing SleepRunner", () => {

    it(`should sleep for 1.3 seconds`, async () => {
        const runner = new SleepRunner();
        const sleepAU = new SleepAU("sleepAu", "actionSetId");
        const result = new AuResult("resultId", "result name");

        sleepAU.params.sleep_s = 1.3;

        const startedAt = Date.now();
        await runner.run(sleepAU, result);

        const diff = Math.round((Date.now() - startedAt) / 100) / 10;
        expect(diff).to.be.equal(sleepAU.params.sleep_s);
    })

})
