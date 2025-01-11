import React, {PureComponent} from "react";
import "./app-dilogs.scss";
import {AppConfigDialogService} from "../../services/app-dialogs.service";
import {Button, Classes, Dialog, FormGroup, Intent, NumericInput} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import IpcRendererService from "../../services/ipc_renderer.service";
import {AppConfig} from "../../_common/interfaces";


interface IAppDialogsState {
    appConfig_showDialog: boolean,
    appConfig_commsQueueDelay: number,
    appConfig_auQueueDelay: number,
    appConfig_asQueueDelay: number,
}

export default class AppDialogs extends PureComponent<{}, IAppDialogsState> {
    private unsubscribers: Function[] = [];
    private appDialog = new AppConfigDialogService();
    private ipcComms = new IpcRendererService();
    private appConfig? = new AppConfig();
    private defaultAppConfig = new AppConfig();

    constructor(props: {}) {
        super(props);

        this.state = {
            appConfig_showDialog: false,
            appConfig_commsQueueDelay: 0,
            appConfig_auQueueDelay: 0,
            appConfig_asQueueDelay: 0,
        }
    }

    componentDidMount() {
        this.unsubscribers.push(
            this.appDialog.showConfigDialogSubscriber(this.handleOnAppConfigClick),
        );
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }


    private handleOnAppConfigClick = async () => {
        this.appConfig = await this.ipcComms.getAppConfig();
        if (!this.appConfig) return;

        this.setState({
            appConfig_showDialog: true,
            appConfig_commsQueueDelay: this.appConfig.commsQueueDelay,
            appConfig_auQueueDelay: this.appConfig.auQueueDelay,
            appConfig_asQueueDelay: this.appConfig.asQueueDelay,
        })
    }

    private handleOnAppConfigSaveClick = async (isConfirm?: boolean) => {
        if (!isConfirm || !this.appConfig) return this.setState({appConfig_showDialog: false});

        const {appConfig_commsQueueDelay, appConfig_auQueueDelay, appConfig_asQueueDelay} = this.state;

        this.appConfig.commsQueueDelay = appConfig_commsQueueDelay;
        this.appConfig.auQueueDelay = appConfig_auQueueDelay;
        this.appConfig.asQueueDelay = appConfig_asQueueDelay;

        await this.ipcComms.setAppConfig(this.appConfig);

        this.setState({appConfig_showDialog: false});
    }

    render() {
        if (this.state.appConfig_showDialog) {

            const {commsQueueDelay, auQueueDelay, asQueueDelay} = this.defaultAppConfig;

            // ------------------------------ App Config  --------------------------
            return (
                <Dialog
                    icon={IconNames.EDIT}
                    title="Edit App Config"
                    onClose={() => this.handleOnAppConfigSaveClick()}
                    autoFocus={true}
                    canEscapeKeyClose={false}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={this.state.appConfig_showDialog}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY + " app-config-dialog"}>
                        <details>
                            <summary>Info</summary>
                            <p className="justify">
                                Timing in this application is very critical. It includes initiation and completion of
                                Action Units, internal steps of Action Unit execution with its communication requests to PLC.
                                On some weak PCs or capped Virtual Machines lack of CPU capabilities
                                results nuisance errors during the test execution. In the Test Runner output log
                                it can appear with TIMEOUT errors. Below are a few settings to adjust.
                            </p>
                        </details>
                        <br/>
                        <small className="justify">
                            "Comms Request Delay" is a time delay between packets sent to
                            PLC. <strong>Default is {commsQueueDelay}ms.</strong> Recommended range is from 0 to 50ms.
                            High number can result failure on expected value in Unit Tests.
                        </small>
                        <FormGroup
                            className="app-config-dialog-form-group"
                            inline={true}
                            label={"Comms Request Delay, ms"}
                        >
                            <NumericInput
                                min={0}
                                stepSize={1}
                                minorStepSize={1}
                                placeholder={"Default is 0"}
                                value={this.state.appConfig_commsQueueDelay}
                                onValueChange={(valueAsNumber: number) =>
                                    this.setState({appConfig_commsQueueDelay: valueAsNumber})
                                }
                            />
                        </FormGroup>
                        <small className="justify">
                            "Delay between Action Units" is a time delay execution of Action
                            Units. <strong>Default is {auQueueDelay}ms.</strong> Recommended range is from 0 to 500ms.
                        </small>
                        <FormGroup
                            className="app-config-dialog-form-group"
                            inline={true}
                            label={"Delay between Action Units, ms"}
                        >
                            <NumericInput
                                min={0}
                                stepSize={1}
                                minorStepSize={1}
                                placeholder={"Default is 0"}
                                value={this.state.appConfig_auQueueDelay}
                                onValueChange={(valueAsNumber: number) =>
                                    this.setState({appConfig_auQueueDelay: valueAsNumber})
                                }
                            />
                        </FormGroup>
                        <p> </p>

                        <small className="justify">
                            "Delay between Action Sets" is a time delay between execution of Action Sets. When one
                            Action Sets is completed the app will wait this amount of time before starting the next
                            one. <strong>Default is {asQueueDelay}ms.</strong> Recommended range is from 50 to 5000ms.
                        </small>
                        <FormGroup
                            className="app-config-dialog-form-group"
                            inline={true}
                            label={"Delay between Action Sets, ms"}
                        >
                            <NumericInput
                                min={0}
                                stepSize={1}
                                minorStepSize={1}
                                placeholder={"Default is 50"}
                                value={this.state.appConfig_asQueueDelay}
                                onValueChange={(valueAsNumber: number) =>
                                    this.setState({appConfig_asQueueDelay: valueAsNumber})
                                }
                            />
                        </FormGroup>
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.handleOnAppConfigSaveClick()}>
                                Cancel
                            </Button>
                            <Button
                                intent={Intent.PRIMARY}
                                onClick={() => this.handleOnAppConfigSaveClick(true)}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )
        }
        return (<div/>)
    }
}
