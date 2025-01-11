import Logger from "../../_ui_common/logger.service";
import {tagsLocalForage as db} from "./localforage.config";
import {LpUtils} from "../../_common/utils";
import {validateTagUIProperties, ITagUI} from "../../_common/interfaces";
import PubSub_LP, {EventTopic} from "../_pubsub.aclass";
import {DUPLICATED_TAG} from "../../_common/defaults";
import {DataType, TagHelper} from "../../_common/classes/tag_helper.class";

const logger = new Logger("TagsService");

const tagsMap: Map<string, ITagUI> = new Map<string, ITagUI>();
let duplicateRegister: {[key: string] : string} = {};
let isInitCompleted = false;
let tagHelper: TagHelper;

export default class TagsService extends PubSub_LP {

    constructor() {
        super();
        if (!isInitCompleted) throw new Error("TagsService wasn't initialised yet. Call TagsService.init() first.")
    }

    static async init(reInit = false) {
        if (isInitCompleted && !reInit) return;

        tagHelper = new TagHelper();
        tagsMap.clear();
        duplicateRegister = {};
        await db.iterate((tagUI: ITagUI) => {
            if (!validateTagUIProperties(tagUI)) return;
            const tagPath = tagHelper.createTagPath(tagUI);
            duplicateRegister[tagPath] = tagUI.id;
            tagsMap.set(tagUI.id, tagUI);
        });

        isInitCompleted = true;
    }

    public async addTagIfDoesNotExist(abTag: ITagUI): Promise<boolean> {
        if (tagsMap.get(abTag.id)) return false;

        const isAdded = !!(await this.setTag(abTag));

        if (isAdded) {
            this.dispatchEvent(EventTopic.TagAdded, abTag.id);
        }
        return isAdded;
    }
    public addTagSubscriber(callback: (tagId: string) => void) {
        return this.subscribeOnChange(EventTopic.TagAdded, callback)
    }


    public isDuplicate(tagUI: ITagUI): boolean {
        return duplicateRegister[tagHelper.createTagPath(tagUI)] !== undefined
            && duplicateRegister[tagHelper.createTagPath(tagUI)] !== tagUI.id
    }

    async setTag(tagUI: ITagUI, doNotNotify?: boolean): Promise<ITagUI | undefined> {

        const isDuplicate = this.isDuplicate(tagUI);
        if (!tagHelper.isValidTag(tagUI) || isDuplicate) {
            this.dispatchEvent(EventTopic.TagUpdated, isDuplicate ? DUPLICATED_TAG : undefined);
            return;
        }

        // delete old path from duplicateRegister
        const oldTag = tagsMap.get(tagUI.id);
        if (oldTag && duplicateRegister[tagHelper.createTagPath(oldTag)]) {
            delete duplicateRegister[tagHelper.createTagPath(oldTag)];
        }

        logger.log(`Setting ${tagUI.tagname} to AbTagsDb`);
        const addedTag = await db.setItem(tagUI.id, tagUI);
        tagsMap.set(tagUI.id, tagUI);
        duplicateRegister[tagHelper.createTagPath(tagUI)] = tagUI.id;

        if (!doNotNotify) this.dispatchEvent(EventTopic.TagUpdated, tagUI.id);
        return addedTag;
    }
    public updateTagSubscriber(callback: (tagId?: string) => void) {
        return this.subscribeOnChange(EventTopic.TagUpdated, callback)
    }


    async getTagFromDb(tagId: string): Promise<ITagUI | null> {
        logger.log(`Getting ${tagId} from AbTagsDb`);
        return db.getItem(tagId)
    }

    public getTag(tagId: string): ITagUI | undefined {
        const tag = tagsMap.get(tagId);
        if (!tag) return;
        return TagsService.makeIdentical(tag)
    }

    public countCached(): number {
        return tagsMap.size;
    }

    public async count(): Promise<number> {
        return db.length();
    }

    // public isValidTag(tagUi: ITagUI): boolean {
    //     return CipTagHelper.isValidTag(tagUi)
    // }

    // filterTagByName(searchValue: string): ITagUI[] {
    //     // spread Map is the fastest way to make an array
    //     return [...tagsMap.values()].filter(item => item.tagname.includes(searchValue))
    // }
    //
    // findByTagname(tagname: string): ITagUI | undefined {
    //     return [...tagsMap.values()].find(item => item.tagname === tagname)
    // }

    async deleteTag(tagId: string, doNotNotify?: boolean) {
        logger.log(`Deleting ${tagId} from AbTagsDb`);

        const tagToDelete = tagsMap.get(tagId);
        if (tagToDelete && duplicateRegister[tagHelper.createTagPath(tagToDelete)]) {
            delete duplicateRegister[tagHelper.createTagPath(tagToDelete)];
        }

        await db.removeItem(tagId);
        tagsMap.delete(tagId);

        if (!doNotNotify) this.dispatchEvent(EventTopic.TagDeleted, tagToDelete?.tagname);
    }
    public deleteTagSubscriber(callback: (tagname: string) => void) {
        return this.subscribeOnChange(EventTopic.TagDeleted, callback)
    }

    getAllTags(): ITagUI[] {
        // for 100 tag takes .5 ms
        return [...tagsMap.values()].map(tagUi => TagsService.makeIdentical(tagUi));
    }

    static makeIdentical(tagUi: ITagUI): ITagUI {
        return {
            id: tagUi.id,
            tagname: tagUi.tagname,
            program: tagUi.program,
            datatype: tagUi.datatype,
            desc: tagUi.desc,
            usage: tagUi.usage ? [...tagUi.usage] : [],
            smpAddress: tagUi.smpAddress,
        }
    }


    async clearDb(): Promise<void> {
        logger.log(`Clearing Tags DB`);
        await db.clear();
        tagsMap.clear();
        duplicateRegister = {};
    }

    static generateTag(tagToDuplicate?: ITagUI): ITagUI {
        return {
            id: LpUtils.generateId(),
            tagname: (tagToDuplicate)? "copy_" + tagToDuplicate.tagname : "",
            program: (tagToDuplicate)? tagToDuplicate.program : "",
            datatype: (tagToDuplicate)? tagToDuplicate.datatype : DataType.BOOL,
            desc: (tagToDuplicate)? tagToDuplicate.desc : "",
            usage: [],
            smpAddress: tagToDuplicate ? tagToDuplicate.smpAddress : "",
        }
    }

    // public isInteger(datatype: string): boolean {
    //     return (datatype === AbDataType.SINT || datatype === AbDataType.INT || datatype === AbDataType.DINT)
    // }


    // public isValidProgramName(value: string): boolean {
    //     return /^(?!^_)(?!.*_$)[a-zA-Z0-9_]*$/.test(value);
    // }

    // public isValidTagname(tagname: string): boolean {
    //     if (typeof tagname !== "string") return false;
    //
    //     const plcType = projectDb.getProjectPlcType();
    //     if (plcType !== PlcType.AB_CL) return false;
    //
    //     // regex components
    //     const nameRegex = (captureIndex: number) => {
    //         return `(_?[a-zA-Z]|_\\d)(?:(?=(_?[a-zA-Z0-9]))\\${captureIndex})*`;
    //     };
    //     const multDimArrayRegex = "(\\[\\d+(,\\d+){0,2}])";
    //     const arrayRegex = "(\\[\\d+])";
    //     const bitIndexRegex = "(\\.\\d{1,2})";
    //
    //     // user regex for user tags
    //     const userRegex = new RegExp(
    //         "^(Program:" +
    //         nameRegex(3) +
    //         "\\.)?" + // optional program name
    //         nameRegex(5) +
    //         multDimArrayRegex +
    //         "?" + // tag name
    //         "(\\." +
    //         nameRegex(10) +
    //         arrayRegex +
    //         "?)*" + // option member name
    //         bitIndexRegex +
    //         "?$"
    //     ); // optional bit index
    //     // full user regex
    //     // ^(Program:(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\3)*\.)?(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\5)*(\[\d+(,\d+){0,2}])?(\.(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\10)*(\[\d+])?)*(\.\d{1,2})?$
    //
    //     // module regex for module tags
    //     const moduleRegex = new RegExp(
    //         "^" +
    //         nameRegex(2) + // module name
    //         "(:\\d{1,2})?" + // optional slot num (not required for rack optimized connections)
    //         ":[IOC]" + // input/output/config
    //         "(\\." +
    //         nameRegex(6) +
    //         arrayRegex +
    //         "?)?" + // optional member with optional array index
    //         bitIndexRegex +
    //         "?$"
    //     ); // optional bit index
    //     // full module regex
    //     // ^(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\2)*(:\d{1,2})?:[IOC](\.(_?[a-zA-Z]|_\d)(?:(?=(_?[a-zA-Z0-9]))\6)*(\[\d+])?)?(\.\d{1,2})?$
    //
    //     if (!userRegex.test(tagname) && !moduleRegex.test(tagname)) return false;
    //
    //     // check segments
    //     if (tagname.split(/[:.[\],]/).filter(segment => segment.length > 40).length > 0)
    //         return false; // check that all segments are <= 40 char
    //
    //     // passed all tests
    //     return true;
    // }

    // public DataType() {
    //     return AbDataType;
    // }
    //
    // public listUiDataTypes(): string[] {
    //     return Object.keys(this.DataType())
    // }

    // public clampTagValue(datatype: string, bitNo: number, value: number): number {
    //
    //     if (datatype === AbDataType.BOOL) return (value > 0) ? 1 : 0;
    //
    //     if (this.isInteger(datatype)) {
    //         if (bitNo >= 0) return (value > 0) ? 1 : 0;
    //
    //         // SINT 8bit    −128 to 127 => 255
    //         // INT 16bit    −32768 to 32767 => 65535
    //         // DINT 32bit   −2147483648 to 2147483647 => 4294967295
    //         value = Math.round(value);
    //         if (datatype === this.DataType().SINT) return LpUtils.clamp(value, -128, 127);
    //         if (datatype === this.DataType().INT) return LpUtils.clamp(value, -32768, 32767);
    //         if (datatype === this.DataType().DINT) return LpUtils.clamp(value, -2147483648, 2147483647);
    //     }
    //     return value
    // }

    // public bitArray(dataType: string): number[] {
    //     switch (dataType) {
    //         case AbDataType.SINT: return LpUtils.times(8, i => i);
    //         case AbDataType.INT: return LpUtils.times(16, i => i);
    //         case AbDataType.DINT: return LpUtils.times(32, i => i);
    //     }
    //     return []
    // }

    public async setUsage(tagIds: string[], actionUnitId: string) {
        for (const tagId of tagIds) {
            const tag = tagsMap.get(tagId);
            if (!tag) continue;

            if (!tag.usage) tag.usage = [];

            if (tag.usage.includes(actionUnitId)) continue;

            tag.usage.push(actionUnitId);
            await this.setTag(tag, true);
        }
    }

    public async deleteUsage(tagIds: string[], actionUnitId: string) {
        for (const tagId of tagIds) {
            const tag = tagsMap.get(tagId);
            if (!tag) continue;
            if (!tag.usage) continue;

            const index = tag.usage.findIndex(tagId => tagId === actionUnitId);
            if (index < 0) continue;

            tag.usage.splice(index, 1);
            await this.setTag(tag, true);
        }
    }
}
