import React, {ChangeEvent, PureComponent} from "react";
import {IconNames} from "@blueprintjs/icons";
import {Button, Classes, Dialog, FormGroup, HTMLSelect, InputGroup, Intent, NumericInput} from "@blueprintjs/core";
import {LpUtils} from "../../_common/utils";
import moment from "moment";
import StorageService from "../../services/storage/storage.service";
import {DEFAULT_UNNAMED_PROJECT, PlcType, plcTypesForUi} from "../../_common/interfaces";
import {ProjectDialogService} from "../../services/app-dialogs.service";
import Logger, {isDev} from "../../_ui_common/logger.service";
import {DialogRequest, IProjectExpImp} from "../../_common/interfaces/ipc.interfaces";
import IpcRendererService from "../../services/ipc_renderer.service";

const logger = new Logger("ProjectDialogs");

export default class ProjectDialogs extends PureComponent {
    private unsubscribers: Function[] = [];
    private storage: StorageService = new StorageService();
    private projectDialog = new ProjectDialogService();
    private ipcComms = new IpcRendererService();
    private project = this.storage.getProject();

    state = {
        projectEdit_showDialog: false,
        projectEdit_newName: "",
        config_utTolerance: 0,
        plcEdit_ipAddress: this.project.plcConfig.ipAddress,
        plcEdit_cpuSlot: this.project.plcConfig.cpuSlot,
        plcEdit_type: this.project.plcConfig.type,

        newProject_showDialog: false,
        newProject_name: "",
    };

    componentDidMount() {
        this.unsubscribers.push(
            this.projectDialog.subscribeOnShowEditDialog(this.handleOnProjectConfigClick),
            this.projectDialog.subscribeOnShowNewDialog(this.handleCreateNewProjectClick),
            this.ipcComms.onCreatNewDialog(this.onCreatNewDialog)
        );
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    private onCreatNewDialog = (dialogType: DialogRequest) => {
        if (dialogType === DialogRequest.NewProject) this.handleCreateNewProjectClick();
    }


    // ----------------------------------------  PROJECT CONFIG  ----------------------------------------

    private handleOnProjectConfigClick = () => {
        this.project = this.storage.getProject();
        this.setState({
            projectEdit_showDialog: true,
            projectEdit_newName: this.project.name,
            config_utTolerance: this.project.config.unitTestTolerance,
            plcEdit_ipAddress: this.project.plcConfig.ipAddress,
            plcEdit_cpuSlot: this.project.plcConfig.cpuSlot,
            plcEdit_type: this.project.plcConfig.type,
        })
    };

    private handleOnBlurProjectName() {
        const newValue = this.state.projectEdit_newName || DEFAULT_UNNAMED_PROJECT;
        if (!this.project || this.project.name === newValue) return;
        this.patchProject("name", newValue, false);
    }

    private handleOnChangeTolerance = async (valueAsNumber: number) => {
        if (!this.project || !valueAsNumber || valueAsNumber < 1) return;

        this.project.config.unitTestTolerance = valueAsNumber;
        await this.storage.updateProject(this.project);
        this.setState({config_utTolerance: valueAsNumber});
    }

    private handleOnBlurIpAddress() {
        const newValue = this.state.plcEdit_ipAddress;
        if (!this.project || !LpUtils.isIpAddress(newValue) ||
            this.project.plcConfig.ipAddress === newValue) return;
        this.patchProject("ipAddress", newValue, true);
    }

    private handleOnChangePlcSlot(valueAsNumber: number) {
        if (!this.project || this.project.plcConfig.cpuSlot === valueAsNumber ||
            typeof valueAsNumber !== "number" ||
            valueAsNumber < 0) return;
        this.setState({plcEdit_cpuSlot: valueAsNumber});
        this.patchProject("cpuSlot", valueAsNumber, true);
    }

    private handleOnChangePlcType = async (e: ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value;
        if (this.project.plcConfig.type === type) return;
        if (!Object.keys(PlcType).includes(type)) return;

        this.setState({plcEdit_type: type});
        this.project.plcConfig.type = (type as PlcType);
        await this.storage.updateProject(this.project);
    }

    private patchProject(key: string, value: string | number | boolean, isPlcConfig: boolean) {
        if (!this.project) return;
        if (isPlcConfig) {
            // @ts-ignore
            this.project.plcConfig[key] = value;
        } else {
            // @ts-ignore
            this.project[key] = value;
        }
        this.storage.updateProject(this.project);
    }

    private handleProjectModifyDialogClose = () => this.setState({projectEdit_showDialog: false});


    // ---------------------------------------- NEW PROJECT  ----------------------------------------

    private handleCreateNewProjectClick = () => {
        this.setState({newProject_showDialog: true, newProject_name: ""})
    };

    private handleNewProjectDialogClose = (isConfirmed?: boolean) => {
        if (!isConfirmed) return this.setState({newProject_showDialog: false});

        this.setState({ newProject_showDialog: false }, () => {
            this.storage.clearProject(this.state.newProject_name);
        })
    };


    private impExpTest = (config: IProjectExpImp) => {
        this.setState({projectEdit_showDialog: false}, () => {
            this.projectDialog.projectExpImp(config)
        })
    }

    public render() {
        logger.log("render()");

        if (this.state.projectEdit_showDialog) {
            return (
                <Dialog
                    icon={IconNames.EDIT}
                    title="Edit Project Config"
                    onClose={() => this.handleProjectModifyDialogClose()}
                    autoFocus={true}
                    canEscapeKeyClose={false}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={this.state.projectEdit_showDialog}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY}>
                        <FormGroup
                            helperText={!(this.state.projectEdit_newName.length > 0) && "Name is required."}
                            intent={(!(this.state.projectEdit_newName.length > 0)) ? "danger" : "none"}
                            inline={true}
                            label={"Project Name"}
                        >
                            <InputGroup
                                placeholder="Give your project a name"
                                value={this.state.projectEdit_newName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    this.setState({projectEdit_newName: e.target.value})
                                }
                                onBlur={() => this.handleOnBlurProjectName()}
                            />
                        </FormGroup>
                        <FormGroup
                            inline={true}
                            label={"PLC Type"}
                        >
                            <HTMLSelect
                                onChange={this.handleOnChangePlcType}
                                value={this.state.plcEdit_type}
                            >
                                {plcTypesForUi.map(item => (
                                    <option key={item.key} value={item.key}>
                                        {item.value}
                                    </option>
                                ))}
                            </HTMLSelect>
                        </FormGroup>
                        <FormGroup
                            helperText={!LpUtils.isIpAddress(this.state.plcEdit_ipAddress) && "Not an IP address."}
                            intent={(!LpUtils.isIpAddress(this.state.plcEdit_ipAddress)) ? "danger" : "none"}
                            inline={true}
                            label={"PLC IP Address"}
                        >
                            <InputGroup
                                placeholder="xxx.xxx.xxx.xxx"
                                value={this.state.plcEdit_ipAddress}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    this.setState({plcEdit_ipAddress: e.target.value})
                                }
                                onBlur={() => this.handleOnBlurIpAddress()}
                            />
                        </FormGroup>
                        <FormGroup
                            inline={true}
                            label={"PLC CPU Slot"}
                        >
                            <NumericInput
                                min={0}
                                stepSize={1}
                                placeholder="PLC CPU Slot"
                                value={this.state.plcEdit_cpuSlot}
                                onValueChange={(valueAsNumber: number) => this.handleOnChangePlcSlot(valueAsNumber)}
                            />
                        </FormGroup>
                        {/*<FormGroup*/}
                        {/*    className="static-input-group"*/}
                        {/*    inline={true}*/}
                        {/*    label={"Firewall Status"}*/}
                        {/*    intent={Intent.DANGER}*/}
                        {/*>*/}
                        {/*    <p className={Classes.INTENT_PRIMARY}>*/}
                        {/*        {*/}
                        {/*            (this.state.isFirewallEnabled) ?*/}
                        {/*                "Firewall is blocking PLC connection" :*/}
                        {/*                "PLC connection is allowed"*/}
                        {/*        }*/}
                        {/*    </p>*/}
                        {/*</FormGroup>*/}
                        <h4>Action Config Parameters</h4>
                        <FormGroup
                            inline={true}
                            label={"Unit Test Tolerance,ms"}
                        >
                            <NumericInput
                                min={1}
                                stepSize={1}
                                value={this.state.config_utTolerance}
                                onValueChange={this.handleOnChangeTolerance}
                            />
                        </FormGroup>
                        <details>
                            <summary>Advanced</summary>
                            <p>
                                Project ID {this.project?.id}
                                <br/>
                                Project version {this.project?.version}
                                <br/>
                                Last modified at {moment(this.project?.modifiedOn).format("h:mm:ssa DD/MM/YYYY")}
                            </p>
                            {
                                (isDev) ?
                                    <div>
                                        {/*<button onClick={() => this.storage.confirmDbIntegrity()}>Test DB</button>*/}

                                        <button onClick={() => this.impExpTest({type: "import"})}>
                                            Import
                                        </button>

                                        <button onClick={() => this.impExpTest({type: "export"})}>
                                            Export
                                        </button>
                                    </div> :
                                    null
                            }
                        </details>
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.handleProjectModifyDialogClose()}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Dialog>
            );
        }

        if (this.state.newProject_showDialog) {
            // ------------------------------ Creating a New Project  --------------------------
            return (
                <Dialog
                    icon={IconNames.ADD}
                    title="Create New Project"
                    onClose={() => this.handleNewProjectDialogClose()}
                    autoFocus={true}
                    canEscapeKeyClose={false}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={this.state.newProject_showDialog}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY}>
                        <p>
                            Heads up! By creating a new project all existing data will be deleted. Current
                            project can be exported and imported later. The export option is located in File menu.
                        </p>
                        <FormGroup
                            inline={true}
                            label={"Project Name"}
                        >
                            <InputGroup
                                autoFocus
                                placeholder="Give your project a name"
                                value={this.state.newProject_name}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    this.setState({newProject_name: e.target.value})
                                }
                            />
                        </FormGroup>
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.handleNewProjectDialogClose()}>
                                Cancel
                            </Button>
                            <Button
                                intent={Intent.PRIMARY}
                                onClick={() => this.handleNewProjectDialogClose(true)}
                            >
                                Create New Project
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )
        }
        return (<div/>)
    }
}
