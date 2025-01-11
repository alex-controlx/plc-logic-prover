import {ProjectDbService} from "../../services/storage/project_db.service";
import {LpUtils} from "../utils";
import {ITagUI, PlcType} from "../interfaces";
import CipTagHelper from "./cip_validator.class";
import SmpAddressHelper from "./smp_validator.class";

export enum DataType {
    BOOL = "BOOL",
    SINT = "SINT",    // BYTE     8 bits      -128 to 127
    USINT = "USINT",  // BYTE     8 bits      0 to 255
    INT = "INT",      // WORD     16 bits     -32,768 to 32,767
    UINT = "UINT",    // WORD     16 bits     0 to 65,535
    DINT = "DINT",    // DWORD    32 bits     -2,147,483,648 to 2,147,483,647
    UDINT = "UDINT",  // DWORD    32 bits     0 to 4,294,967,295
    REAL = "REAL",    //          32 bits     +/-3.402823E38 to +/-1.1754944E-38
}

const dataTypes = Object.values(DataType);
export interface ILocal2UiDatatype {
    localDatatype: string,
    uiDatatype: string
}

export class TagHelper {
    static cipKeyValueDatatype = TagHelper.keyValueDatatypes(dataTypes, PlcType.AB_CL);
    static cipDatatypes: string[] = TagHelper.cipKeyValueDatatype.map(keyValue => keyValue.localDatatype);
    static cipDatatypesUi: string[] = TagHelper.cipKeyValueDatatype.map(keyValue => keyValue.uiDatatype);

    static bitArray(dataType: string): number[] {
        switch (dataType) {
            case DataType.SINT || DataType.USINT: return LpUtils.times(8, i => i);
            case DataType.INT || DataType.UINT: return LpUtils.times(16, i => i);
            case DataType.DINT || DataType.UDINT: return LpUtils.times(32, i => i);
        }
        return []
    }

    static clampTagValue(datatype: string, bitNo: number, value: number): number {

        if (datatype === DataType.BOOL) return (value > 0) ? 1 : 0;

        if (TagHelper.isInteger(datatype)) {
            if (bitNo >= 0) return (value > 0) ? 1 : 0;

            value = Math.round(value);
            switch (datatype) {
                case DataType.SINT: return LpUtils.clamp(value, -128, 127);
                case DataType.USINT: return LpUtils.clamp(value, 0, 255);
                case DataType.INT: return LpUtils.clamp(value, -32768, 32767);
                case DataType.UINT: return LpUtils.clamp(value, 0, 65535);
                case DataType.DINT: return LpUtils.clamp(value, -2147483648, 2147483647);
                case DataType.UDINT: return LpUtils.clamp(value, 0, 4294967295);
            }
        }
        return value
    }

    static isInteger(datatype: string): boolean {
        return (datatype === DataType.SINT || datatype === DataType.INT || datatype === DataType.DINT ||
            datatype === DataType.USINT || datatype === DataType.UINT || datatype === DataType.UDINT)
    }

    // returns array of supported datatypes in Key/Value Format
    private static keyValueDatatypes(datatypes: string[], plcType: PlcType): ILocal2UiDatatype[] {
        const out: ILocal2UiDatatype[] = [];
        for (const dt of datatypes) {
            const uiDataType = TagHelper.translateToUi(plcType, dt);
            if (!uiDataType) continue;
            out.push({
                localDatatype: dt,
                uiDatatype: uiDataType
            });
        }
        return out
    }

    static translateToUi(plcType: PlcType, datatype: string): string {
        switch (plcType) {
            case PlcType.AB_CL: return translateAbClDatatype(datatype);
            case PlcType.SE_M340: return translateM340Datatype(datatype);
            default: return ""
        }
    }

    static translateToLocal(plcType: PlcType, datatype: string): string {
        plcType = plcType || PlcType.AB_CL;
        return datatype
    }

    public isValidTag(tagUi: ITagUI) {
        const plcType = ProjectDbService.getProjectPlcType();
        switch (plcType) {
            case PlcType.AB_CL: return CipTagHelper.isValidTag(tagUi);
            case PlcType.SE_M340: return SmpAddressHelper.isValidTag(tagUi);
        }
    }

    createTagPath(tagUI: ITagUI): string {
        const plcType = ProjectDbService.getProjectPlcType();
        switch (plcType) {
            case PlcType.AB_CL: return tagUI.program + ":::" + tagUI.tagname
            case PlcType.SE_M340: return ":::" + tagUI.tagname
        }
    }

    translateDatatype(datatype: string) {
        const plcType = ProjectDbService.getProjectPlcType();
        return TagHelper.translateToUi(plcType, datatype);
    }
}


function translateAbClDatatype(datatype: string): string {
    switch (datatype) {
        case DataType.BOOL: return "BOOL";
        case DataType.SINT: return "SINT";
        case DataType.INT: return "INT";
        case DataType.DINT: return "DINT";
        case DataType.REAL: return "REAL";
        default: return "" 
    }
}

function translateM340Datatype(datatype: string): string {
    switch (datatype) {
        case DataType.BOOL: return "bool";
        case DataType.SINT: return "byte";
        case DataType.USINT: return "uByte";
        case DataType.INT: return "word";
        case DataType.DINT: return "dword";
        case DataType.REAL: return "float";
        default: return ""
    }
}
