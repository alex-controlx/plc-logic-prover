import {specsConfig} from "./all-specs.config";
import {ACommonTag, ITagUI, ProtocolType} from "../../src/_common/interfaces";
import {
    ActionUnitType,
    CheckTagValue,
    IActionUnit,
    ModTagValueTimed,
} from "../../src/_common/action-unit";
import {EventEmitter} from "events";
import {LpUtils} from "../../src/_common/utils";
import {IController, IControllerProps} from "../_controllers/controller.interfaces";
import LoggerMP from "../services/logger-ep.service";
import {AbTag} from "../_controllers/cip-tag.class";

specsConfig.init();
const logger = new LoggerMP("SimulatedPLC");

export interface IPlcTag extends ITagUI {
    v: number,
}

export const plcTagObj: {[key: string]: IPlcTag} = {
    bool0: {id: "bool0", v:1, tagname: "BOOL_tagname", program: "", datatype: "BOOL", desc: "BOOL_tag"},
    sint0: {id: "sint0", v:11, tagname: "SINT_tagname", program: "", datatype: "SINT", desc: "SINT_tag"},
    int0: {id: "int0", v:-222, tagname: "INT_tagname", program: "", datatype: "INT", desc: "INT_tag"},
    dint0: {id: "dint0", v:3333, tagname: "DINT_tagname", program: "", datatype: "DINT", desc: "DINT_tag"}, // 110100000101 <- right is the first bit
    bool1: {id: "bool1", v:1, tagname: "BOOL_tagname", program: "prog1", datatype: "BOOL", desc: "BOOL_tag in prog1"},
    sint1: {id: "sint1", v:-11, tagname: "SINT_tagname", program: "prog1", datatype: "SINT", desc: "SINT_tag in prog1"},
    int1: {id: "int1", v:222, tagname: "INT_tagname", program: "prog1", datatype: "INT", desc: "INT_tag in prog1"},
    dint1: {id: "dint1", v:-3333, tagname: "DINT_tagname", program: "prog1", datatype: "DINT", desc: "DINT_tag in prog1"},
}

const originalPlcValues: Map<string, number> =
    new Map(
        Object.entries(plcTagObj).map( plcTagEntry => {
            const [tagId, plcTag] = plcTagEntry;
            return [tagId, plcTag.v];
        })
    );

export const abTagsMap = new Map<string, AbTag>(
    Object.entries(plcTagObj).map(plcTagEntry => {
        const [tagId, plcTag] = plcTagEntry;
        return [tagId, new AbTag(plcTag)];
    })
);


export const fakeInvalidTags: ITagUI[] = [
    {id: "tag1", tagname: "BOOL", program: "", datatype: "BOOL1", desc: "Description is here"}
];

export function setAuParams(actionUnit: IActionUnit) {
    function setTagsToCheck (index: number, tagId: string, toValue: number, bitNo = -1) {
        if (actionUnit.type !== ActionUnitType.CheckTagValue) throw new Error("AU should be CheckTagValue");

        const tagToCheck = actionUnit.params.tagsToCheck[index];
        if (!tagToCheck) throw new Error(`No param in CheckTagValue at position ${index}`);

        tagToCheck.tagId = tagId;
        tagToCheck.toValue = toValue;
        tagToCheck.bitNo = bitNo;
    }

    function addTagsToCheck(tagId: string, toValue: number, bitNo = -1) {
        if (actionUnit.type !== ActionUnitType.CheckTagValue) throw new Error("AU should be CheckTagValue");
        actionUnit.params.tagsToCheck.push(new CheckTagValue());
        setTagsToCheck(actionUnit.params.tagsToCheck.length - 1, tagId, toValue, bitNo)
    }

    function asNewTagsToCheck() {
        if (actionUnit.type !== ActionUnitType.CheckTagValue) throw new Error("AU should be CheckTagValue");
        actionUnit.params.tagsToCheck.length = 0;
        actionUnit.params.tagsToCheck.push(new CheckTagValue());
    }

    function setModTagValueTimed(index: number, tagId: string, fromValue: number, toValue: number, after_s: number, bitNo = -1) {
        if (actionUnit.type !== ActionUnitType.Heartbeat &&
            actionUnit.type !== ActionUnitType.ResetTagValue &&
            actionUnit.type !== ActionUnitType.UnitTest) throw new Error("AU should be Heartbeat | ResetTagValue | UnitTest");

        const tagToToggle = actionUnit.params.tagsToToggle[index];
        if (!tagToToggle) throw new Error(`No params in ModTagValueTimed at position ${index}`);

        tagToToggle.tagId = tagId;
        tagToToggle.toValue = toValue;
        tagToToggle.bitNo = bitNo;
        tagToToggle.fromValue = fromValue;
        tagToToggle.after_s = after_s;
    }

    function addModTagValueTimed(index: number, tagId: string, fromValue: number, toValue: number, after_s: number, bitNo = -1) {
        if (actionUnit.type !== ActionUnitType.Heartbeat &&
            actionUnit.type !== ActionUnitType.ResetTagValue &&
            actionUnit.type !== ActionUnitType.UnitTest) throw new Error("AU should be Heartbeat | ResetTagValue | UnitTest");

        const tagToToggle = actionUnit.params.tagsToToggle[index];
        if (!tagToToggle) throw new Error(`No params in ModTagValueTimed at position ${index}`);

        tagToToggle.tagId = tagId;
        tagToToggle.toValue = toValue;
        tagToToggle.bitNo = bitNo;
        tagToToggle.fromValue = fromValue;
        tagToToggle.after_s = after_s;
    }


    // @ts-ignore
    function setHeartbeatDuration(duration: number) {
        if (actionUnit.type !== ActionUnitType.Heartbeat) throw new Error("AU should be Heartbeat");
        actionUnit.params.duration_s = duration;
    }

    function asNewModTagValueTimed() {
        if (actionUnit.type !== ActionUnitType.Heartbeat &&
            actionUnit.type !== ActionUnitType.ResetTagValue &&
            actionUnit.type !== ActionUnitType.UnitTest) throw new Error("AU should be Heartbeat | ResetTagValue | UnitTest");
        actionUnit.params.tagsToToggle.length = 0;
        actionUnit.params.tagsToToggle.push(new ModTagValueTimed());
    }


    return {
        setTagToCheck: setTagsToCheck,
        addTagToCheck: addTagsToCheck,
        asNewTagsToCheck: asNewTagsToCheck,

        setModTagValueTimed: setModTagValueTimed,
        addModTagValueTimed: addModTagValueTimed,
        asNewModTagValueTimed: asNewModTagValueTimed,
    }
}



export enum flChannel {
    writeTag = "writeTag"
}

const DEFAULT_SCAN_RATE_ms = 100

export class FakeController implements IController {
    type = ProtocolType.FAKE;
    ipAddress: string = "192.168.1.1";
    isConnected: boolean = true;
    isScanning: boolean = false;
    timeout: number = 1000;

    event = new EventEmitter();

    fakeListener(channel: flChannel, callback: (tag: ACommonTag) => void) {
        this.event.addListener(channel, callback);
    }
    removeAllFakeListeners() {
        this.event.removeAllListeners(flChannel.writeTag);
    }

    closeConnection(): void {}

    getProperties(): IControllerProps {
        return {name: "FakeController", version: "0.0.0", isFaulted: false};
    }

    openConnection(ipAddress: string, timeout: number): Promise<any> {
        logger.log("FakeController.openConnection to " + ipAddress + " with timeout " + timeout);
        return Promise.resolve(undefined);
    }

    async readTag(tag: ACommonTag): Promise<void> {
        // @ts-ignore
        const plcTag = plcTagObj[tag.id];
        if (!plcTag) throw new Error("Tag does not exist in PLC");
        setScanChanges();

        tag.fromValue = tag.value;
        tag.value = plcTag.v;

        return Promise.resolve(undefined);
    }

    async readTags(tags: Map<string, ACommonTag>): Promise<void> {
        for (const [_, tag] of tags.entries())
            await this.readTag(tag);

        return Promise.resolve(undefined);
    }

    async scan(tags: Map<string, ACommonTag>, eachScanCallback: () => void): Promise<void> {
        if (this.isScanning) throw new Error("Scan function is already running. Call stopScan() first.");

        this.isScanning = true;

        return new Promise( async (resolve, reject) => {
            while (this.isScanning) {
                try {

                    await this.readTags(tags);
                    eachScanCallback();

                    await LpUtils.sleep(DEFAULT_SCAN_RATE_ms);

                } catch (e) {
                    reject(e)
                }
            }
            resolve();
        })
    }

    stopScan(): void {
        this.isScanning = false;
        clearScanChanges();
    }

    writeTag(tag: ACommonTag): Promise<void> {
        tag.value = tag.toValue;
        this.event.emit(flChannel.writeTag, tag);
        return Promise.resolve(undefined);
    }

    writeTags(tags: Map<string, ACommonTag>): Promise<void> {
        for (const [_, tag] of tags.entries()) {
            tag.value = tag.toValue;
            this.event.emit(flChannel.writeTag, tag);
        }
        return Promise.resolve(undefined);
    }
}





const scanChanges: ModTagValueTimed[] = [];
let scanStartedAt = Date.now();
let scanChangesDelay_ms = 0;

function setScanChanges() {
    if (!scanChanges.length) return;

    for (const expectedChange of scanChanges) {
        if (isPlcValueChanged(expectedChange.tagId)) continue;

        const elapsedTime = Date.now() - scanStartedAt;
        const expectedDelay = expectedChange.after_s * 1000 + scanChangesDelay_ms;

        if (elapsedTime > expectedDelay) {
            logger.log(`Changing ${expectedChange.tagId} after ${elapsedTime}ms` +
                ` [set ${expectedChange.after_s * 1000}ms + ${scanChangesDelay_ms}ms]`);

            valueChange(expectedChange.tagId, expectedChange.toValue, expectedChange.bitNo);
        }
    }
}

function clearScanChanges() {
    scanChanges.length = 0;
    for (const [tagId, originalValue] of originalPlcValues) {
        if (plcTagObj[tagId]) plcTagObj[tagId].v = originalValue;
    }
}

function isPlcValueChanged(tagId: string): boolean {
    return originalPlcValues.get(tagId) !== plcTagObj[tagId].v;
}

function valueChange(tagId: string, toValue: number, bitNo: number) {
    const plcTag = plcTagObj[tagId];
    if (!plcTag) throw new Error("Simulated PLC doesn't have tag with ID " + tagId);

    const prevValue = plcTag.v;
    if (bitNo < 0) {
        plcTag.v = toValue;
    } else {
        plcTag.v = (toValue) ?
            LpUtils.setBit(plcTag.v, bitNo) : LpUtils.clearBit(plcTag.v, bitNo);
    }

    logger.log(`Changed ${tagId} from ${prevValue} to ${plcTag.v}` +
        ((bitNo < 0) ? "" : ` [val:${toValue}, bit:${bitNo}]`));
}

export function simulateValueChange(expectedChanges: ModTagValueTimed[], delay_ms: number) {
    scanStartedAt = Date.now();
    scanChanges.length = 0;
    scanChanges.push(...expectedChanges);
    scanChangesDelay_ms = delay_ms;
}

export class SimulatedPLC {
    public intervals: NodeJS.Timeout[] = [];

    public registerScanChange(expectedChanges: ModTagValueTimed[], delay_ms: number) {
        scanStartedAt = Date.now();
        scanChanges.length = 0;
        scanChanges.push(...expectedChanges);
        scanChangesDelay_ms = delay_ms;
    }

    // public groupValueChangeOnce(expectedChanges: ModTagValueTimed[], delay_ms: number) {
    //     const startedAt = Date.now();
    //
    //     const intervalId = setInterval(() => {
    //         for (const expectedChange of expectedChanges) {
    //             if (this.isPlcValueChanged(expectedChange.tagId)) continue;
    //
    //             const elapsedTime = Date.now() - startedAt;
    //             const expectedDelay = expectedChange.after_s * 1000 + delay_ms;
    //
    //             if (elapsedTime > expectedDelay) {
    //                 logger.log(`Changing ${expectedChange.tagId} after ${elapsedTime}ms` +
    //                     ` [set ${expectedChange.after_s * 1000}ms + ${delay_ms}ms]`);
    //
    //                 this.valueChange(expectedChange.tagId, expectedChange.toValue, expectedChange.bitNo);
    //             }
    //         }
    //     }, 50);
    //
    //     this.intervals.push(intervalId);
    // }

    // public valueChange(tagId: string, toValue: number, bitNo: number) {
    //     const plcTag = plcTagObj[tagId];
    //     if (!plcTag) throw new Error("Simulated PLC doesn't have tag with ID " + tagId);
    //
    //     const prevValue = plcTag.v;
    //     if (bitNo < 0) {
    //         plcTag.v = toValue;
    //     } else {
    //         plcTag.v = (toValue) ?
    //             LpUtils.setBit(plcTag.v, bitNo) : LpUtils.clearBit(plcTag.v, bitNo);
    //     }
    //
    //     logger.log(`Changed ${tagId} from ${prevValue} to ${plcTag.v}` +
    //         ((bitNo < 0) ? "" : ` [val:${toValue}, bit:${bitNo}]`));
    // }

    // public renewState() {
    //     for (const intervalId of this.intervals) clearInterval(intervalId);
    //
    //     for (const [tagId, originalValue] of originalPlcValues) {
    //         if (plcTagObj[tagId]) plcTagObj[tagId].v = originalValue;
    //     }
    // }
    //
    // public isPlcValueChanged(tagId: string): boolean {
    //     return originalPlcValues.get(tagId) !== plcTagObj[tagId].v;
    // }
}
