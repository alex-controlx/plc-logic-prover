import {ITagUI} from "../interfaces";


export default class CipTagHelper {

    static isValidTag(abTag: ITagUI): boolean {
        return CipTagHelper.isValidTagname(abTag.tagname) && CipTagHelper.isValidProgramName(abTag.program)
    }

    static isValidTagname(tagname: string): boolean {
        // regex components
        const nameRegex = (captureIndex: number) => {
            return `(_?[a-zA-Z]|_\\d)(?:(?=(_?[a-zA-Z0-9]))\\${captureIndex})*`;
        };
        const multDimArrayRegex = "(\\[\\d+(,\\d+){0,2}])";
        const arrayRegex = "(\\[\\d+])";
        const bitIndexRegex = "(\\.\\d{1,2})";

        // user regex for user tags
        const userRegex = new RegExp(
            "^(Program:" +
            nameRegex(3) +
            "\\.)?" + // optional program name
            nameRegex(5) +
            multDimArrayRegex +
            "?" + // tag name
            "(\\." +
            nameRegex(10) +
            arrayRegex +
            "?)*" + // option member name
            bitIndexRegex +
            "?$"
        ); // optional bit index
        // full user regex
        // ^(Program:(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\3)*\.)?(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\5)*(\[\d+(,\d+){0,2}])?(\.(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\10)*(\[\d+])?)*(\.\d{1,2})?$

        // module regex for module tags
        const moduleRegex = new RegExp(
            "^" +
            nameRegex(2) + // module name
            "(:\\d{1,2})?" + // optional slot num (not required for rack optimized connections)
            ":[IOC]" + // input/output/config
            "(\\." +
            nameRegex(6) +
            arrayRegex +
            "?)?" + // optional member with optional array index
            bitIndexRegex +
            "?$"
        ); // optional bit index
        // full module regex
        // ^(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\2)*(:\d{1,2})?:[IOC](\.(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\6)*(\[\d+])?)?(\.\d{1,2})?$

        if (!userRegex.test(tagname) && !moduleRegex.test(tagname)) return false;

        // check segments
        if (tagname.split(/[:.[\],]/).filter(segment => segment.length > 40).length > 0)
            return false; // check that all segments are <= 40 char

        // passed all tests
        return true;
    }

    static isValidProgramName(program: string): boolean {
        return /^(?!^_)(?!.*_$)[a-zA-Z0-9_]*$/.test(program);
    }
}
