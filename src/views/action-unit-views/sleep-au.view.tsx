import React from "react";
import {FormGroup, NumericInput} from "@blueprintjs/core";
import {PanelHeader} from "./_au-shared.view";
import {ActionUnitType, ISleepAU} from "../../_common/action-unit";
import {AuGenericView, AuGenericViewProps, AuGenericViewState} from "./_au-generic.view";


interface SleepAuState extends AuGenericViewState {
    sleep_s: number
}
export default class SleepAuView extends AuGenericView<AuGenericViewProps, SleepAuState> {
    protected actionUnit = (this.detailsPanelService.actionUnit as ISleepAU);

    constructor(props: AuGenericViewProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.Sleep)
            throw new Error("SleepAuView supports ISleepAU only but got " + this.actionUnit.type);

        this.state = {
            sleep_s: this.actionUnit.params.sleep_s
        };
    }

    private handleSleepTimeChange = (valueAsNumber: number) => {
        if (this.state.sleep_s === valueAsNumber ||
            (valueAsNumber !== 0 && !valueAsNumber) || valueAsNumber < 0.1) return;

        this.actionUnit.params.sleep_s = valueAsNumber;

        this.detailsPanelService.isDirty = true;
        this.setState({sleep_s: valueAsNumber});
    };

    public renderBody() {
        const {sleep_s} = this.state;

        return (
            <div className="plugins--test-config">
                <PanelHeader title="Execution parameters"/>

                <div className="vertical-spacer-25"/>

                <FormGroup
                    className="lp-panel-form-group"
                    inline={true}
                    label={"Time in seconds"}
                >
                    <NumericInput
                        min={0}
                        majorStepSize={1}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        placeholder="Sleep, s"
                        value={sleep_s}
                        onValueChange={this.handleSleepTimeChange}
                    />
                </FormGroup>

            </div>
        )
    }
}
