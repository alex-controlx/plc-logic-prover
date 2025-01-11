import {AbTag} from "./cip-tag.class";
import {EthernetIP, ICipControllerProps, ICommonPacketData, IMessageRouterObject, util} from "ethernet-ip";
import {isIPv4} from "net";
import {LpUtils} from "../../src/_common/utils";
import LoggerMP from "../services/logger-ep.service";
import {TaskEasy} from "../_shared/task-easy.class";
import {IController, IControllerProps} from "./controller.interfaces";
import {ProtocolType} from "../../src/_common/interfaces";

const CIP = EthernetIP.CIP;

const logger = new LoggerMP("CipController");
const { promiseTimeout } = util;
const { READ_TAG, WRITE_TAG, READ_MODIFY_WRITE_TAG, MULTIPLE_SERVICE_PACKET } = CIP.MessageRouter.services;
const { getTypeCodeString } = EthernetIP.CIP.DataTypes;
const { LOGICAL } = CIP.EPATH.segments;

const DEFAULT_SIZE = 0x01;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_SCAN_RATE_ms = 100; // tested minimum 50
const MAX_QUEUE_SIZE = 100;

interface IMultiPacketMessage {
    data: Buffer,
    tagIds: string[]
}

interface IPriority {
    priority: number;
    timestamp: number;
}
const compare = (obj1: IPriority, obj2: IPriority) => {
    if (obj1.priority > obj2.priority) return true;
    else if (obj1.priority < obj2.priority) return false;
    else return obj1.timestamp < obj2.timestamp;
};

export class CipController extends EthernetIP.ENIP implements IController {
    private groupQueue: TaskEasy<IPriority>;
    public readonly type = ProtocolType.CIP;

    get isScanning(): boolean {
        return this._isScanning;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    // get timeout(): number {
    //     return this._timeout;
    // }

    get ipAddress(): string {
        return (this._ipAddress) ? this._ipAddress : "";
    }

    private _ipAddress?: string;
    private _timeout: number = 10000;
    private _isConnected: boolean = false;
    private _isScanning: boolean = false;


    private slot: number = 0;
    private controllerPath?: Buffer;
    private controllerProps?: ICipControllerProps;
    private multiPacketPath: Buffer = Buffer.concat([
        LOGICAL.build(LOGICAL.types.ClassID, 0x02), // Message Router Class ID (0x02)
        LOGICAL.build(LOGICAL.types.InstanceID, 0x01) // Instance ID (0x01)
    ]);

    constructor(queueDelay: number) {
        super();
        this.groupQueue = new TaskEasy(compare, queueDelay, MAX_QUEUE_SIZE);
    }



    public async readTag(tag: AbTag): Promise<void>  {
        return this.groupQueue.schedule(this.readTagInQueue, [tag], {
            priority: 1,
            timestamp: Date.now()
        });
    }

    private readTagInQueue = async (tag: AbTag): Promise<void> => {

        const MR = this.generateReadMessageRequest(tag.path, DEFAULT_SIZE);

        this.writeUnconnectedCip(MR);

        const readTagErr = new Error(`TIMEOUT occurred while writing Reading Tag ${tag.fullName}.`);

        // Wait for Response
        const data = await promiseTimeout(
            new Promise((resolve, reject) => {
                this.on("Read Tag", (err, data) => {
                    if (err) reject(generateError(err, tag.fullName));
                    resolve(data);
                });
            }),
            DEFAULT_TIMEOUT,
            readTagErr
        );
        this.removeAllListeners("Read Tag");

        try {
            this.parseReadMessageResponse(tag, data);
        } catch (e) {
            logger.error(e);
        }
    }

    public async writeTag(tag: AbTag): Promise<void> {
        return this.groupQueue.schedule(this.writeTagInQueue, [tag], {
            priority: 1,
            timestamp: Date.now()
        });
    }

    private writeTagInQueue = async (tag: AbTag): Promise<void> => {
        logger.log(`Writing ${tag.fullName} to value ${tag.toValue}`);
        const MR = this.generateWriteMessageRequest(tag, DEFAULT_SIZE);

        this.writeUnconnectedCip(MR);

        const writeTagErr = new Error(`TIMEOUT occurred while writing Writing Tag ${tag.fullName}.`);

        // Wait for Response
        await promiseTimeout(
            new Promise((resolve, reject) => {

                // Full Tag Writing
                this.on("Write Tag", (err, data) => {
                    if (err) reject(generateError(err, tag.fullName));

                    tag.value = tag.toValue;
                    resolve(data);
                });

                // Masked Bit Writing
                this.on("Read Modify Write Tag", (err, data) => {
                    if (err) reject(generateError(err, tag.fullName));

                    tag.value = tag.toValue;
                    resolve(data);
                });
            }),
            DEFAULT_TIMEOUT,
            writeTagErr
        );

        this.removeAllListeners("Write Tag");
        this.removeAllListeners("Read Modify Write Tag");
    }


    /**
     * @description Reads values of the tag and saves om .fromValue property
     * @param tags
     */
    public async readTags(tags: Map<string, AbTag>): Promise<void> {
        return this.groupQueue.schedule(this.readTagsInQueue, [tags], {
            priority: 2,
            timestamp: Date.now()
        });
    }

    private readTagsInQueue = async (tags: Map<string, AbTag>): Promise<void> => {
        const messages = this.generateMultiMessageRequests(tags, false);

        const readTagGroupErr = new Error("TIMEOUT occurred while writing Reading Tag Group.");

        // Send Each Multi Service Message
        for (const msg of messages) {
            this.writeUnconnectedCip(msg.data);

            // Wait for Controller to Respond
            const responses: IMessageRouterObject[] = await promiseTimeout(
                new Promise((resolve, reject) => {
                    this.on("Multiple Service Packet", (err, data) => {
                        if (err) reject(generateError(err));

                        resolve(data);
                    });
                }),
                DEFAULT_TIMEOUT,
                readTagGroupErr
            );

            this.removeAllListeners("Multiple Service Packet");

            // Parse Messages
            this.parseReadMessageResponses(tags, responses, msg.tagIds);
        }
    }

    public async writeTags(tags: Map<string, AbTag>): Promise<void> {
        return this.groupQueue.schedule(this.writeTagsInQueue, [tags], {
            priority: 1,
            timestamp: Date.now()
        });
    }

    private writeTagsInQueue = async (tags: Map<string, AbTag>): Promise<void> => {
        const messages = this.generateMultiMessageRequests(tags, true);

        const writeTagGroupErr = new Error("TIMEOUT occurred while writing Writing Tag Group.");

        // Send Each Multi Service Message
        for (const msg of messages) {
            this.writeUnconnectedCip(msg.data);

            // Wait for Controller to Respond
            await promiseTimeout(
                new Promise((resolve, reject) => {
                    this.on("Multiple Service Packet", (err, data) => {
                        if (err) reject(generateError(err));

                        resolve(data);
                    });
                }),
                DEFAULT_TIMEOUT,
                writeTagGroupErr
            );

            this.removeAllListeners("Multiple Service Packet");

            this.parseWriteMessageRequests(tags, msg.tagIds);
        }
    }

    /**
     * @description scanStarted() called after first read when all tag fromValue equalled to read values.
     * When all memory tag values are the same as in the controller we start detecting the change.
     *
     * After the firstScan it loops over tag reads. On completion of every read it calls eachScanCallback()
     */
    public async scan(tags: Map<string, AbTag>, eachScanCallback: () => void): Promise<void> {
        if (this._isScanning) throw new Error("Scan function is already running. Call stopScan() first.");

        this._isScanning = true;

        return new Promise( async (resolve, reject) => {
            while (this._isScanning) {
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

    public stopScan() {
        this._isScanning = false;
    }

    public async openConnection(ipAddress: string, timeout: number, cpuSlot?: number) {
        if (!isIPv4(ipAddress)) throw new Error(`Provided address ${ipAddress} is NOT an IP address.`);

        this._timeout = timeout;

        const { PORT } = CIP.EPATH.segments;
        const BACKPLANE = 1;

        this.slot = cpuSlot || 0;
        this.controllerPath = PORT.build(BACKPLANE, this.slot);

        const sessionId = await super.connect(ipAddress);

        if (!sessionId) throw new Error("Failed to Register Session with Controller");

        // Initialized Controller Specific Event Handlers
        this.on("SendRRData Received", this.handleSendRRDataReceived);

        // Fetch Controller Properties and Wall Clock ICipControllerProps
        await this.readControllerProps();
        this._isConnected = true;
    }

    public closeConnection() {
        logger.log('Disconnecting from PLC');
        this._isConnected = false;

        if (!this.destroyed) {
            logger.log('Removing PLC connection from memory');
            this.destroy();
            this.removeListener("error", this.closeConnection);
            this.removeListener("end", this.closeConnection);
        }
    }

    public getProperties(): IControllerProps {
        if (this.controllerProps) {
            return {
                name: this.controllerProps.name,
                version: this.controllerProps.version,
                isFaulted: this.controllerProps.faulted,
            }
        }

        return {
            name: "Controller not connected",
            version: "Controller not connected",
            isFaulted: true,
        }
    }






    // --------------------------------------------- PRIVATE METHODS ---------------------------------------------


    /**
     * Writes Ethernet/IP Data to Socket as an Unconnected Message
     * or a Transport Class 1 Datagram
     *
     * NOTE: Cant Override Socket Write due to net.Socket.write
     *        implementation. =[. Thus, I am spinning up a new Method to
     *        handle it. Dont Use Enip.write, use this function instead.
     */
    private writeUnconnectedCip(data: Buffer) {
        if (this.destroyed || !this.controllerPath) throw new Error("Controller cannot write cip data, could be not connected yet.");

        const { UnconnectedSend } = CIP;

        const msg = UnconnectedSend.build(data, this.controllerPath);

        //TODO: Implement Connected Version
        super.write_cip(msg, false, 10);
    }

    /**
     * Handles SendRRData Event Emitted by Parent and Routes
     * incoming Message
     */
    private handleSendRRDataReceived(srrd: ICommonPacketData[]) {
        const { service, generalStatusCode, extendedStatus, data } = CIP.MessageRouter.parse(
            srrd[1].data
        );

        const {
            GET_ATTRIBUTE_SINGLE,
            GET_ATTRIBUTE_ALL,
            SET_ATTRIBUTE_SINGLE,
            READ_TAG,
            READ_TAG_FRAGMENTED,
            WRITE_TAG,
            WRITE_TAG_FRAGMENTED,
            READ_MODIFY_WRITE_TAG,
            MULTIPLE_SERVICE_PACKET
        } = CIP.MessageRouter.services;

        let error = generalStatusCode !== 0 ? { generalStatusCode, extendedStatus } : null;

        // Route Incoming Message Responses
        switch (service - 0x80) {
            case GET_ATTRIBUTE_SINGLE:
                this.emit("Get Attribute Single", error, data);
                break;
            case GET_ATTRIBUTE_ALL:
                this.emit("Get Attribute All", error, data);
                break;
            case SET_ATTRIBUTE_SINGLE:
                this.emit("Set Attribute Single", error, data);
                break;
            case READ_TAG:
                this.emit("Read Tag", error, data);
                break;
            case READ_TAG_FRAGMENTED:
                this.emit("Read Tag Fragmented", error, data);
                break;
            case WRITE_TAG:
                this.emit("Write Tag", error, data);
                break;
            case WRITE_TAG_FRAGMENTED:
                this.emit("Write Tag Fragmented", error, data);
                break;
            case READ_MODIFY_WRITE_TAG:
                this.emit("Read Modify Write Tag", error, data);
                break;
            case MULTIPLE_SERVICE_PACKET: {
                // If service errored then propogate error
                if (error) {
                    this.emit("Multiple Service Packet", error, data);
                    break;
                }

                // Get Number of Services to be Enclosed
                let services = data.readUInt16LE(0);
                let offsets = [];
                let responses: IMessageRouterObject[] = [];

                // Build Array of Buffer Offsets
                for (let i = 0; i < services; i++) {
                    offsets.push(data.readUInt16LE(i * 2 + 2));
                }

                // Gather Messages within Buffer
                for (let i = 0; i < offsets.length - 1; i++) {
                    const length = offsets[i + 1] - offsets[i];

                    let buf = Buffer.alloc(length);
                    data.copy(buf, 0, offsets[i], offsets[i + 1]);

                    // Parse Message Data
                    const msgData = CIP.MessageRouter.parse(buf);

                    if (msgData.generalStatusCode !== 0) {
                        error = {
                            generalStatusCode: msgData.generalStatusCode,
                            extendedStatus: msgData.extendedStatus
                        };
                    }

                    responses.push(msgData);
                }

                // Handle Final Message
                const length = data.length - offsets[offsets.length - 1];

                let buf = Buffer.alloc(length);
                data.copy(buf, 0, offsets[offsets.length - 1]);

                const msgData = CIP.MessageRouter.parse(buf);

                if (msgData.generalStatusCode !== 0) {
                    error = {
                        generalStatusCode: msgData.generalStatusCode,
                        extendedStatus: msgData.extendedStatus
                    };
                }

                responses.push(msgData);

                this.emit("Multiple Service Packet", error, responses);
                break;
            }
            default:
                this.emit("Unknown Reply", { generalStatusCode: 0x99, extendedStatus: [] }, data);
                break;
        }
    }


    private async readControllerProps() {
        const { GET_ATTRIBUTE_ALL } = CIP.MessageRouter.services;
        const { LOGICAL } = CIP.EPATH.segments;

        // Build Identity Object Logical Path Buffer
        const identityPath = Buffer.concat([
            LOGICAL.build(LOGICAL.types.ClassID, 0x01), // Identity Object (0x01)
            LOGICAL.build(LOGICAL.types.InstanceID, 0x01) // Instance ID (0x01)
        ]);

        // Message Router to Embed in UCMM
        const MR = CIP.MessageRouter.build(GET_ATTRIBUTE_ALL, identityPath, []);

        this.writeUnconnectedCip(MR);

        const readPropsErr = new Error("TIMEOUT occurred while reading Controller Props.");

        // Wait for Response
        const data = await promiseTimeout(
            new Promise((resolve, reject) => {
                this.on("Get Attribute All", (err, data) => {
                    if (err) reject(generateError(err));
                    resolve(data);
                });
            }),
            DEFAULT_TIMEOUT,
            readPropsErr
        );

        this.removeAllListeners("Get Attribute All");


        // Parse Returned Buffer
        const nameBuf = Buffer.alloc(data.length - 15);
        data.copy(nameBuf, 0, 15);

        const major = data.readUInt8(6);
        const minor = data.readUInt8(7);

        let status = data.readUInt16LE(8);

        status &= 0x0ff0;
        let faulted = (status & 0x0f00) !== 0;
        const minorRecoverableFault = (status & 0x0100) !== 0;
        const minorUnrecoverableFault = (status & 0x0200) !== 0;
        const majorRecoverableFault = (status & 0x0400) !== 0;
        const majorUnrecoverableFault = (status & 0x0800) !== 0;

        status &= 0x0f00;
        const io_faulted = (status >> 4 === 2);
        faulted = (status >> 4 === 2) ? true : faulted;

        this.controllerProps = {
            serial_number: data.readUInt32LE(10),
            name: nameBuf.toString("utf8"),
            version: `${major}.${minor}`,
            status: data.readUInt16LE(8),

            minorRecoverableFault: minorRecoverableFault,
            minorUnrecoverableFault: minorUnrecoverableFault,
            majorRecoverableFault: majorRecoverableFault,
            majorUnrecoverableFault: majorUnrecoverableFault,

            io_faulted: io_faulted,
            faulted: faulted,
            path: (this.controllerPath) ? this.controllerPath : Buffer.from([]),
            slot: this.slot,
            time: "",
        }
    }

    /**
     * Generates Read Tag Message
     */
    private generateReadMessageRequest(tagPath: Buffer, size: number): Buffer {

        // Build Message Router to Embed in UCMM
        let buf = Buffer.alloc(2);
        buf.writeUInt16LE(size, 0);

        // Build Current Message
        return CIP.MessageRouter.build(READ_TAG, tagPath, buf);
    }

    /**
     *  Parses Good Read Request Messages
     */
    private parseReadMessageResponse(tag: AbTag, data: Buffer) {
        const { SINT, INT, DINT, REAL, BOOL } = CIP.DataTypes.Types;
        const fractional = 4;

        tag.cipDataType = data.readUInt16LE(0);
        tag.fromValue = tag.value;
        let value: number;
        // Read Tag Value
        switch (tag.cipDataType) {
            case SINT:  value = data.readInt8(2); break;
            case INT:   value = data.readInt16LE(2); break;
            case DINT:  value = data.readInt32LE(2); break;
            case REAL:
                // Leaving only 4 fractional digits after the decimal point
                value = Math.round(data.readFloatLE(2) * Math.pow(10,fractional)) / Math.pow(10,fractional);
                break;
            case BOOL:
                value = (data.readUInt8(2) !== 0) ? 1 : 0; break;
            default:
                throw new Error(`Unrecognized Type Passed Read from Controller: ${getTypeCodeString(tag.cipDataType)}`);
        }

        if (tag.bitIndex < 0) tag.value = value;
        else {
            tag.value = (value & (1 << tag.bitIndex)) === 0 ? 0 : 1
        }
        logger.log(`Read ${tag.fullName} value ${tag.value} [last was ${tag.fromValue}]`);
    }

    /**
     * Parse Incoming Multi Service Request Messages
     */
    private parseReadMessageResponses(tags: Map<string, AbTag>, responses: IMessageRouterObject[], tagIds: string[]) {
        tagIds.forEach((tagId, index) => {
            const tag = tags.get(tagId);
            if (tag) {
                this.parseReadMessageResponse(tag, responses[index].data)
            }
        })
    }

    private generateWriteMessageRequest(tag: AbTag, size: number): Buffer {

        if (tag.bitIndex < 0) return this.generateWriteMessageRequestForAtomic(tag, size);
        else return this.generateWriteMessageRequestForBitIndex(tag);
    }

    private generateWriteMessageRequestForBitIndex(tag: AbTag): Buffer {
        const { SINT, INT, DINT, BIT_STRING } = CIP.DataTypes.Types;

        // Build Message Router to Embed in UCMM
        let buf;

        switch (tag.cipDataType) {
            case SINT:
                buf = Buffer.alloc(4);
                buf.writeInt16LE(1, 0); //mask length
                buf.writeUInt8(tag.toValue ? 1 << tag.bitIndex : 0, 2); // or mask
                buf.writeUInt8(tag.toValue ? 255 : 255 & ~(1 << tag.bitIndex), 3); // and mask
                break;
            case INT:
                buf = Buffer.alloc(6);
                buf.writeInt16LE(2, 0); //mask length
                buf.writeUInt16LE(tag.toValue ? 1 << tag.bitIndex : 0, 2); // or mask
                buf.writeUInt16LE(tag.toValue ? 65535 : 65535 & ~(1 << tag.bitIndex), 4); // and mask
                break;
            case DINT:
            case BIT_STRING:
                buf = Buffer.alloc(10);
                buf.writeInt16LE(4, 0); //mask length
                buf.writeInt32LE(tag.toValue ? 1 << tag.bitIndex : 0, 2); // or mask
                buf.writeInt32LE(tag.toValue ? -1 : -1 & ~(1 << tag.bitIndex), 6); // and mask
                break;
            default:
                throw new Error(
                    "Bit Indexes can only be used on SINT, INT, DINT, or BIT_STRING data types."
                );
        }

        // Build Current Message
        return CIP.MessageRouter.build(READ_MODIFY_WRITE_TAG, tag.path, buf);
    }

    private generateWriteMessageRequestForAtomic(tag: AbTag, size: number): Buffer {
        const { SINT, INT, DINT, REAL, BOOL } = CIP.DataTypes.Types;

        // Build Message Router to Embed in UCMM
        let buf = Buffer.alloc(4);
        let valBuf;
        buf.writeUInt16LE(tag.cipDataType, 0);
        buf.writeUInt16LE(size, 2);

        switch (tag.cipDataType) {
            case SINT:
                valBuf = Buffer.alloc(1);
                valBuf.writeInt8(tag.toValue, 0);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case INT:
                valBuf = Buffer.alloc(2);
                valBuf.writeInt16LE(tag.toValue, 0);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case DINT:
                valBuf = Buffer.alloc(4);
                valBuf.writeInt32LE(tag.toValue, 0);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case REAL:
                valBuf = Buffer.alloc(4);
                valBuf.writeFloatLE(tag.toValue, 0);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case BOOL:
                valBuf = Buffer.alloc(1);
                if (tag.toValue) valBuf.writeInt8(1, 0);
                else valBuf.writeInt8(0, 0);

                buf = Buffer.concat([buf, valBuf]);
                break;
            default:
                throw new Error(`Unrecognized Type to Write to Controller: ${getTypeCodeString(tag.cipDataType)}`);
        }

        // Build Current Message
        return CIP.MessageRouter.build(WRITE_TAG, tag.path, buf);
    }

    private parseWriteMessageRequests(tags: Map<string, AbTag>, tagIds: string[]) {
        tagIds.forEach((tagId, index) => {
            const tag = tags.get(tagId);
            if (tag) tag.value = tag.toValue;
        })
    }


    private generateMultiMessageRequests(tags: Map<string, AbTag>, isWriteRequests: boolean): IMultiPacketMessage[] {

        // Initialize Variables
        const messages: IMultiPacketMessage[] = [];
        const msgRequests: Buffer[] = [];
        const tagIds: string[] = [];
        let messageLength = 0;

        // Loop Over Tags in List
        tags.forEach(tag => {
                // Build Current Message
                let msgRequest = (isWriteRequests) ?
                    this.generateWriteMessageRequest(tag, DEFAULT_SIZE) :
                    this.generateReadMessageRequest(tag.path, DEFAULT_SIZE);

                messageLength += msgRequest.length + 2;

                tagIds.push(tag.id);
                msgRequests.push(msgRequest);

                // If Current Message Length is > 350 Bytes then Assemble Message and Move to Next Message
                if (messageLength >= 300) {
                    const data = _assembleMessage(msgRequests, this.multiPacketPath);
                    messages.push({ data, tagIds: [...tagIds] });

                    // empty the containers for the next batch
                    messageLength = 0;
                    msgRequests.length = 0;
                    tagIds.length = 0;
                }
        })


        // Assemble and Push Last Message
        if (msgRequests.length > 0) {
            const data = _assembleMessage(msgRequests, this.multiPacketPath);
            messages.push({ data, tagIds: [...tagIds] });
        }

        return messages;

        function _assembleMessage(msgRequests: Buffer[], multiPacketPath: Buffer): Buffer {
            let buf = Buffer.alloc(2 + 2 * msgRequests.length);
            buf.writeUInt16LE(msgRequests.length, 0);

            let ptr = 2;
            let offset = buf.length;

            for (let i = 0; i < msgRequests.length; i++) {
                buf.writeUInt16LE(offset, ptr);
                ptr += 2;
                offset += msgRequests[i].length;
            }

            buf = Buffer.concat([buf, ...msgRequests]);
            return CIP.MessageRouter.build(MULTIPLE_SERVICE_PACKET, multiPacketPath, buf);
        }
    }
}






interface ICIPError {
    generalStatusCode: number,
    extendedStatus: number,
}

function generateError(err: Error | ICIPError, tagName?: string): Error {
    if (err instanceof Error) return err;

    if ("generalStatusCode" in err && typeof err.generalStatusCode === "number") {
        const message = `PLC replied: ${getErrorCode(err.generalStatusCode)}` +
        `${(err.extendedStatus)? " ext." + err.extendedStatus : ""}` + ((tagName)? " at tag " + tagName : "");
        return new Error(message);
    }

    return new Error("Unknown error");

    function getErrorCode(code: number) {
        switch (code) {
            case 0x00: return "Success";
            case 0x01: return "Connection failure";
            case 0x02: return "Resource unavailable";
            case 0x03: return "Invalid Parameter value";
            case 0x04: return "Path segment error (tag does not exist)";
            case 0x05: return "Path destination unknown";
            case 0x06: return "Partial transfer";
            case 0x07: return "Connection lost";
            case 0x08: return "Service not supported";
            case 0x09: return "Invalid attribute value";
            case 0x0A: return "Attribute List error";
            case 0x0B: return "Already in requested mode/state";
            case 0x0C: return "Object state conflict";
            case 0x0D: return "Object already exists";
            case 0x0E: return "Attribute not settable";
            case 0x0F: return "Privilege violation";
            case 0x10: return "Device state conflict";
            case 0x11: return "Reply data too large";
            case 0x12: return "Fragmentation of a primitive value";
            case 0x13: return "Not enough data";
            case 0x14: return "Attribute not supported";
            case 0x15: return "Too much data";
            case 0x16: return "Object does not exist";
            case 0x17: return "Service fragmentation sequence not in progress";
            case 0x18: return "No stored attribute data";
            case 0x19: return "Store operation failure";
            case 0x1A: return "Routing failure, request packet too large";
            case 0x1B: return "Routing failure, response packet too large";
            case 0x1C: return "Missing attribute list entry data";
            case 0x1D: return "Invalid attribute value list";
            case 0x1E: return "Embedded service error";
            case 0x1F: return "Vendor specific error";
            case 0x20: return "Invalid parameter";
            case 0x21: return "Write-once value or medium atready written";
            case 0x22: return "Invalid Reply Received";
            case 0x23: return "Buffer overflow";
            case 0x24: return "Message format error";
            case 0x25: return "Key failure path";
            case 0x26: return "Path size invalid";
            case 0x27: return "Unecpected attribute list";
            case 0x28: return "Invalid Member ID";
            case 0x29: return "Member not settable";
            case 0x2A: return "Group 2 only Server failure";
            case 0x2B: return "Unknown Modbus Error";
            default: return "Unknown code: " + code;
        }
    }
}
