import React from "react";
import {PanelHeader} from "./_au-shared.view";
import {ActionUnitType, IHeartbeatAU} from "../../_common/action-unit";
import {AuGenericView, AuGenericViewProps, AuGenericViewState} from "./_au-generic.view";
import {StfvtInputGroup} from "./_au-stfvt-group.view";
import {FormGroup, NumericInput} from "@blueprintjs/core";


interface HeartbeatAuState extends AuGenericViewState {
    duration_s: number
}

export default class HeartbeatAuView extends AuGenericView<AuGenericViewProps, HeartbeatAuState> {
    protected actionUnit = (this.detailsPanelService.actionUnit as IHeartbeatAU);

    constructor(props: AuGenericViewProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.Heartbeat)
            throw new Error("HeartbeatAuView supports IHeartbeatAU only but got " + this.actionUnit.type);

        this.state = {
            duration_s: this.actionUnit.params.duration_s
        };
    }

    private handleDurationChange = (value: number) => {
        if (value == null || isNaN(value) || value < 0) return;

        this.detailsPanelService.isDirty = true;
        this.actionUnit.params.duration_s = value;

        this.setState({duration_s: value})
    }

    public renderBody() {
        return (
            <div className="plugins--test-config">
                <PanelHeader title="Execution parameters"/>

                <div className="vertical-spacer-25"/>

                <FormGroup
                    className="lp-panel-form-group"
                    inline={true}
                    label={"Duration, s"}
                    helperText={"leave 0 for entire test"}
                >
                    <NumericInput
                        min={0}
                        stepSize={1}
                        value={this.state.duration_s}
                        onValueChange={this.handleDurationChange}
                    />
                </FormGroup>

                <StfvtInputGroup title={"Heartbeat Tags"} />
            </div>
        )
    }
}
