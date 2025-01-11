import React, {ChangeEvent, PureComponent} from "react";
import {IconNames} from "@blueprintjs/icons";
import {Alert, Button, Classes, Dialog, FormGroup, InputGroup, Intent} from "@blueprintjs/core";
import Logger from "../../_ui_common/logger.service";
import PubSub_LP, {EventTopic} from "../../services/_pubsub.aclass";
import {LpUtils} from "../../_common/utils";

const logger = new Logger("ConfirmAlert");
const defaultMessage = "[blank message]";


let alertResponseCallback: Function | undefined;
let promptResponseCallback: Function | undefined;

export class ConfirmAlertService extends PubSub_LP {

    /**
     * This called when Confirm Alert is needed. It returns Promise which is called on alertResponse().
     * @param message
     * @returns Promise<boolean>
     */
    public async isConfirmed(message: string): Promise<boolean> {
        this.dispatchEvent(EventTopic.ConfirmAlert, message);
        return new Promise( resolve => alertResponseCallback = resolve)
    }

    public alertResponse(isConfirmed: boolean) {
        if (typeof alertResponseCallback === "function") alertResponseCallback(isConfirmed);
    }

    public showDialogSubscriber(callback: (message: string) => void) {
        return this.subscribeOnChange(EventTopic.ConfirmAlert, callback)
    }


    public async isPrompted(message: string): Promise<string | null> {
        this.dispatchEvent(EventTopic.PromptAlert, message);
        return new Promise( resolve => promptResponseCallback = resolve)
    }
    public promptResponse(response: string | null) {
        if (typeof promptResponseCallback === "function") promptResponseCallback(response);
    }
    public showPromptSubscriber(callback: (message: string) => void) {
        return this.subscribeOnChange(EventTopic.PromptAlert, callback)
    }
}




export default class ConfirmAlert extends PureComponent {
    private confAlertAService = new ConfirmAlertService();

    state = {
        confirmWin_showAlert: false,
        confirmWin_message: defaultMessage,
        confirmWin_showPrompt: false,
        promptResponse: ""
    };

    private unsubscribers: Function[] = [];

    componentDidMount() {
        this.unsubscribers.push(
            this.confAlertAService.showDialogSubscriber(this.onShowRequest),
            this.confAlertAService.showPromptSubscriber(this.onShowPrompt),
        );
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    private onShowRequest = (message: string) => {
        this.setState({confirmWin_message: message, confirmWin_showAlert: true});
    };
    private handleClosed(isConfirmed: boolean) {
        this.confAlertAService.alertResponse(isConfirmed);
        this.setState({confirmWin_message: defaultMessage, confirmWin_showAlert: false})
    }

    private onShowPrompt = (message: string) => {
        this.setState({
            promptResponse: "",
            confirmWin_message: message,
            confirmWin_showPrompt: true
        });
    };
    private handlePromptsClosed(isConfirmed?: boolean) {
        const response = !isConfirmed ? null : this.state.promptResponse;
        this.confAlertAService.promptResponse(response);
        this.setState({confirmWin_message: defaultMessage, confirmWin_showPrompt: false})
    }

    render() {
        logger.log("render()");

        return (
            <div>
                <Alert
                    canEscapeKeyCancel={false}
                    canOutsideClickCancel={false}
                    cancelButtonText="Cancel"
                    confirmButtonText="Confirm"
                    icon={IconNames.WARNING_SIGN}
                    intent={Intent.WARNING}
                    isOpen={this.state.confirmWin_showAlert}
                    onCancel={() => this.handleClosed(false)}
                    onConfirm={() => this.handleClosed(true)}
                >
                    <p>{this.state.confirmWin_message}</p>
                </Alert>

                <Dialog
                    onOpened={(e) =>
                        LpUtils.listenForEnter(e, () => this.handlePromptsClosed(true))
                    }
                    onClose={() => this.handlePromptsClosed()}
                    autoFocus={true}
                    canEscapeKeyClose={true}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={this.state.confirmWin_showPrompt}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY}>
                        <p>{this.state.confirmWin_message}</p>
                        <FormGroup
                            inline={true}
                            label={"Response"}
                        >
                            <InputGroup
                                autoFocus={true}
                                value={this.state.promptResponse}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    this.setState({promptResponse: e.target.value})
                                }
                            />
                        </FormGroup>
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.handlePromptsClosed()}>
                                Cancel
                            </Button>
                            <Button
                                intent={Intent.PRIMARY}
                                onClick={() => this.handlePromptsClosed(true)}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </div>
        );
    }
}
