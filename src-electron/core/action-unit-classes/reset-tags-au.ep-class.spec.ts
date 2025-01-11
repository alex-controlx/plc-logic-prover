import {expect} from "chai";
import {FakeController, abTagsMap, flChannel, plcTagObj} from "../../__tests__/simulated_plc";
import ResetTagValuesRunner from "./reset-tags-au.ep-class";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import {ModTagValueTimed, ResetTagValueAU} from "../../../src/_common/action-unit";
import {LpUtils} from "../../../src/_common/utils";
import {TAG_NOT_FOUND_MESSAGE} from "./generic-au.ep-class";

const plc = new FakeController();

describe("Tests on ResetTagValuesRunner", () => {
    const runners: ResetTagValuesRunner[] = [new ResetTagValuesRunner(plc, abTagsMap)];
    const runner = runners[0];

    const result = new AuResult("resultId", "resultName");

    beforeEach(() => result.handleFail(""));
    afterEach( () => plc.removeAllFakeListeners());

    it(`should reset tags`, function(done) {
        const resetTagValueAU = new ResetTagValueAU("checkTagValuesAU name", "actionSetId");
        let countResets = 0;

        const resetTagMap = new Map<string, IResetTagSet>([
            [plcTagObj.bool0.id, {
                count: 0,
                remembered: plcTagObj.bool0.v,
                uiTag: {tagId: plcTagObj.bool0.id, fromValue: 0, toValue: 0, after_s: 0.8, bitNo: -1}
            }],
            [plcTagObj.sint0.id, {
                count: 0,
                remembered: plcTagObj.sint0.v,
                uiTag: {tagId: plcTagObj.sint0.id, fromValue: 0, toValue: 15, after_s: 1.5, bitNo: -1}
            }],
            [plcTagObj.int0.id, {
                count: 0,
                remembered: plcTagObj.int0.v,
                uiTag: {tagId: plcTagObj.int0.id, fromValue: 0, toValue: 0, after_s: 1, bitNo: 12}
            }]
        ]);

        resetTagValueAU.params.tagsToToggle.length = 0;
        resetTagMap.forEach(resetTagSet => resetTagValueAU.params.tagsToToggle.push(resetTagSet.uiTag));

        testTagReset({
            resetTagMap, resetTagValueAU, result, runner
        }, completeTest);

        function completeTest(errorStr?: string) {
            countResets++;
            if (errorStr || countResets === resetTagValueAU.params.tagsToToggle.length) {
                runner.abort();
                done(errorStr ? new Error(errorStr) : undefined);
            }
        }
    });

    it(`should fail "${TAG_NOT_FOUND_MESSAGE}"`, async () => {
        const resetTagValueAU = new ResetTagValueAU("checkTagValuesAU name", "actionSetId");

        await runner.run(resetTagValueAU, result);
        expect(result.error).to.be.equal(TAG_NOT_FOUND_MESSAGE);
    })

    it(`should fail on "Requested bit X is out of range for DT type"`, async () => {
        const resetTagValueAU = new ResetTagValueAU("checkTagValuesAU name", "actionSetId");
        const tagId = plcTagObj.int0.id;

        const tagToToggle = resetTagValueAU.params.tagsToToggle[0];
        tagToToggle.tagId = tagId;
        tagToToggle.toValue = 1;
        tagToToggle.bitNo = 20;

        const tag = abTagsMap.get(tagId);
        if (!tag) throw new Error("Tag not found, id " + tagId);

        for (const runner of runners) {
            await runner.run(resetTagValueAU, result);
            expect(result.error).to.be.equal(`Requested bit ${tagToToggle.bitNo} is out of range for ${tag.datatype} type`);
        }
    })

});


export interface IResetTagSet {
    count: number,
    remembered: number,
    uiTag: ModTagValueTimed
}

export interface ITestTagResetConfig {
    resetTagValueAU: ResetTagValueAU,
    resetTagMap: Map<string, IResetTagSet>,
    runner: ResetTagValuesRunner,
    result: AuResult,
}

export function testTagReset(
    config: ITestTagResetConfig,
    completeTest: (errorStr?: string) => void
) {
    const {resetTagValueAU, resetTagMap, runner, result} = config;

    const startedAt = Date.now();

    plc.fakeListener(flChannel.writeTag, (tag) => {
        for (const toggleTag of resetTagValueAU.params.tagsToToggle) {
            if (tag.id !== toggleTag.tagId) continue;

            const tagSet = resetTagMap.get(tag.id);
            if (!tagSet) return completeTest(`${tag.id} not found. tagsToToggle and resetTagMap mismatch!`);

            const value: number = (toggleTag.bitNo < 0) ? tag.value : LpUtils.testBit(tag.value, toggleTag.bitNo);
            const remembered = (toggleTag.bitNo < 0) ? tagSet.remembered : LpUtils.testBit(tagSet.remembered, toggleTag.bitNo);

            tagSet.count++;
            const diff = Math.round((Date.now() - startedAt) / 100) / 10;

            // console.log(tag.id, tagSet.count, diff, value);

            if (tagSet.count === 1) {
                try {
                    expect(diff).is.equal(0);
                    expect(value).is.equal(toggleTag.toValue);
                } catch (e) {
                    completeTest(e.message)
                }
            }

            if (tagSet.count === 2) {
                try {
                    expect(diff).is.equal(toggleTag.after_s);
                    expect(value).is.equal(remembered);
                } catch (e) {
                    completeTest(e.message)
                }
                completeTest();
            }
        }
    })

    runner.run(resetTagValueAU, result).then(() => {
        try {
            expect(result.error).to.be.equal("");
        } catch (e) {
            completeTest(e.message);
        }
    }).catch(e => completeTest(e.message));
}
