import React from "react";
import {IResultFromIpc, ResultType} from "../_common/interfaces/result.class";

export default class RunnerLogBuilder {
    private defaultIndent = " ";
    private projectIndent = "";
    private setIndent = this.defaultIndent.repeat(2);
    private unitIndent = this.defaultIndent.repeat(4);
    private brKeyCount = 0;
    private spanKeyCount = 0;

    private getBr(): JSX.Element {
        this.brKeyCount++;
        return (<br key={"brKeyCount" + this.brKeyCount}/>);
    }

    private getSpan(message: string, className?: string): JSX.Element {
        this.spanKeyCount++;
        const key = "spanKeyCount" + this.spanKeyCount;
        if (className) return (<span key={key} className={className}>{message}</span>);
        return (<span key={key}>{message}</span>);
    }

    public generateLine(result: IResultFromIpc, isFirst: boolean): JSX.Element[] {
        if (isFirst) this.resetCounters();

        const tempLog: JSX.Element[] = [];
        if (result.type === ResultType.Result) {
            if (!isFirst) tempLog.push(this.getBr(), this.getBr(), this.getBr());
            tempLog.push(this.getSpan(this.projectIndent + result.message));
            if (result._error) {
                tempLog.push(
                    this.getBr(),
                    this.getSpan(this.projectIndent + "  >> ERROR: " + result._error, "runner-fail")
                );
            }

        } else if (result.type === ResultType.AsResult) {
            tempLog.push(...[this.getBr(), this.getBr()]);
            tempLog.push(this.getSpan(this.setIndent + result.message));

        } else if (result.type === ResultType.AuResult) {
            tempLog.push(this.getBr());
            if (result.finishedAt < 0 || result.disabled) {
                tempLog.push(this.getSpan(this.unitIndent + result.message));
            } else {
                tempLog.push(this.getSpan(this.unitIndent + result.message));
                tempLog.push(this.getBr());
                tempLog.push(...this.generateAuResultPassOutput(result));
            }
        }
        return tempLog;
    }

    public generateAuResultPassOutput(result: IResultFromIpc, noIndent?: boolean): JSX.Element[] {
        const tempLog: JSX.Element[] = [];
        const elapsed = result.finishedAt - result.startedAt;
        const indent = (noIndent) ? "" : this.unitIndent + "  ";
        const condInd = indent + "   ";
        if (result._error) {
            tempLog.push(
                this.getSpan(indent + `\u2715 FAIL after ${elapsed}ms: ` + result._error, "runner-fail")
            );
        } else {
            tempLog.push(this.getSpan(indent + `\u2713 PASS after ${elapsed}ms: `,"runner-pass"));
            const conds = result.passCondition.split("\n");
            for (const cond of conds) {
                tempLog.push(this.getBr());
                tempLog.push(this.getSpan(condInd + cond, "runner-pass"));
            }

        }
        return tempLog;
    }

    public resetCounters() {
        this.brKeyCount = 0;
        this.spanKeyCount = 0;
    }
}
