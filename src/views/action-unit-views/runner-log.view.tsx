import React, {ChangeEvent} from "react";
import {FormGroup, InputGroup} from "@blueprintjs/core";
import {PanelHeader} from "./_au-shared.view";
import {ActionUnitType, IRunnerLogAU} from "../../_common/action-unit";
import {AuGenericView, AuGenericViewProps, AuGenericViewState} from "./_au-generic.view";


interface LogMessagePluginState extends AuGenericViewState {
    logMessage: string
}
export default class RunnerLogAuView extends AuGenericView<AuGenericViewProps, LogMessagePluginState> {
    protected actionUnit = (this.detailsPanelService.actionUnit as IRunnerLogAU);

    constructor(props: AuGenericViewProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.RunnerLog)
            throw new Error("RunnerLogAuView supports IRunnerLogAU only but got " + this.actionUnit.type);

        this.state = {
            logMessage: this.actionUnit.params.logMessage
        };
    }

    private handleLogMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
        this.detailsPanelService.isDirty = true;
        this.setState({logMessage: e.target.value});
    };

    protected callPriorSave = () => {
        const logMessage = this.state.logMessage;
        if (!logMessage.trim())
            this.actionUnit.params.logMessage = `[empty message from ${this.actionUnit.name}]`;
    };

    public renderBody() {
        const {logMessage} = this.state;

        return (
            <div className="plugins--test-config">
                <PanelHeader title="Execution parameters"/>

                <div className="vertical-spacer-25"/>

                <FormGroup
                    className="lp-panel-form-group"
                    helperText={!(logMessage.trim().length > 0) && "Log message is required"}
                    intent={(!(logMessage.trim().length > 0)) ? "danger" : "none"}
                    inline={true}
                    label={"Log Message *"}
                    labelFor="log-message-input"
                >
                    <InputGroup
                        id="log-message-input"
                        placeholder="Type a message to see in the console"
                        value={logMessage}
                        onChange={this.handleLogMessageChange}
                    />
                </FormGroup>

            </div>
        )
    }
}
