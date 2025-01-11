import {ACommonTag, ProtocolType} from "../../src/_common/interfaces";

export interface IControllerProps {
    name: string,
    version: string,
    isFaulted: boolean,
}

export interface IController {
    type: ProtocolType,
    ipAddress: string,
    // timeout: number,
    isConnected: boolean,
    isScanning: boolean,
    openConnection(ipAddress: string, timeout: number, slot: number): Promise<any>,
    closeConnection(): void,
    getProperties(): IControllerProps,

    readTag(tag: ACommonTag): Promise<void>,
    readTags(tags: Map<string, ACommonTag>): Promise<void>,
    writeTag(tag: ACommonTag): Promise<void>,
    writeTags(tags: Map<string, ACommonTag>): Promise<void>,
    scan(tags: Map<string, ACommonTag>, eachScanCallback: () => void): Promise<void>,
    stopScan(): void,
}
