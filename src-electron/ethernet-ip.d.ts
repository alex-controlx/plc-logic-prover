declare module "ethernet-ip" {
    import EventEmitter = NodeJS.EventEmitter;
    import {Socket} from "net";

    interface ICIPTag {
        name: string,
        type: number,
        bitIndex: number | null,
        value: number | string | boolean | object | null,
        controllerValue: number | string | boolean | object | null,
        path: Buffer,
        program: string,
        stage_write: boolean
    }

    interface ICIPTagError {
        code: number | null,
        status: number | null,
    }

    interface ICIPTagState {
        tag: ICIPTag,
        read_size: number,
        error: ICIPTagError,
        timestamp: Date,
        instance: string,
        keepAlive: number
    }

    export class Tag extends EventEmitter {
        state: ICIPTagState;

        constructor(tagname: string, program: string | null, datatype: number | null, keepAlive?: number);

        static get instances(): number;

        get instance_id(): string;

        get name(): string;
        set name(name: string);

        get type(): string;

        // set type(type: number);

        get bitIndex(): number;

        get read_size(): number;
        set read_size(size: number);

        get value(): number | string | boolean | object;
        set value(newValue: number | string | boolean | object);

        set controller_value(newValue: number | string | boolean | object);
        get controller_value(): number | string | boolean | object;

        generateReadMessageRequest(size?: number): Buffer;

        generateWriteMessageRequest(...args: any[]): void;

        generateWriteMessageRequestForAtomic(...args: any[]): void;

        generateWriteMessageRequestForBitIndex(...args: any[]): void;

        parseReadMessageResponse(buffer: Buffer): void;

        parseReadMessageResponseValueForAtomic(...args: any[]): void;

        parseReadMessageResponseValueForBitIndex(...args: any[]): void;

        unstageWriteRequest(...args: any[]): void;

        static defaultMaxListeners: number;

        static init(): void;

        static isValidTagname(...args: any[]): void;

        static listenerCount(emitter: any, type: any): any;

        static once(emitter: any, name: any): any;

        static usingDomains: boolean;

    }

    export interface ICommonPacketData {
        TypeID: Buffer,
        data: Buffer,
    }

    export interface ICipControllerProps {
        name: string,
        serial_number: number,
        slot: number,
        time: string,
        path: Buffer,
        version: string,
        status: number,
        faulted: boolean,
        minorRecoverableFault: boolean,
        minorUnrecoverableFault: boolean,
        majorRecoverableFault: boolean,
        majorUnrecoverableFault: boolean,
        io_faulted: boolean
    }

    export interface ICipControllerConfig {
        queue_max_size: number
    }

    export class TagGroup {
        constructor(...args: any[]);

        add(...args: any[]): void;

        forEach(...args: any[]): void;

        generateReadMessageRequests(...args: any[]): void;

        generateWriteMessageRequests(...args: any[]): void;

        parseReadMessageResponses(...args: any[]): void;

        parseWriteMessageRequests(...args: any[]): void;

        remove(...args: any[]): void;

        static defaultMaxListeners: number;

        static init(): void;

        static listenerCount(emitter: any, type: any): any;

        static once(emitter: any, name: any): any;

        static usingDomains: boolean;

    }

    export interface IMessageRouterObject {
        service: number,
        generalStatusCode: number,
        extendedStatusLength: number,
        extendedStatus: number[],
        data: Buffer
    }

    export namespace EthernetIP {
        class ENIP extends Socket {
            // export class ENIP {
            //     readonly destroyed: boolean;
            //     readonly connecting: boolean;

            constructor();

            // connect(IP_ADDR: string): Promise<any>;

            // on(event: string, listener: (...args: any[]) => void): this;
            //
            // removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
            //
            // setTimeout(timeout: number, callback?: () => void): this;
            //
            // destroy(error?: Error): void;

            _readTag(tag: Tag, size?: number): Promise<Buffer>;

            /**
             * Returns an Object
             *  - <number> error code
             *  - <string> human readable error
             */
            get error(): {code: number, msg: string};

            get establishing(): boolean;

            get established(): boolean;

            get session_id(): string;


            /**
             * Writes Ethernet/IP Data to Socket as an Unconnected Message
             * or a Transport Class 1 Datagram
             *
             * NOTE: Cant Override Socket Write due to net.Socket.write
             *        implementation. =[. Thus, I am spinning up a new Method to
             *        handle it. Dont Use Enip.write, use this function instead.
             *
             * @param {buffer} data - Data Buffer to be Encapsulated
             * @param {boolean} [connected=false]
             * @param {number} [timeout=10] - Timeoue (sec)
             * @param {function} [cb=null] - Callback to be Passed to Parent.Write()
             * @memberof ENIP
             */
            write_cip(data: Buffer, connected?: boolean, timeout?: number, cb?: () => void): void;

            // static ReadableState(options: any, stream: any, isDuplex: any): void;
            //
            // static defaultMaxListeners: number;
            //
            // static finished(stream: any, opts: any, callback: any, ...args: any[]): any;
            //
            // static from(iterable: any, opts: any): any;
            //
            // static init(): void;
            //
            // static listenerCount(emitter: any, type: any): any;
            //
            // static once(emitter: any, name: any): any;
            //
            // static pipeline(streams: any): any;
            //
            // static usingDomains: boolean;

        }

        const CIP: {
            DataTypes: {
                Types: {
                    BIT_STRING: number;
                    BOOL: number;
                    DATE: number;
                    DATE_AND_STRING: number;
                    DINT: number;
                    DWORD: number;
                    ENGUNIT: number;
                    EPATH: number;
                    FTIME: number;
                    INT: number;
                    ITIME: number;
                    LINT: number;
                    LREAL: number;
                    LTIME: number;
                    LWORD: number;
                    REAL: number;
                    SHORT_STRING: number;
                    SINT: number;
                    STIME: number;
                    STRING: number;
                    STRING2: number;
                    STRINGI: number;
                    STRINGN: number;
                    STRUCT: number;
                    TIME: number;
                    TIME_AND_DAY: number;
                    UDINT: number;
                    UINT: number;
                    USINT: number;
                    WORD: number;
                };
                /**
                 * Retrieves Human Readable Version of an Inputted Type Code
                 *
                 * @param {number} num - Type Code to Request Human Readable version
                 * @returns {string} Type Code String Interpretation
                 */
                getTypeCodeString(num: number): string;
                /**
                 * Checks if an Inputted Integer is a Valid Type Code (Vol1 Appendix C)
                 *
                 * @param {number} num - Integer to be Tested
                 * @returns {boolean}
                 */
                isValidTypeCode(num: number): boolean;
            };
            EPATH: {
                segments: {
                    DATA: {
                        Types: {
                            ANSI_EXTD: number;
                            Simple: number;
                        };
                        /**
                         * Builds EPATH Data Segment
                         *
                         * @param {string|buffer} data
                         * @param {boolean} [ANSI=true] Declare if ANSI Extended or Simple
                         * @returns {buffer}
                         */
                        build(data: Buffer | string, ANSI?: boolean): Buffer;
                    };
                    LOGICAL: {
                        /**
                         * Builds Single Logical Segment Buffer
                         *
                         * @param {number} type - Valid Logical Segment Type
                         * @param {number} address - Logical Segment Address
                         * @param {boolean} [padded=true] - Padded or Packed EPATH format
                         * @returns {buffer}
                         */
                        build(type: number, address: number, padded?: boolean): Buffer;
                        types: {
                            AttributeID: number;
                            ClassID: number;
                            ConnPoint: number;
                            InstanceID: number;
                            MemberID: number;
                            ServiceID: number;
                            Special: number;
                        };
                    };
                    PORT: {
                        build(port: number, link: number | string): Buffer;
                    };
                    SegmentTypes: {
                        DATA: number;
                        DATATYPE_1: number;
                        DATATYPE_2: number;
                        LOGICAL: number;
                        NETWORK: number;
                        PORT: number;
                        SYMBOLIC: number;
                    };
                };
            };
            MessageRouter: {
                /**
                 * Builds a Message Router Request Buffer
                 *
                 * @param {number} service - CIP Service Code
                 * @param {Buffer} path - CIP Padded EPATH (Vol 1 - Appendix C)
                 * @param {Buffer} data - Service Specific Data to be Sent
                 * @returns {Buffer} Message Router Request Buffer
                 */
                build(service: number, path: Buffer, data: Buffer | Buffer[]): Buffer;
                /**
                 * Parses a Message Router Request Buffer
                 *
                 * @param {Buffer} buf - Message Router Request Buffer
                 * @returns {MessageRouter} Decoded Message Router Object
                 */
                parse(buf: Buffer): IMessageRouterObject;
                services: {
                    APPLY_ATTRIBUTES: number;
                    CREATE: number;
                    DELETE: number;
                    FIND_NEXT: number;
                    GET_ATTRIBUTE_ALL: number;
                    GET_ATTRIBUTE_SINGLE: number;
                    MULTIPLE_SERVICE_PACKET: number;
                    READ_MODIFY_WRITE_TAG: number;
                    READ_TAG: number;
                    READ_TAG_FRAGMENTED: number;
                    RESET: number;
                    SET_ATTRIBUTE_SINGLE: number;
                    START: number;
                    STOP: number;
                    WRITE_TAG: number;
                    WRITE_TAG_FRAGMENTED: number;
                };
            };
            UnconnectedSend: {
                /**
                 * Builds an Unconnected Send Packet Buffer
                 *
                 * @param {buffer} message_request - Message Request Encoded Buffer
                 * @param {buffer} path - Padded EPATH Buffer
                 * @param {number} [timeout=2000] - timeout
                 * @returns {buffer}
                 */
                build(message_request: Buffer, path: Buffer, timeout?: number): Buffer;
                generateEncodedTimeout: any;
            };
        };

    }

    export class Controller extends EthernetIP.ENIP {
        constructor(props: ICipControllerConfig);

        /**
         * Returns the Scan Rate of Subscription Tags
         */
        get scan_rate(): number;

        /**
         * Sets the Subsciption Group Scan Rate
         */
        set scan_rate(rate: number);

        /**
         * Get the status of Scan Group*
         */
        get scanning(): boolean;

        /**
         * Gets the Controller Properties Object
         */
        get properties(): ICipControllerProps;

        /**
         * Fetches the last timestamp retrieved from the controller
         * in human readable form
         */
        get time(): string;

        // connect(IP_ADDR: string, SLOT: number): Promise<any>;

        _writeTag(tag: Tag, value?: number | null, size?: number): Promise<Buffer>;


        forEach(...args: any[]): void;

        pauseScan(...args: any[]): void;

        readControllerProps(...args: any[]): void;

        readTag(...args: any[]): void;

        readTagGroup(...args: any[]): void;

        readWallClock(...args: any[]): void;

        scan(...args: any[]): Promise<any>;

        subscribe(...args: any[]): void;

        writeTag(...args: any[]): void;

        writeTagGroup(...args: any[]): void;

        writeWallClock(...args: any[]): void;

        write_cip(...args: any[]): void;
    }

    export const util: {
        /**
         * Wraps a Promise with a Timeout
         *
         * @param {Promise} promise to complete before the timeout
         * @param {number} ms timeout Length (ms)
         * @param {Error|string} error Error to Emit if Timeout Occurs
         * @returns {Promise}
         * @memberof Controller
         */
        promiseTimeout(promise: Promise<any>, ms: number, error?: Error): Promise<any>,

        /**
         * Delays X ms
         *
         * @param {number} ms - Delay Length (ms)
         * @returns {Promise}
         */
        delay(ms: number): Promise<any>;
    }
}
