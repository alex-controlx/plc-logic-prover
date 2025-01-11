export class AppConfig {
    commsQueueDelay: number = 10;
    auQueueDelay: number = 50;
    asQueueDelay: number = 1000;

    static mergerConfigs(source: any, dest: AppConfig): AppConfig {

        if (typeof source.commsQueueDelay === "number") dest.commsQueueDelay = source.commsQueueDelay;
        if (typeof source.auQueueDelay === "number") dest.auQueueDelay = source.auQueueDelay;
        if (typeof source.asQueueDelay === "number") dest.asQueueDelay = source.asQueueDelay;

        return dest;
    }
}
