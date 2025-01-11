import {
    FakeController,
    abTagsMap,
    plcTagObj, simulateValueChange,
} from "../../__tests__/simulated_plc";
import {UnitTestAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {expect} from "chai";
import UnitTestRunner from "./unit-test-au.ep-class";
import {TAG_NOT_FOUND_MESSAGE} from "./generic-au.ep-class";

const fakePlc = new FakeController();
const UNIT_TEST_TOLERANCE_ms = 100;

describe("Testing UnitTestRunner", function() {
    // @ts-ignore
    this.timeout(5000);

    const runner = new UnitTestRunner(fakePlc, abTagsMap, UNIT_TEST_TOLERANCE_ms);
    const result = new AuResult("resultId", "result name");

    beforeEach(async () => await fakePlc.readTags(abTagsMap));
    afterEach( () => {
        result.handleFail("");
    })

    it("should run unit test runner", async function() {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");

        unitTestAU.params.tagsToModify.length = 0;
        unitTestAU.params.tagsToModify.push(
            {tagId: plcTagObj.bool0.id, fromValue: 1, toValue: 0, bitNo: -1},
            {tagId: plcTagObj.int0.id, fromValue: 0, toValue: 55, bitNo: -1},
            {tagId: plcTagObj.sint0.id, fromValue: 0, toValue: 1, bitNo: 4}
        );

        unitTestAU.params.expectedChanges.length = 0;
        unitTestAU.params.expectedChanges.push(
            {tagId: plcTagObj.int1.id, fromValue: 0, toValue: 2, after_s: 2, bitNo: -1},
            {tagId: plcTagObj.bool1.id, fromValue: 1, toValue: 0, after_s: 3, bitNo: -1},
            {tagId: plcTagObj.dint1.id, fromValue: 1, toValue: 0, after_s: 1.5, bitNo: 20}
        );

        simulateValueChange(unitTestAU.params.expectedChanges, 0);
        await runner.run(unitTestAU, result);

        expect(result.error).to.be.equal("");
    })

    it(`should fail on "No input tags configured."`, async () => {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");
        unitTestAU.params.tagsToModify.length = 0;

        await runner.run(unitTestAU, result);
        expect(result.error).to.be.equal(`No input tags configured.`);
    })

    it(`should fail on "Nothing to monitor: neither of "Expected changes" nor "Monitor for change" are configured."`, async () => {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");

        unitTestAU.params.expectedChanges.length = 0;
        const tagToMod = unitTestAU.params.tagsToModify[0];
        tagToMod.tagId = plcTagObj.bool0.id;

        await runner.run(unitTestAU, result);
        expect(result.error).to.be.equal(`Nothing to monitor: neither of "Expected changes" nor "Monitor for change" are configured.`);
    })

    it(`should fail with message "${TAG_NOT_FOUND_MESSAGE}" in expectedChanges`, async () => {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");

        await runner.run(unitTestAU, result);
        expect(result.error).to.be.equal(TAG_NOT_FOUND_MESSAGE);
    })

    it(`should fail with message "${TAG_NOT_FOUND_MESSAGE}" in tagToModify`, async () => {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");

        unitTestAU.params.expectedChanges.length = 0;
        unitTestAU.params.expectedChanges.push(
            {tagId: plcTagObj.bool0.id, fromValue: 1, toValue: 0, after_s: 2, bitNo: -1}
        )

        await runner.run(unitTestAU, result);
        expect(result.error).to.be.equal(TAG_NOT_FOUND_MESSAGE);
    })

    it(`should fail on "DINT_tagname with value 3333 hasn't changed to expected value 2 after 2s"`, async function() {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");

        unitTestAU.params.tagsToModify.length = 0;
        unitTestAU.params.tagsToModify.push(
            {tagId: plcTagObj.bool0.id, fromValue: 0, toValue: 1, bitNo: -1}
        )

        unitTestAU.params.expectedChanges.length = 0;
        unitTestAU.params.expectedChanges.push(
            {tagId: plcTagObj.dint0.id, fromValue: 0, toValue: 2, after_s: 2, bitNo: -1}
        )
        await runner.run(unitTestAU, result);

        expect(result.error).to.be.equal("DINT_tagname with value 3333 hasn't changed to expected value 2 after 2s");
    })

    it(`should fail on "DINT_tagname changed from 3333 to 2 TOO early [~1800ms] when should after 2s"`, async function() {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");

        unitTestAU.params.tagsToModify.length = 0;
        unitTestAU.params.tagsToModify.push(
            {tagId: plcTagObj.bool0.id, fromValue: 0, toValue: 1, bitNo: -1}
        )

        unitTestAU.params.expectedChanges.length = 0;
        unitTestAU.params.expectedChanges.push(
            {tagId: plcTagObj.dint0.id, fromValue: 0, toValue: 2, after_s: 2, bitNo: -1}
        )

        simulateValueChange(unitTestAU.params.expectedChanges, -200);

        await runner.run(unitTestAU, result);

        expect(result.error).contains("TOO early");
    })

    it(`should fail on "prog1:DINT_tagname bit 20 changed from 1 to 0 TOO early [~1300ms] when should after 1.5s"`, async function() {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");

        unitTestAU.params.tagsToModify.length = 0;
        unitTestAU.params.tagsToModify.push(
            {tagId: plcTagObj.bool0.id, fromValue: 0, toValue: 1, bitNo: -1}
        )

        unitTestAU.params.expectedChanges.length = 0;
        unitTestAU.params.expectedChanges.push(
            {tagId: plcTagObj.dint1.id, fromValue: 1, toValue: 0, after_s: 1.5, bitNo: 20}
        )

        simulateValueChange(unitTestAU.params.expectedChanges, -200);

        await runner.run(unitTestAU, result);

        expect(result.error).contains("TOO early");
    })

    it(`should pass unit test with just within the tolerance`, async function() {
        const unitTestAU = new UnitTestAU("unitTestAU", "actionSetId");
        const positiveDelay_ms = UNIT_TEST_TOLERANCE_ms - 30;

        unitTestAU.params.tagsToModify.length = 0;
        unitTestAU.params.tagsToModify.push(
            {tagId: plcTagObj.bool0.id, fromValue: 0, toValue: 1, bitNo: -1}
        )

        unitTestAU.params.expectedChanges.length = 0;
        unitTestAU.params.expectedChanges.push(
            {tagId: plcTagObj.dint1.id, fromValue: 1, toValue: 0, after_s: 1.5, bitNo: 20}
        )

        simulateValueChange(unitTestAU.params.expectedChanges, positiveDelay_ms);

        await runner.run(unitTestAU, result);

        expect(result.error).to.be.equal("");
    })
})
