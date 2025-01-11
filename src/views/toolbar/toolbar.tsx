import React, {PureComponent} from "react";
import "./toolbar.scss";
import {
    Alignment,
    Button,
    Classes,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Navbar,
    Popover,
    PopoverPosition
} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import StorageService from "../../services/storage/storage.service";
import {Project} from "../../_common/interfaces";
import {ActionSetDialogService, ActionUnitDialogService, ProjectDialogService} from "../../services/app-dialogs.service";
import DetailsPanelService from "../../services/details-panel.service";
import {DpDisplayedType} from "../../_common/interfaces";
import Logger from "../../_ui_common/logger.service";
import IpcRendererService from "../../services/ipc_renderer.service";

const logger = new Logger("Toolbar");

interface ToolbarProps {}
interface ToolbarState {
    disableAddActionsMenu: boolean,
    projectName: string,
    isTestRunning: boolean,
}

export default class Toolbar extends PureComponent<ToolbarProps, ToolbarState> {
    unsubscribers: Function[] = [];
    private storage = new StorageService();
    private projectDialog = new ProjectDialogService();
    private detailsPanelService = new DetailsPanelService();
    private asDialogService = new ActionSetDialogService();
    private auDialogService = new ActionUnitDialogService();
    private ipcComms = new IpcRendererService();


    constructor(props: ToolbarProps) {
        super(props);

        this.state = {
            disableAddActionsMenu: true,
            projectName: "",
            isTestRunning: false,
        }
    }

    async componentDidMount() {
        this.unsubscribers.push(
            this.storage.subscribeOnUpdateProject(this.rerenderProjectName),
        );
        this.rerenderProjectName(this.storage.getProject())
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    private handleNewClick = () => {
        const length = this.storage.countActionSets();
        this.setState({disableAddActionsMenu: length === 0})
    };

    private rerenderProjectName = (project: Project) => {
        this.setState({projectName: project.name})
    };

    private onAddActionSet = () => this.asDialogService.showEditDialog();
    private onAddActionUnit = async () => {
        if (!await this.detailsPanelService.isConfirmedToProceed()) return;
        this.auDialogService.showAddDialog();
    };

    private onTagsClick = async () => {
        if (!await this.detailsPanelService.isConfirmedToProceed()) return;

        this.detailsPanelService.showPage(DpDisplayedType.TagsPage);
    };

    private onRunTestClick = async () => {
        await this.ipcComms.openRunner();
    }

    render() {
        logger.log("render()");

        return (
            <Navbar className={Classes.DARK}>
                <Navbar.Group align={Alignment.LEFT}>
                    <Popover position={PopoverPosition.BOTTOM_LEFT}>
                        <Button
                            intent={Intent.PRIMARY}
                            rightIcon={IconNames.CARET_DOWN}
                            icon={IconNames.ADD}
                            text={"New"}
                            onClick={this.handleNewClick}
                        />
                        <Menu >
                            <MenuItem
                                text="Action"
                                disabled={this.state.disableAddActionsMenu}
                                icon={IconNames.DOCUMENT}
                                onClick={this.onAddActionUnit}
                            />
                            <MenuItem
                                text="Action Set"
                                icon={IconNames.FOLDER_NEW}
                                onClick={this.onAddActionSet}
                            />
                            <MenuDivider />
                            <MenuItem
                                text="Project"
                                icon={IconNames.CUBE_ADD}
                                onClick={() => this.projectDialog.showNewDialog()}
                            />
                        </Menu>
                    </Popover>
                    <span className="button-spacer"/>
                    <Button
                        intent={Intent.NONE}
                        icon={IconNames.TAG}
                        onClick={this.onTagsClick}
                        text={"Tags"}
                    />
                    <Navbar.Divider />
                    <Button minimal={false} icon={IconNames.SETTINGS} onClick={() => this.projectDialog.showEditDialog()}/>
                    <span className="button-spacer"/>
                    <Navbar.Heading>{this.state.projectName}</Navbar.Heading>
                </Navbar.Group>
                <Navbar.Group align={Alignment.RIGHT}>
                    <Button
                        intent={Intent.SUCCESS}
                        // icon={IconNames.TICK}
                        text={"Test Runner"}
                        onClick={this.onRunTestClick}
                    />
                    {/*<Navbar.Divider />*/}
                    {/*<Button minimal={true} icon={IconNames.PERSON}/>*/}
                </Navbar.Group>
            </Navbar>
        );
    }
}
