import React, {ChangeEvent, PureComponent} from "react";
import StorageService, {
    AddActionUnitConfig,
    MoveToActionUnitConfig
} from "../../services/storage/storage.service";
import {ActionUnitDialogService} from "../../services/app-dialogs.service";
import {getDefLastAsPosition, getSupportedActionUnits, IOptionObject} from "../../_ui_common/ui.interfaces";
import Logger, {ERRORS} from "../../_ui_common/logger.service";
import {Alert, Button, Classes, Dialog, FormGroup, HTMLSelect, InputGroup, Intent} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import {LpUtils} from "../../_common/utils";
import {listActionSetsOptions} from "./action-set-dialog";
import {ActionUnitType, DEFAULT_AU_NAME} from "../../_common/action-unit";
import DetailsPanelService from "../../services/details-panel.service";


const logger = new Logger("ActionUnitDialogs");


interface ActionUnitDialogsState {
    auAdd_conf: AddActionUnitConfig,
    auMoveTo_conf: MoveToActionUnitConfig,
    auMoveTo_showDialog: boolean,

    auDelete_showDialog: boolean,
    auDelete_id: string,
}

export default class ActionUnitDialogs extends PureComponent<{}, ActionUnitDialogsState> {
    private unsubscribers: Function[] = [];
    private storage: StorageService = new StorageService();
    private auService = new ActionUnitDialogService();
    private detailsPanelService = new DetailsPanelService();

    state = {
        auMoveTo_conf: getDefAuMoveToConf(),
        auMoveTo_showDialog: false,

        auDelete_showDialog: false,
        auDelete_id: "",

        auAdd_conf: getDefAddActionUnitConfig(),
    };

    componentDidMount() {
        this.unsubscribers.push(
            this.auService.showAddDialogSubscriber(this.auAdd_request),
            this.auService.showMoveToDialogSubscriber(this.auMoveTo_handleRequestClick),
            this.auService.showDeleteDialogSubscriber(this.auDel_handleRequest),
        );
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }



    public auAdd_request = async (actionSetId?: string) => {
        if (!await this.detailsPanelService.isConfirmedToProceed()) return;

        const insertBeforeId = getDefLastAsPosition().key;
        let newActionSetId: string = "";
        if (actionSetId) {
            newActionSetId = actionSetId;
        } else {
            const as = this.storage.getFirstActionSet();
            newActionSetId = as?.id || "";
        }
        if (!newActionSetId) return logger.error(ERRORS.err011);

        this.setState({
            auAdd_conf: {
                ...getDefAddActionUnitConfig(),
                showDialog: true,
                actionSetId: newActionSetId,
                insertBeforeId
            }
        })
    };

    private auAdd_handleNameChange(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            auAdd_conf: {
                ...this.state.auAdd_conf,
                name: e.target.value
            }
        })
    }

    private auAdd_handleNewParentId(e: ChangeEvent<HTMLSelectElement>) {
        const newActionSetId = e.target.value;

        this.setState({
            auAdd_conf: {
                ...this.state.auAdd_conf,
                actionSetId: newActionSetId
            }
        });
    }

    private auAdd_handleInsertBeforeId(e: ChangeEvent<HTMLSelectElement>) {
        this.setState({
            auAdd_conf: {
                ...this.state.auAdd_conf,
                insertBeforeId: e.target.value
            }
        });
    }

    private auAdd_handleTypeSelect(e: ChangeEvent<HTMLSelectElement>) {
        const key = e.target.value;
        const type = getSupportedActionUnits().find(item => item.key === key)?.key;
        if (!type) return logger.error(ERRORS.ws004 + ` [${type}]`);
        const auAdd_conf: AddActionUnitConfig = {
            ...this.state.auAdd_conf,
            type: (type as ActionUnitType),
        };
        this.setState({auAdd_conf});
    }

    private async auAdd_handleDialogClosed(isConfirmed?: boolean) {
        // Canceled
        if (!isConfirmed) {
            this.setState({
                auAdd_conf: {...this.state.auAdd_conf, showDialog: false }
            });
            return;
        }

        try {
            await this.storage.addActionUnit(this.state.auAdd_conf);
        } catch (e) {
            logger.error(e);
        }

        this.setState({
            auAdd_conf: getDefAddActionUnitConfig()
        });
    };



    // ------------------- Move Action Unit

    private auMoveTo_handleRequestClick = async (actionUnitId: string) => {
        if (!await this.detailsPanelService.isConfirmedToProceed()) return;


        const actionUnit = this.storage.getActionUnit(actionUnitId);
        if (!actionUnit) return logger.error(ERRORS.err018);

        const config: MoveToActionUnitConfig = {
            actionUnitId: actionUnit.id,
            insertBeforeId: getDefLastAsPosition().key,
            fromActionSetId: actionUnit.parentId,
            toActionSetId: this.state.auMoveTo_conf.toActionSetId
        };
        if (!config.toActionSetId) {
            const as = this.storage.getActionSet(actionUnit.parentId);
            if (!as) return logger.error(ERRORS.err000);
            config.toActionSetId = as.id;
        }
        this.setState({
            auMoveTo_showDialog: true,
            auMoveTo_conf: config,
        });
    };

    private auMoveTo_handleNewParentId = (e: ChangeEvent<HTMLSelectElement>) => {
        this.setState({
            auMoveTo_conf: {
                ...this.state.auMoveTo_conf,
                toActionSetId: e.target.value,
                insertBeforeId: getDefLastAsPosition().key
            }
        });
    };

    private auMoveTo_handleInsertBeforeId = (e: ChangeEvent<HTMLSelectElement>) => {
        this.setState({
            auMoveTo_conf: {
                ...this.state.auMoveTo_conf,
                insertBeforeId: e.target.value
            }
        });
    };

    private auMoveTo_handleDialogClose = async (isOk?: boolean) => {
        if (!isOk) return this.setState({auMoveTo_showDialog: false});

        const actionUnit = this.storage.getActionUnit(this.state.auMoveTo_conf.actionUnitId);
        if (!actionUnit) return logger.error(ERRORS.err018);

        try {
            await this.storage.moveActionUnit(this.state.auMoveTo_conf);
        } catch (e) {
            logger.error(e);
        }


        this.setState({auMoveTo_showDialog: false});
    };


    // ----------- Delete Action Unit

    private auDel_handleRequest = (actionUnitId: string) => {
        this.setState({
            auDelete_showDialog: true,
            auDelete_id: actionUnitId
        });
    };

    private auDel_handleDialogClosed = (isConfirmed?: boolean) => {
        if (!isConfirmed) return this.setState({auDelete_showDialog: false});

        const actionUnitToDelete = this.storage.getActionUnit(this.state.auDelete_id);
        if (!actionUnitToDelete) return logger.error(ERRORS.aud000);

        this.storage.deleteActionUnit(actionUnitToDelete);

        // this.showStartPage();

        this.setState({auDelete_showDialog: false});
    };




    render() {

        const {auAdd_conf} = this.state;

        if (auAdd_conf.showDialog) {
            return (
                <Dialog
                    onOpened={(e) =>
                        LpUtils.listenForEnter(e, () => this.auAdd_handleDialogClosed(true))
                    }
                    icon={IconNames.INFO_SIGN}
                    onClose={() => this.auAdd_handleDialogClosed()}
                    title="Add Action Unit"
                    autoFocus={true}
                    canEscapeKeyClose={true}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={auAdd_conf.showDialog}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY}>
                        <p>
                            To add new Action provide the following details:
                        </p>
                        <FormGroup
                            inline={true}
                            label={"Action Type"}
                        >
                            <HTMLSelect
                                onChange={(e) => {this.auAdd_handleTypeSelect(e)}}
                                value={auAdd_conf.type}
                            >
                                {getSupportedActionUnits().map(item => (
                                    <option key={item.key} value={item.key}>
                                        {item.value}
                                    </option>
                                ))}
                            </HTMLSelect>
                        </FormGroup>
                        <FormGroup
                            helperText={!LpUtils.isValidAuName(auAdd_conf.name) && "Name is required."}
                            intent={(!LpUtils.isValidAuName(auAdd_conf.name)) ? "danger" : "none"}
                            inline={true}
                            label={"Action Name"}
                        >
                            <InputGroup
                                placeholder="What it should do (in a few words)"
                                value={this.state.auAdd_conf.name}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {this.auAdd_handleNameChange(e)}}
                            />
                        </FormGroup>
                        <FormGroup
                            inline={true}
                            label={"Add to"}
                        >
                            <HTMLSelect
                                onChange={(e) => {this.auAdd_handleNewParentId(e)}}
                                value={this.state.auAdd_conf.actionSetId}
                            >
                                {listActionSetsOptions().map(item => (
                                    <option key={item.key} value={item.key}>
                                        {item.value}
                                    </option>
                                ))}
                            </HTMLSelect>
                        </FormGroup>
                        <FormGroup
                            inline={true}
                            label={"Insert before"}
                        >
                            <HTMLSelect
                                onChange={(e) => {this.auAdd_handleInsertBeforeId(e)}}
                                value={this.state.auAdd_conf.insertBeforeId}
                            >
                                {listActionUnitsOptions(this.state.auAdd_conf.actionSetId, true)
                                    .map(item => (
                                        <option key={item.key} value={item.key}>
                                            {item.value}
                                        </option>
                                    ))}
                            </HTMLSelect>
                        </FormGroup>
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.auAdd_handleDialogClosed()}>
                                Cancel
                            </Button>
                            <Button
                                intent={Intent.PRIMARY}
                                onClick={() => this.auAdd_handleDialogClosed(true)}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )
        }

        if (this.state.auMoveTo_showDialog) {
            return (
                <Dialog
                    onOpened={(e) =>
                        LpUtils.listenForEnter(e, () => this.auMoveTo_handleDialogClose(true))
                    }
                    icon={IconNames.MOVE}
                    title="Move Action"
                    onClose={() => this.auMoveTo_handleDialogClose()}
                    autoFocus={true}
                    canEscapeKeyClose={true}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={this.state.auMoveTo_showDialog}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY}>
                        <div>
                            <p>
                                Choose where to move it.
                            </p>
                            <FormGroup
                                inline={true}
                                label={"Move to"}
                            >
                                <HTMLSelect
                                    autoFocus
                                    onChange={(e) => {this.auMoveTo_handleNewParentId(e)}}
                                    value={this.state.auMoveTo_conf.toActionSetId}
                                >
                                    {listActionSetsOptions().map(item => (
                                        <option key={item.key} value={item.key}>
                                            {item.value}
                                        </option>
                                    ))}
                                </HTMLSelect>
                            </FormGroup>
                            <FormGroup
                                inline={true}
                                label={"Insert before"}
                            >
                                <HTMLSelect
                                    onChange={(e) => {this.auMoveTo_handleInsertBeforeId(e)}}
                                    value={this.state.auMoveTo_conf.insertBeforeId}
                                >
                                    {listActionUnitsOptions(
                                        this.state.auMoveTo_conf.toActionSetId,
                                        true,
                                        this.state.auMoveTo_conf.actionUnitId
                                    ).map(item => (
                                        <option key={item.key} value={item.key}>
                                            {item.value}
                                        </option>
                                    ))}
                                </HTMLSelect>
                            </FormGroup>
                        </div>
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.auMoveTo_handleDialogClose()}>
                                Cancel
                            </Button>
                            <Button
                                intent={Intent.PRIMARY}
                                onClick={() => this.auMoveTo_handleDialogClose(true)}
                            >
                                Move
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )
        }

        if (this.state.auDelete_showDialog) {
            return (
                <Alert
                    canEscapeKeyCancel={true}
                    canOutsideClickCancel={false}
                    cancelButtonText="Cancel"
                    confirmButtonText="Delete"
                    icon={IconNames.TRASH}
                    intent={Intent.DANGER}
                    isOpen={this.state.auDelete_showDialog}
                    onCancel={() => this.auDel_handleDialogClosed()}
                    onConfirm={() => this.auDel_handleDialogClosed(true)}
                >
                    <p>
                        Are you sure you want to delete
                        <b>{this.storage.getActionUnit(this.state.auDelete_id)?.name}</b>? This
                        action cannot be undone.
                    </p>
                </Alert>
            )
        }
        return (<div/>)
    }

}


export function listActionUnitsOptions(actionSetId: string, isLastToBeAdded?: boolean, currentActionUnitId?: string): IOptionObject[] {
    const storage = new StorageService();
    const out = [];
    const actionSet = storage.getActionSet(actionSetId);
    if (actionSet) {
        for (const actionUnitId of actionSet.actionUnitIds) {
            const actionUnit = storage.getActionUnit(actionUnitId);
            if (!actionUnit || actionUnit.id === currentActionUnitId) continue;
            out.push({
                key: actionUnit.id,
                value: actionUnit.name
            })
        }
    }
    if (isLastToBeAdded) out.push(getDefLastAsPosition());
    return out;
}

function getDefAddActionUnitConfig(): AddActionUnitConfig {
    return {
        showDialog: false,
        name: DEFAULT_AU_NAME,
        insertBeforeId: "",
        actionSetId: "",
        actionUnitId: "",
        type: ActionUnitType.SetTagValue
    }
}

function getDefAuMoveToConf (): MoveToActionUnitConfig {
    return {
        actionUnitId: "",
        insertBeforeId: "",
        toActionSetId: "",
        fromActionSetId: "",
    }
}
