import {ACommonTag, ITagUI} from "../../src/_common/interfaces";
import {EthernetIP} from "ethernet-ip";

const CIP = EthernetIP.CIP;

export class AbTag extends ACommonTag {
    get bitIndex(): number {
        return this._bitIndex;
    }
    get cipDataType(): number {
        return this._cipDataType;
    }
    set cipDataType(value: number) {
        this._cipDataType = value;
    }

    get path(): Buffer {
        return this._path;
    }
    private _cipDataType: number;
    private readonly _path: Buffer;
    private readonly _bitIndex: number = -1;

    constructor(uiTag: ITagUI) {
        super(uiTag);
        // @ts-ignore
        this._cipDataType = EthernetIP.CIP.DataTypes.Types[uiTag.datatype];

        // Split by "." for members
        // Split by "[" or "]" for array indexes
        // Split by "," for array indexes with more than 1 dimension
        // Filter for length > 0 to remove empty elements (happens if tag ends with array index)
        const pathArr = this._tagname.split(/[.[\],]/).filter(segment => segment.length > 0);

        // Check for bit index (tag ends in .int) - this only applies to SINT, INT, DINT or array elements of
        // Split by "." to only check udt members and bit index.
        const memArr = this._tagname.split(".");
        const lastElement = (memArr.length > 1) ? memArr[memArr.length - 1] : "__not_a_number__";
        // @ts-ignore
        if (lastElement % 1 === 0) {
            pathArr.pop();
            this._bitIndex = Number.parseInt(lastElement);
        }

        const bufArr = [];
        // Push Program Path to Buffer if Present
        if (this._program) bufArr.push(CIP.EPATH.segments.DATA.build(`Program:${this._program}`));

        // Build EPATH Buffer
        for (const path of pathArr) {
            bufArr.push(CIP.EPATH.segments.DATA.build(path));
        }

        this._path = Buffer.concat(bufArr);

        // below for debugging
        // console.log(this.fullName, pathArr, this._path, this._bitIndex);
        // const oldTag = new Tag(this.name, this.program, this._cipDataType, 0);
        // console.log(oldTag.name, oldTag.state.tag.path);
    }
}
