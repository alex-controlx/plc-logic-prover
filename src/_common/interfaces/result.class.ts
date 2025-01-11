export const LAST_RESULT_ID = "_last_";

export enum ResultType {
    Result = "Result",
    AsResult = "AsResult",
    AuResult = "AuResult",
}

interface IBaseResult {
    readonly id: string,
    message: string,
    startedAt: number,
    finishedAt: number,
    handleFail(message: string, addMessage?: string): void,
    error: string,
}

abstract class BaseResult implements IBaseResult {
    message: string;
    startedAt: number;
    finishedAt: number = -1;
    protected _error: string = "";
    readonly id: string;

    constructor(id: string, message: string, isClosed?: boolean) {
        this.id = id;
        this.message = message;
        this.startedAt = Date.now();
        if (isClosed) this.finishedAt = this.startedAt;
    }

    handleFail(message: string, addMessage?: string) {
        addMessage = addMessage != null ? ` (${addMessage})` : '';
        this._error = message + addMessage;
    }

    get error(): string {
        return (this._error)? this._error : ""
    }
}

/**
 * @desc Project wide result
 */
export class Result extends BaseResult {
    readonly type: ResultType.Result = ResultType.Result;
}

/**
 * @desc Result of the current Action Set
 */
export class AsResult extends BaseResult {
    disabled: boolean = false;
    readonly type: ResultType.AsResult = ResultType.AsResult;
}

/**
 * @desc Result of the current Action Unit
 */
export class AuResult extends BaseResult {
    disabled: boolean = false;
    passCondition: string = "";
    readonly type: ResultType.AuResult = ResultType.AuResult;
}

export type ResultTypes = Result | AsResult | AuResult

export interface IResultFromIpc {
    readonly id: string,
    message: string,
    startedAt: number,
    finishedAt: number,
    _error: string,
    readonly type: ResultType,
    passCondition: string,      // ignored in Result and AsResult
    disabled?: boolean          // ignored in Result
}

export const DISABLED_ADD_MESSAGE = " is disabled."
