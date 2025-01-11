import {FakeController, abTagsMap, flChannel, plcTagObj, setAuParams} from "../../__tests__/simulated_plc";
import {AuResult} from "../../../src/_common/interfaces/result.class";
import HeartBeatRunner from "./heartbeat-au.ep-class";
import {HeartbeatAU, ModTagValueTimed} from "../../../src/_common/action-unit";
import {expect} from "chai";
import {LpUtils} from "../../../src/_common/utils";

const fakePlc = new FakeController();

describe("Testing HeartBeatRunner, be patient... ~10sec", () => {
    const runners: HeartBeatRunner[] = [new HeartBeatRunner(fakePlc, abTagsMap)];

    const actionSetId = "as1id";
    const result = new AuResult("result name", "result name");

    beforeEach(() => result.handleFail(""));

    afterEach( () => fakePlc.removeAllFakeListeners());

    it(`should run heartbeat for 5 times of each ToggleConfig`, function(done) {
        // @ts-ignore
        this.timeout(15000);
        const hbAu1 = new HeartbeatAU("hbAu1", actionSetId);
        runHeartbeatTest(fakePlc, hbAu1, runners[0], result, done, 5);
    });

    it(`should run heartbeat and stop after 3 second (+1 second to confirm no pulses)`, function(done) {
        // @ts-ignore
        this.timeout(10000);
        const hbAu2 = new HeartbeatAU("hbAu2", actionSetId);
        runHeartbeatTest(fakePlc, hbAu2, runners[0], result, done, 100, 3);
    });

    it(`should fail on "Heartbeat pulse must be greater or equal than 0.5s, but got 0.2s"`, async () => {
        const heartbeatAU = new HeartbeatAU("HeartbeatAU", actionSetId);

        heartbeatAU.params.tagsToToggle.length = 0;
        heartbeatAU.params.tagsToToggle.push(
            {tagId: plcTagObj.bool0.id, fromValue: 0, toValue: 1, after_s: 0.2, bitNo: 0}
        );

        for (const runner of runners) {
            await runner.run(heartbeatAU, result);
            expect(result.error).to.be.equal("Heartbeat pulse must be greater or equal than 0.5s, but got 0.2s");
        }
    });

    it(`should fail with message "A heartbeat tag was not selected"`, async () => {
        const heartbeatAU = new HeartbeatAU("HeartbeatAU", actionSetId);
        heartbeatAU.params.tagsToToggle.length = 0;
        heartbeatAU.params.tagsToToggle.push(
            {tagId: "", fromValue: 0, toValue: 1, after_s: 0.5, bitNo: 0}
        );
        // setAuParams(heartbeatAU).setModTagValueTimed(0, "", 0, 1, 0.5);

        for (const runner of runners) {
            await runner.run(heartbeatAU, result);
            expect(result.error).to.be.equal("A heartbeat tag was not selected");
        }
    })

    it(`should fail with message "Heartbeat from and to values must not be equal"`, async () => {
        const heartbeatAU = new HeartbeatAU("HeartbeatAU", actionSetId);
        heartbeatAU.params.tagsToToggle.length = 0;
        heartbeatAU.params.tagsToToggle.push(
            {tagId: plcTagObj.int0.id, fromValue: 1, toValue: 1, after_s: 0.5, bitNo: 0}
        );
        // setAuParams(heartbeatAU).setModTagValueTimed(0, plcTagObj.int0.id, 1, 1, 0.5);

        for (const runner of runners) {
            await runner.run(heartbeatAU, result);
            expect(result.error).to.be.equal("Heartbeat from and to values must not be equal");
        }
    })

    // TODO create the mechanism described below
    // this tes will never PASS as this error comes from unhandled promise rejection.
    // We need a specific mechanism to bring this error back to user. No time for this now. Come back later!
    it(`should fail on "Requested bit X is out of range for DT type"`, async () => {
        const tagId = plcTagObj.int0.id;

        const heartbeatAU = new HeartbeatAU("HeartbeatAU", actionSetId);
        heartbeatAU.params.tagsToToggle.length = 0;
        heartbeatAU.params.tagsToToggle.push(
            {tagId, fromValue: 0, toValue: 1, after_s: 0.5, bitNo: 20}
        );
        // setAuParams(heartbeatAU).setModTagValueTimed(0, tagId, 0, 1, 0.5, 20);
        const tagToCheck = heartbeatAU.params.tagsToToggle[0];
        const tag = abTagsMap.get(tagId);
        if (!tag) throw new Error("Tag not found, id " + tagId);

        for (const runner of runners) {
            await runner.run(heartbeatAU, result);
            expect(result.error).to.be.equal(`Requested bit ${tagToCheck.bitNo} is out of range for ${tag.datatype} type`);
        }
    })

})

function runHeartbeatTest(
    plc: FakeController,
    heartbeatAU: HeartbeatAU,
    runner: HeartBeatRunner,
    result: AuResult,
    done: (error?: Error) => void,
    maxCount?: number,
    duration_s?: number,
    )
{
    let heartbeatSetCount = 0;
    maxCount = maxCount || 5;
    const startedAt = Date.now();

    const heartbeatSets = new Map([
        [
            plcTagObj.bool0.id,
            {
                tagId: plcTagObj.bool0.id,
                fromValue: 0,
                toValue: 1,
                duration_s: 0.5,
                bitNo: -1,
                isFromTo: true,
                count: 0
            }
        ],
        [
            plcTagObj.dint0.id,
            {
                tagId: plcTagObj.dint0.id,
                fromValue: 123,
                toValue: 14312,
                bitNo: -1,
                duration_s: 0.8,
                isFromTo: true,
                count: 0
            }
        ],
        [
            plcTagObj.int0.id,
            {
                tagId: plcTagObj.int0.id,
                fromValue: 0,
                toValue: 1,
                bitNo: 3,
                duration_s: 0.7,
                isFromTo: true,
                count: 0
            }
        ]
    ]);

    if (duration_s) heartbeatAU.params.duration_s = duration_s;

    heartbeatAU.params.tagsToToggle.length = 0;
    for (const [key, heartbeatSet] of heartbeatSets.entries()) {
        const tagToToggle = new ModTagValueTimed();

        tagToToggle.tagId = heartbeatSet.tagId;
        tagToToggle.toValue = heartbeatSet.toValue;
        tagToToggle.bitNo = heartbeatSet.bitNo;
        tagToToggle.fromValue = heartbeatSet.fromValue;
        tagToToggle.after_s = heartbeatSet.duration_s;
        heartbeatAU.params.tagsToToggle.push(tagToToggle);
    }

    plc.fakeListener(flChannel.writeTag, (tag) => {

        for (const toggleTag of heartbeatAU.params.tagsToToggle) {
            if (tag.id !== toggleTag.tagId) continue;

            const heartbeatSet = heartbeatSets.get(tag.id);
            if (!heartbeatSet) throw new Error("Something went wrong!");

            const {isFromTo} = heartbeatSet;

            // DO NOT DELETE BELOW - this is for testing  the logic. It overrides the value so the test will fail
            // if (heartbeatSet.count === 5) tag.value = 1;

            const value: number = (toggleTag.bitNo < 0) ? tag.value : LpUtils.testBit(tag.value, toggleTag.bitNo);
            // console.log(tag.id, toggleTag.bitNo < 0 ? tag.value : `bit ${toggleTag.bitNo} is ${value} of ${tag.value}`);

            if ((isFromTo && value !== toggleTag.toValue) || (!isFromTo && value !== toggleTag.fromValue)) {
                completedRunner(`Value of ${tag.id} is ${value} when expected ` +
                    `${isFromTo ? toggleTag.toValue : toggleTag.fromValue} at ` +
                    runner.plc.getProperties().name);
                break;
            }

            heartbeatSet.count++;
            heartbeatSet.isFromTo = !heartbeatSet.isFromTo;

            if (duration_s && ((Date.now() - startedAt) > (duration_s * 1000)))
                completedRunner("Heartbeat is going over duration setpoint " + duration_s + "s");

            if (heartbeatSet.count === maxCount) completedRunner();
        }
    });

    runner.run(heartbeatAU, result).then(() => {
        expect(result.error).to.be.equal("");
    }).catch((e) => {
        runner.abort();
        done(e);
    });

    let timeoutId: NodeJS.Timeout;
    if (duration_s) {
        timeoutId = setTimeout(() => {
            heartbeatSetCount = heartbeatSets.size - 1;
            completedRunner();
        }, (duration_s + 1) * 1000);
    }

    function completedRunner(errorStr?: string) {
        heartbeatSetCount++;
        if (heartbeatSetCount === heartbeatSets.size || errorStr) {
            runner.abort();
            if (timeoutId) clearTimeout(timeoutId);
            done(errorStr ? new Error(errorStr) : undefined);
        }
    }
}
