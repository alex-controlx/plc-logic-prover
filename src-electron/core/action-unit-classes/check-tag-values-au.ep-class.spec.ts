import { expect } from 'chai';
import {FakeController, abTagsMap, plcTagObj, setAuParams} from "../../__tests__/simulated_plc";
import CheckTagValuesRunner from "./check-tag-values-au.ep-class";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import GenericUnitRunner, {TAG_NOT_FOUND_MESSAGE} from "./generic-au.ep-class";
import {CheckTagValuesAU} from "../../../src/_common/action-unit";

const cipPLC = new FakeController();

describe("Tests on CheckTagValuesRunner", () => {
    const runners: CheckTagValuesRunner[] = [new CheckTagValuesRunner(cipPLC, abTagsMap)];

    const actionSetId = "as1id";
    const resultId = "resultId";
    const resultName = "result name";
    const result = new AuResult(resultId, resultName);

    beforeEach(() => result.handleFail(""));

    it('should Check Tag Value action uint with all types of tags', async () => {
        const checkTagValuesAU = new CheckTagValuesAU("checkTagValuesAU name", actionSetId);

        checkTagValuesAU.params.tagsToCheck.length = 0;
        const tagsToCheck = checkTagValuesAU.params.tagsToCheck;
        tagsToCheck.push(
            {tagId: plcTagObj.bool0.id, toValue: 1, bitNo: -1},
            {tagId: plcTagObj.sint0.id, toValue: 11, bitNo: -1},
            {tagId: plcTagObj.sint0.id, toValue: 0, bitNo: 2},
            {tagId: plcTagObj.sint0.id, toValue: 1, bitNo: 3},
            {tagId: plcTagObj.int0.id, toValue: -222, bitNo: -1},
            {tagId: plcTagObj.int0.id, toValue: 1, bitNo: 15},
            {tagId: plcTagObj.dint0.id, toValue: 3333, bitNo: -1},
            {tagId: plcTagObj.dint0.id, toValue: 0, bitNo: 9},
            {tagId: plcTagObj.dint0.id, toValue: 1, bitNo: 10},
        );

        for (const runner of runners) {
            await runner.run(checkTagValuesAU, result);
            expect(result.error).to.be.equal("");
        }
    });

    it('should Check Tag Value action uint in prog1', async () => {
        const checkTagValuesAU = new CheckTagValuesAU("checkTagValuesAU name", actionSetId);

        checkTagValuesAU.params.tagsToCheck.length = 0;
        const tagsToCheck = checkTagValuesAU.params.tagsToCheck;
        tagsToCheck.push(
            {tagId: plcTagObj.bool1.id, toValue: 1, bitNo: -1},
            {tagId: plcTagObj.sint1.id, toValue: -11, bitNo: -1},
            {tagId: plcTagObj.int1.id, toValue: 222, bitNo: -1},
            {tagId: plcTagObj.dint1.id, toValue: -3333, bitNo: -1},
        );

        for (const runner of runners) {
            await runner.run(checkTagValuesAU, result);
            expect(result.error).to.be.equal("");
        }
    });

    it(`should fail with message "${TAG_NOT_FOUND_MESSAGE}"`, async () => {
        const checkTagValuesAU = new CheckTagValuesAU("checkTagValuesAU name", actionSetId);

        // setAuParams(checkTagValuesAU).setTagToCheck(0, "", 0);

        for (const runner of runners) {
            await runner.run(checkTagValuesAU, result);
            expect(result.error).to.be.equal(TAG_NOT_FOUND_MESSAGE);
        }
    })

    it(`should fail on "tag.fullName is X when expected Y"`, async () => {
        const checkTagValuesAU = new CheckTagValuesAU("checkTagValuesAU name", actionSetId);

        const tagId = plcTagObj.dint1.id;
        checkTagValuesAU.params.tagsToCheck.length = 0;
        checkTagValuesAU.params.tagsToCheck.push({tagId, toValue: -3331, bitNo: -1});

        const tagToCheck = checkTagValuesAU.params.tagsToCheck[0];
        const tag = abTagsMap.get(tagId);
        if (!tag) throw new Error("Tag not found, id " + tagId);

        for (const runner of runners) {
            await runner.run(checkTagValuesAU, result);
            expect(result.error).to.be.equal(`${tag.fullName} is ${tag.value} when expected ${tagToCheck.toValue}`);
        }
    })

    it(`should fail with "tag.fullName bit X is Y when expected Z"`, async () => {
        const checkTagValuesAU = new CheckTagValuesAU("checkTagValuesAU name", actionSetId);

        const tagId = plcTagObj.dint0.id; // 3333 = 1010 0000 1011 0000 0000 0000 0000 0000
        const bitValue = 0; // 9th bit

        checkTagValuesAU.params.tagsToCheck.length = 0;
        checkTagValuesAU.params.tagsToCheck.push({tagId, toValue: 1, bitNo: 9});

        const tagToCheck = checkTagValuesAU.params.tagsToCheck[0];
        const tag = abTagsMap.get(tagId);
        if (!tag) throw new Error("Tag not found, id " + tagId);

        for (const runner of runners) {
            await runner.run(checkTagValuesAU, result)
            expect(result.error).to.be.equal(tag.fullName + GenericUnitRunner.getBitText(tagToCheck.bitNo) +
                ` is ${bitValue} when expected ${tagToCheck.toValue}`)
        }
    })

    it(`should fail on "Requested bit X is out of range for DT type"`, async () => {
        const checkTagValuesAU = new CheckTagValuesAU("checkTagValuesAU name", actionSetId);

        const tagId = plcTagObj.int0.id;

        checkTagValuesAU.params.tagsToCheck.length = 0;
        checkTagValuesAU.params.tagsToCheck.push({tagId, toValue: 1, bitNo: 20});

        const tagToCheck = checkTagValuesAU.params.tagsToCheck[0];
        const tag = abTagsMap.get(tagId);
        if (!tag) throw new Error("Tag not found, id " + tagId);

        for (const runner of runners) {
            await runner.run(checkTagValuesAU, result);
            expect(result.error).to.be.equal(`Requested bit ${tagToCheck.bitNo} is out of range for ${tag.datatype} type`);
        }
    })

    it('should fail on the second tag', async () => {
        const checkTagValuesAU = new CheckTagValuesAU("checkTagValuesAU name", actionSetId);

        checkTagValuesAU.params.tagsToCheck.length = 0;
        checkTagValuesAU.params.tagsToCheck.push(
            {tagId: plcTagObj.bool0.id, toValue: 1, bitNo: -1},
            {tagId: plcTagObj.sint0.id, toValue: 12, bitNo: -1},
            {tagId: plcTagObj.int0.id, toValue: -222, bitNo: -1},
        );

        const tagToCheck = checkTagValuesAU.params.tagsToCheck[1];
        const tag = abTagsMap.get(plcTagObj.sint0.id);
        if (!tag) throw new Error("Tag not found, id " + plcTagObj.sint0.id);

        for (const runner of runners) {
            await runner.run(checkTagValuesAU, result);
            expect(result.error).to.be.equal(`${tag.fullName} is ${tag.value} when expected ${tagToCheck.toValue}`);
        }
    });

})


