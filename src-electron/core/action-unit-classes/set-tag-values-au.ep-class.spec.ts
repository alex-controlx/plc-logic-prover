import {SetTagValuesAU} from "../../../src/_common/action-unit";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {expect} from "chai";
import SetTagValuesRunner from "./set-tag-values-au.ep-class";
import {FakeController, abTagsMap, plcTagObj} from "../../__tests__/simulated_plc";
import {TAG_NOT_FOUND_MESSAGE} from "./generic-au.ep-class";

const fakePlc = new FakeController();

describe("Testing SetTagValuesRunner", () => {

    const runner = new SetTagValuesRunner(fakePlc, abTagsMap);
    const result = new AuResult("resultId", "result name");

    beforeEach(() => result.handleFail(""));

    it(`should set a few values`, async () => {

        const setTagValuesAU = new SetTagValuesAU("setTagValuesAU", "actionSetId");

        setTagValuesAU.params.tagsToSet.length  = 0;

        setTagValuesAU.params.tagsToSet.push(
            {tagId: plcTagObj.bool0.id, toValue: 0, bitNo: -1},
            {tagId: plcTagObj.int0.id, toValue: 123, bitNo: -1},
            {tagId: plcTagObj.dint0.id, toValue: 1, bitNo: 3}, // 3333 => 3341
        )

        await runner.run(setTagValuesAU, result);
        expect(result.error).to.be.equal("");
        expect(abTagsMap.get(plcTagObj.bool0.id)?.value).to.be.equal(0);
        expect(abTagsMap.get(plcTagObj.int0.id)?.value).to.be.equal(123);
        expect(abTagsMap.get(plcTagObj.dint0.id)?.value).to.be.equal(3341);
    })

    it(`should fail with message "${TAG_NOT_FOUND_MESSAGE}"`, async () => {
        const setTagValuesAU = new SetTagValuesAU("setTagValuesAU", "actionSetId");

        await runner.run(setTagValuesAU, result);
        expect(result.error).to.be.equal(TAG_NOT_FOUND_MESSAGE);
    })

    it(`should fail on "Requested bit X is out of range for DT type"`, async () => {
        const setTagValuesAU = new SetTagValuesAU("setTagValuesAU", "actionSetId");

        const tagId = plcTagObj.int0.id;
        const tagToSet = setTagValuesAU.params.tagsToSet[0];
        tagToSet.tagId = tagId;
        tagToSet.toValue = 1;
        tagToSet.bitNo = 20;

        const tag = abTagsMap.get(tagId);
        if (!tag) throw new Error("Tag not found, id " + tagId);
        await runner.run(setTagValuesAU, result);
        expect(result.error).to.be.equal(`Requested bit ${tagToSet.bitNo} is out of range for ${tag.datatype} type`);
    })
})
