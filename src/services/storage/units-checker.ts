import {invalidUnitsLocalForage as db} from "./localforage.config";
import Logger from "../../_ui_common/logger.service";
import {
    getInvalidMessageOf,
    IActionUnit, IInvalidUnitMessage,
} from "../../_common/action-unit";
import PubSub_LP, {EventTopic} from "../_pubsub.aclass";
import IpcRendererService from "../ipc_renderer.service";
import TagsService from "./tags.service";

const logger = new Logger("UnitsChecker");
const invalidUnits = new Map<string, IInvalidUnitMessage>();
let tagService: TagsService;

let isInitCompleted = false;
const ipcComms = new IpcRendererService();

export default class UnitsChecker extends PubSub_LP {

    constructor() {
        super();
        if (!isInitCompleted) throw new Error("UnitsChecker wasn't initialised yet. Call UnitsChecker.init() first.");
    }

    static async init(tagDbService: TagsService) {
        if (isInitCompleted) return;
        tagService = tagDbService
        invalidUnits.clear();
        await db.iterate((value: IInvalidUnitMessage, key) => {
            invalidUnits.set(key, value);
        });
        isInitCompleted = true;
    }

    async getUnitsFromDb(): Promise<IInvalidUnitMessage[]> {
        const out: IInvalidUnitMessage[] = [];
        await db.iterate((value: IInvalidUnitMessage) => {
            out.push(value)
        });
        return out;
    }

    async checkActionUnit(actionUnit: IActionUnit, isParentEnabled: boolean) {
        const invalidMessage = getInvalidMessageOf(actionUnit, tagService);
        if (invalidMessage) {
            await this.setInvalidUnit({
                actionUnitId: actionUnit.id,
                name: actionUnit.name,
                message: invalidMessage,
                isEnabled: actionUnit.enabled && isParentEnabled
            })
        } else if (invalidUnits.has(actionUnit.id)) {
            await this.deleteInvalidUnit(actionUnit.id)
        }
    }

    async deleteInvalidUnit(unitId: string, notifySubscribers = false): Promise<void> {
        if (!invalidUnits.has(unitId)) return;
        logger.log(`Deleting ${invalidUnits.get(unitId)?.name} from InvalidUnits DB`);
        await db.removeItem(unitId);
        invalidUnits.delete(unitId);
        await this.sendUnits(notifySubscribers ? unitId : undefined);
    }

    async clearDb(): Promise<void> {
        logger.log(`Clearing InvalidUnits DB`);
        await db.clear();
        invalidUnits.clear();
        await this.sendUnits();
    }


    public async setInvalidUnit(unit: IInvalidUnitMessage, notifySubscribers = false): Promise<void> {
        logger.log(`Setting "${unit.name}" in InvalidUnits DB`);
        await db.setItem(unit.actionUnitId, unit);
        invalidUnits.set(unit.actionUnitId, unit);
        await this.sendUnits(notifySubscribers ? unit : undefined);
    }

    private async sendUnits(invalidAu?: IInvalidUnitMessage | string) {
        if (invalidAu) this.dispatchEvent(EventTopic.onInvalidUnits, invalidAu);

        // this sends invalid action units to Test Runner window
        await ipcComms.sendInvalidUnits([...invalidUnits.values()]);
    }
    public onUpdatedInvalidUnitsSubscriber(callback: (invalidAu: IInvalidUnitMessage | string) => void) {
        return this.subscribeOnChange(EventTopic.onInvalidUnits, callback)
    }

    getInvalidAUById(actionUnitId: string): IInvalidUnitMessage | undefined {
        return invalidUnits.get(actionUnitId);
    }

    async count(): Promise<number> {
        return db.length();
    }
}
