import {IKeyValueObject} from "./index";

// if modifying add the validation rule in validateTagUIProperties() below
export interface ITagUI {
    id: string,
    tagname: string,
    program: string,
    datatype: string,
    desc: string,
    usage?: string[],
    // THIS IS NOT IMPLEMENTED YET
    // smpAddress for a Modbus TCP addressing
    smpAddress?: string,
}

export enum ControllerType {
    ControlCIP = "ControlCIP",
    CompactCIP = "CompactCIP",
    S7_1200 = "S7_1200",
    M340 = "SE_M340",
    FakePLC = "FakePLC",
}

export enum ProtocolType {
    CIP,
    ProfiNet,
    ModbusTCP,
    FAKE = "FAKE",
}

export const getSupportedControllerTypes = (): IKeyValueObject[] => {
    return [
        {
            key: ControllerType.ControlCIP,
            value: "ControlLogix"
        },
        {
            key: ControllerType.CompactCIP,
            value: "CompactLogix"
        }
    ]
}

export const getPLCProtocol = (plcType: ControllerType | string): ProtocolType => {
    switch (plcType) {
        case ControllerType.ControlCIP: return ProtocolType.CIP;
        case ControllerType.CompactCIP: return ProtocolType.CIP;
        default: throw new Error(plcType + " doesn't exist in PLC Logic Prover.");
    }
}

export enum Datatype {
    BOOL = "BOOL",
    SINT = "SINT",
    INT = "INT",
    DINT = "DINT",
    REAL = "REAL",
    BYTE = "BYTE",
    WORD = "WORD",
    DWORD = "DWORD",
    LINT = "LINT",
}

// called Tag in AB, Address in Modbus (schneider) and Variable in Siemens
export abstract class ACommonTag implements ITagUI {
    protected readonly _id: string;
    protected readonly _tagname: string;
    protected readonly _program: string;
    protected readonly _datatype: Datatype;
    protected readonly _desc: string;
    protected _fromValue: number = 0;
    protected _value: number = 0;
    protected _toValue: number = 0;
    protected _smpAddress: string;

    get toValue(): number {
        return this._toValue;
    }
    set toValue(value: number) {
        this._toValue = value;
    }

    get value(): number {
        return this._value;
    }
    set value(value: number) {
        this._value = value;
    }

    get fromValue(): number {
        return this._fromValue;
    }
    set fromValue(value: number) {
        this._fromValue = value;
    }

    get id(): string {
        return this._id;
    }
    get datatype(): Datatype {
        return this._datatype;
    }
    get program(): string {
        return this._program;
    }
    get tagname(): string {
        return this._tagname;
    }

    get fullName(): string {
        if (this._program) return this._program + ":" + this._tagname;
        return this._tagname;
    }

    get desc(): string {
        return this._desc
    }

    get smpAddress(): string {
        return this._smpAddress
    }

    protected constructor(uiTag: ITagUI) {
        if (!ACommonTag.isValidDataType(uiTag.datatype)) throw new Error(`${uiTag.datatype} is not supported.`);

        this._tagname = uiTag.tagname;
        this._program = uiTag.program;
        this._datatype = uiTag.datatype as Datatype;
        this._id = uiTag.id;
        this._desc = uiTag.desc;
        this._smpAddress = uiTag.smpAddress || '';
    }

    static isValidDataType(datatype: string): boolean {
        const values = (Object.values(Datatype) as string[]);
        return values.includes(datatype);
    }

    static getBitsQty(datatype: string): number {
        if (([Datatype.BOOL] as string[]).includes(datatype)) return 1;
        if (([Datatype.SINT, Datatype.BYTE] as string[]).includes(datatype)) return 8;
        if (([Datatype.INT, Datatype.WORD] as string[]).includes(datatype)) return 16;
        if (([Datatype.DINT, Datatype.DWORD] as string[]).includes(datatype)) return 32;
        if (([Datatype.LINT] as string[]).includes(datatype)) return 64;

        return 0;
    }
}

export function validateTagUIProperties(uiTag: ITagUI): boolean {
    if (!uiTag.id) return false;
    if (!uiTag.tagname) uiTag.tagname = "";
    if (!uiTag.program === undefined) uiTag.program = "";
    if (!uiTag.datatype === undefined) uiTag.datatype = Datatype.BOOL;
    if (uiTag.desc === undefined) uiTag.desc = "";
    if (!uiTag.usage === undefined) uiTag.usage = [];
    if (!uiTag.smpAddress === undefined) uiTag.smpAddress = "";
    return true;
}
