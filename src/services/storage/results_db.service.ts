import Logger from "../../_ui_common/logger.service";
import {resultsLocalForage as db} from "./localforage.config";
import {IResultFromIpc} from "../../_common/interfaces/result.class";

const logger = new Logger("ResultsService");
const ORDER_ID = "__order__"

export default class ResultsService {

    public async getResultFromDb(actionUnitId: string): Promise<IResultFromIpc | null> {
        logger.log(`Getting AU result for ${actionUnitId} from DB`);
        return db.getItem<IResultFromIpc>(actionUnitId);
    }

    public async count(): Promise<number> {
        return db.length();
    }

    public async setAllResultsAtOnce(auResults: IResultFromIpc[]) {
        logger.log(`Setting ${auResults.length} AU results to DB`);
        const auResultIds = [];
        await db.clear();
        for (const auResult of auResults) {
            auResultIds.push(auResult.id);
            await db.setItem<IResultFromIpc>(auResult.id, auResult);
        }
        await db.setItem(ORDER_ID, auResultIds);
    }

    public async clearResultsDb() {
        logger.log(`Clearing Results DB`);
        await db.clear();
    }

    async getResultsFromDb(): Promise<IResultFromIpc[]> {
        const out: IResultFromIpc[] = [];
        const auResultIds = await db.getItem<string[]>(ORDER_ID);
        if (!auResultIds) return out;
        for (const auResultId of auResultIds) {
            const result = await db.getItem<IResultFromIpc>(auResultId);
            if (result) out.push(result);
        }
        return out;
    }
}
