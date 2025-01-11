import React, {PureComponent} from "react";
import "./statusbar.scss"
import {
    Button,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    PopoverPosition,
    Spinner,
    Tooltip
} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import {Position} from "@blueprintjs/core";
import {Intent} from "@blueprintjs/core";
import WorkspaceService from "../../services/workspace.service";
import Logger from "../../_ui_common/logger.service";
import {IRunnerStatus} from "../../_common/interfaces/ipc.interfaces";
import IpcRendererService from "../../services/ipc_renderer.service";
import {DOCS_LINK, REPORT_BUG_LINK, SUGGESTION_LINK} from "../../_common/defaults";
import {AppConfigDialogService} from "../../services/app-dialogs.service";

const logger = new Logger("Statusbar");

interface StatusbarProps {}

interface StatusbarState {
    hideSidebar: boolean
    isTestRunning: boolean
}

export default class Statusbar extends PureComponent<StatusbarProps, StatusbarState> {
    private workspaceService = new WorkspaceService();
    private ipcComms = new IpcRendererService();
    private openExternal = window.electronApi ? window.electronApi.openExternal : undefined;
    private appDialog = new AppConfigDialogService();

    constructor(props: StatusbarProps) {
        super(props);
        this.state = {
            hideSidebar: false,
            isTestRunning: false,
        }
    }

    unsubscribers: Function[] = [];
    async componentDidMount() {
        this.unsubscribers.push(
            this.ipcComms.onRunnerStatusChangeSubscriber(this.onRunnerStatusChanged)
        );
        const isTestRunning = await this.ipcComms.isRunnerActive();
        this.setState({isTestRunning, hideSidebar: this.workspaceService.isHiddenSidebar})
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    private handleHideSidebar = () => {
        this.workspaceService.hideSidebar(!this.state.hideSidebar);
        this.setState({hideSidebar: !this.state.hideSidebar})
    };

    private handleApConfigClick = () => {
        this.appDialog.showConfigDialog();
    }

    private onRunnerStatusChanged = (status: IRunnerStatus) => {
        this.setState({isTestRunning: status.isRunning})
    }

    private onExternalClick = async (link: string) => {
        if (this.openExternal) await this.openExternal(link);
    }


    render() {
        logger.log("render()");
        return (
            <div className="status-bar">
                <div className="sb-section sb-section--left">
                    <Tooltip content="App config" position={Position.TOP_LEFT}>
                        <Button
                            minimal={true}
                            small={true}
                            icon={IconNames.COG}
                            onClick={this.handleApConfigClick}
                        />
                    </Tooltip>
                    <span className="button-spacer-mini"/>
                    <Tooltip content="Hide/Show left panel" position={Position.TOP_LEFT}>
                        <Button
                            minimal={true}
                            small={true}
                            icon={IconNames.COLUMN_LAYOUT}
                            intent={this.state.hideSidebar? Intent.NONE : Intent.SUCCESS}
                            onClick={this.handleHideSidebar}
                        />
                    </Tooltip>
                </div>
                <div className="sb-section sb-section--right">
                    {
                        (this.state.isTestRunning) ?
                            <div style={{height: "15px"}}>
                                <Tooltip content="Test is in progress" position={Position.TOP_RIGHT}>
                                    <Spinner intent={Intent.WARNING} size={15}/>
                                </Tooltip>
                                <span className="button-spacer-mini"/>
                            </div> : null
                    }
                    <Popover minimal={true} position={PopoverPosition.TOP_RIGHT}>
                        <Button
                            minimal={true}
                            small={true}
                            icon={IconNames.HELP}
                        />
                        <Menu>
                            <MenuItem
                                text="Documentation"
                                icon={IconNames.GIT_REPO}
                                target={"_blank"}
                                onClick={() => this.onExternalClick(DOCS_LINK)}
                                href={this.openExternal ? undefined : DOCS_LINK}
                            />
                            <MenuDivider />
                            <MenuItem
                                text="Report bug"
                                icon={IconNames.ERROR}
                                target={"_blank"}
                                onClick={() => this.onExternalClick(REPORT_BUG_LINK)}
                                href={this.openExternal ? undefined : REPORT_BUG_LINK}
                            />
                            <MenuItem
                                text="Ask question"
                                icon={IconNames.CHAT}
                                target={"_blank"}
                                onClick={() => this.onExternalClick(SUGGESTION_LINK)}
                                href={this.openExternal ? undefined : SUGGESTION_LINK}
                            />
                        </Menu>
                    </Popover>
                </div>
            </div>
        );
    }
}
