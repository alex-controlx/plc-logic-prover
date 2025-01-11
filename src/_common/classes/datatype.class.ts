import {IKeyValueObject} from "../interfaces";

export enum DatatypeType {
    CIP = "CIP"
}

abstract class DatatypeClass {
    // CIP
    protected readonly _BOOL = "BOOL";
    protected readonly _SINT = "SINT";  // BYTE     8 bits      -128 to 127
    protected readonly _INT = "INT";    // WORD     16 bits     -32,768 to 32,767
    protected readonly _DINT = "DINT";  // DWORD    32 bits     -2,147,483,648 to 2,147,483,647
    protected readonly _REAL = "REAL";  //          32 bits     +/-3.402823E38 to +/-1.1754944E-38

    // S7-1200
    // Bool, Byte, Word, Int, DInt, DWord, SInt, Time, Real, UDInt, UInt, USInt,

    // Internal
    // bool, s8bit, u8bit, s16bit, u16bit, s32bit, u32bit, real

    abstract listTypes(): string[];

    getKeyValues(): IKeyValueObject[] {
        const keyValueObjects: IKeyValueObject[] = [];
        const list = this.listTypes();
        for (const type of list) {
            const keyValue: IKeyValueObject = {
                key: type,
                value: type
            }
            keyValueObjects.push(keyValue)
        }
        return keyValueObjects
    }
}

export class DatatypeCIP extends DatatypeClass {
    public readonly type: DatatypeType.CIP = DatatypeType.CIP;

    listTypes(): string[] {
        // UI order
        return [this._BOOL, this._SINT, this._INT, this._DINT, this._REAL]
    }

    get BOOL() {
        return this._BOOL
    }

    get SINT() {
        return this._SINT
    }

    get INT() {
        return this._INT
    }

    get DINT() {
        return this._DINT
    }

    get REAL() {
        return this._REAL
    }
}
