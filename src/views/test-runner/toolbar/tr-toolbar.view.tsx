import React, {PureComponent} from "react";
import {
    Alignment,
    Button,
    Intent,
    Navbar,
} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import Logger from "../../../_ui_common/logger.service";

const logger = new Logger("TestRunnerToolbarView");

interface ToolbarProps {
    isInvalid: boolean,
    onRunTest(): void,
    isRunning: boolean,
    onSaveClick(): void,
    onBellClick(): void,
}

export default class TestRunnerToolbarView extends PureComponent<ToolbarProps> {

    render() {
        logger.log("render()");

        return (
            <Navbar>
                <Navbar.Group align={Alignment.LEFT}>
                    <Button
                        intent={Intent.NONE}
                        icon={IconNames.SAVED}
                        onClick={this.props.onSaveClick}
                        text={"Save as text"}
                    />
                </Navbar.Group>
                <Navbar.Group align={Alignment.RIGHT}>
                    <Button
                        intent={(this.props.isRunning) ? Intent.DANGER : Intent.SUCCESS}
                        // icon={IconNames.TICK}
                        disabled={!this.props.isRunning && this.props.isInvalid}
                        text={(this.props.isRunning) ? "Abort" : "Start Runner"}
                        onClick={this.props.onRunTest}
                    />
                    <Navbar.Divider/>
                    <Button
                        intent={(this.props.isInvalid) ? Intent.DANGER : Intent.NONE}
                        minimal={true}
                        icon={IconNames.NOTIFICATIONS}
                        onClick={this.props.onBellClick}
                    />
                </Navbar.Group>
            </Navbar>
        );
    }
}
