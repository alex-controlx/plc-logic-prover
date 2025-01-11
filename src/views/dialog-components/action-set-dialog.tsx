import React, {ChangeEvent, Component} from "react";
import Logger, {ERRORS} from "../../_ui_common/logger.service";
import StorageService, {DeleteActionSetConfig, EditActionSetConfig} from "../../services/storage/storage.service";
import {ActionSetDialogService} from "../../services/app-dialogs.service";
import {getDefLastAsPosition, IOptionObject} from "../../_ui_common/ui.interfaces";
import {ActionSet, DEFAULT_AS_NAME} from "../../_common/interfaces";
import {LpUtils} from "../../_common/utils";
import {IconNames} from "@blueprintjs/icons";
import {Button, Classes, Dialog, FormGroup, HTMLSelect, InputGroup, Intent, Switch} from "@blueprintjs/core";
import IpcRendererService from "../../services/ipc_renderer.service";
import {DialogRequest} from "../../_common/interfaces/ipc.interfaces";

const logger = new Logger("ActionSetDialogs");

interface ActionUnitDialogsState {
    asEdit_conf: EditActionSetConfig,
    asDel_conf: DeleteActionSetConfig,
}

export default class ActionSetDialogs extends Component<{}, ActionUnitDialogsState> {
    private unsubscribers: Function[] = [];
    private storage: StorageService = new StorageService();
    private asService = new ActionSetDialogService();
    private ipcComms = new IpcRendererService();

    state = {
        asEdit_conf: getDefAddActionSetConfig(this.storage.getProject().id),
        asDel_conf: getDefDeleteActionSetConfig(this.storage.getProject().id),
    };


    componentDidMount() {
        this.unsubscribers.push(
            this.asService.showEditDialogSubscriber(this.asEdit_request),
            this.asService.showDeleteDialogSubscriber(this.asDel_request),
            this.ipcComms.onCreatNewDialog(this.onCreatNewDialog)
        );
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }


    private onCreatNewDialog = (dialogType: DialogRequest) => {
        if (dialogType === DialogRequest.NewActionSet) this.asEdit_request();
    }


    // --- Add Action Set to the ActionSets
    public asEdit_request = (actionSetId?: string) => {
        const asEdit_conf: EditActionSetConfig = {
            ...getDefAddActionSetConfig(this.storage.getProject().id),
            showDialog: true,
        };

        if (actionSetId) {
            const actionSetToEdit = this.storage.getActionSet(actionSetId);
            if (!actionSetToEdit) return logger.error(ERRORS.err014);

            logger.log("Editing:", actionSetToEdit.name);
            asEdit_conf.isAdding = false;
            // shallow copy the original Action Set for editing
            asEdit_conf.actionSet = actionSetToEdit;
            asEdit_conf.insertBeforeId = actionSetToEdit.id;
        }

        this.setState({asEdit_conf})
    };

    private asEdit_handleNameChange(e: ChangeEvent<HTMLInputElement>) {
        const asEdit_conf = this.state.asEdit_conf;
        asEdit_conf.actionSet.name = e.target.value;
        this.setState({asEdit_conf})
    }

    private asEdit_handleEnableSwitch() {
        const asEdit_conf = this.state.asEdit_conf;
        asEdit_conf.actionSet.enabled = !asEdit_conf.actionSet.enabled;
        this.setState({asEdit_conf})
    }

    private asEdit_handleNewParentId(e: ChangeEvent<HTMLSelectElement>) {
        const asEdit_conf = this.state.asEdit_conf;
        asEdit_conf.insertBeforeId = e.target.value;
        this.setState({asEdit_conf})
    }

    private async asEdit_handleDialogClosed(isConfirmed?: boolean) {
        if (!isConfirmed) {
            const asEdit_conf = this.state.asEdit_conf;
            asEdit_conf.showDialog = false;
            return this.setState({asEdit_conf})
        }

        await this.storage.editActionSet(this.state.asEdit_conf);

        this.setState({asEdit_conf: getDefAddActionSetConfig(this.storage.getProject().id)});
    };


    // --- DELETE Action Set
    private asDel_request = (actionSetId: string) => {
        const actionSetToDelete = this.storage.getActionSet(actionSetId);
        if (!actionSetToDelete) return logger.error(ERRORS.err015);

        // count number of Units in the Set
        const unitsToDeleteQty = actionSetToDelete.actionUnitIds.length;

        // list all Unit names
        const unitNamesToDelete: string = (unitsToDeleteQty > 0) ?
            actionSetToDelete.actionUnitIds
                .map(actionUnitId => this.storage.getActionUnit(actionUnitId)?.name)
                .join(", ") :
            "";

        this.setState({
            asDel_conf: {
                ...this.state.asDel_conf,
                actionSet: actionSetToDelete,
                moveToId: actionSetToDelete.id,
                unitsToDelete: unitNamesToDelete,
                unitsToDeleteQty: unitsToDeleteQty,
                showDialog: true,
            }
        });
    };

    private asDelete_handleNewParentId = (e: ChangeEvent<HTMLSelectElement>) => {
        this.setState({
            asDel_conf: {
                ...this.state.asDel_conf,
                moveToId: e.target.value,
            }
        });
    };

    private asDelete_handleDialogClosed = async (isConfirmed?: boolean) => {
        logger.log("Delete confirm clicked: " + this.state.asDel_conf.actionSet.name);
        // canceled
        if (!isConfirmed) return this.setState({asDel_conf: getDefDeleteActionSetConfig(this.storage.getProject().id)});

        const config = this.state.asDel_conf;
        // TODO clear Details Panel if
        // if (this.state.currentDetailsPanel.actionUnit &&
        //     (this.state.currentDetailsPanel.actionUnit).parentId === config.actionSet.id) {
        //     this.showStartPage();
        // }

        await this.storage.deleteActionSet(config);

        this.setState({asDel_conf: getDefDeleteActionSetConfig(this.storage.getProject().id)});
    };


    render() {
        const {asEdit_conf} = this.state;

        if (asEdit_conf.showDialog) {
            return (
                <Dialog
                    onOpened={(e) =>
                        LpUtils.listenForEnter(e, () => this.asEdit_handleDialogClosed(true))
                    }
                    icon={(asEdit_conf.isAdding) ? IconNames.ADD : IconNames.EDIT}
                    title={(asEdit_conf.isAdding) ? "Add Action Set" : "Edit Action Set"}
                    onClose={() => this.asEdit_handleDialogClosed()}
                    autoFocus={true}
                    canEscapeKeyClose={true}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={asEdit_conf.showDialog}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY}>
                        {
                            (asEdit_conf.isAdding) ?
                                <p>
                                    Info: Action set is a set of actions, such as write or read to tags,
                                    perform unit tests. Edit details of the set below:
                                </p> :
                                null
                        }
                        <FormGroup
                            helperText={!LpUtils.isValidAuName(asEdit_conf.actionSet.name) && "Name is required."}
                            intent={(!LpUtils.isValidAuName(asEdit_conf.actionSet.name)) ? "danger" : "none"}
                            inline={true}
                            label={"Name"}
                        >
                            <InputGroup
                                placeholder="Name the group"
                                value={asEdit_conf.actionSet.name}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {this.asEdit_handleNameChange(e)}}
                            />
                        </FormGroup>
                        <FormGroup
                            inline={true}
                            label={"Enable/Disable"}
                        >
                            <Switch
                                label={(asEdit_conf.actionSet.enabled) ? "Enabled" : "Disabled"}
                                checked={asEdit_conf.actionSet.enabled}
                                onChange={() => this.asEdit_handleEnableSwitch()}
                            />
                        </FormGroup>
                        <FormGroup
                            inline={true}
                            label={"Insert before"}
                        >
                            <HTMLSelect
                                onChange={(e) => {this.asEdit_handleNewParentId(e)}}
                                value={this.state.asEdit_conf.insertBeforeId}
                            >
                                {listActionSetsOptions(true).map(item => (
                                    <option key={item.key} value={item.key}>
                                        {item.value}
                                    </option>
                                ))}
                            </HTMLSelect>
                        </FormGroup>
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.asEdit_handleDialogClosed()}>
                                Cancel
                            </Button>
                            <Button
                                intent={Intent.PRIMARY}
                                onClick={() => this.asEdit_handleDialogClosed(true)}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )
        }

        if (this.state.asDel_conf.showDialog) {
            return (
                <Dialog
                    icon={IconNames.WARNING_SIGN}
                    title="Delete Action Set"
                    onClose={() => this.asDelete_handleDialogClosed()}
                    autoFocus={true}
                    canEscapeKeyClose={true}
                    canOutsideClickClose={false}
                    enforceFocus={true}
                    isOpen={this.state.asDel_conf.showDialog}
                    usePortal={true}
                >
                    <div className={Classes.DIALOG_BODY}>
                        {
                            (this.state.asDel_conf.unitsToDeleteQty === 0) ?
                                <p>No Actions in the Set. It is safe to delete.</p> :
                                <div>
                                    <p>
                                        The following {this.state.asDel_conf.unitsToDeleteQty} Action(s)
                                        <br/>
                                        <br/>
                                        {this.state.asDel_conf.unitsToDelete}
                                        <br/>
                                        <br/>
                                        will be deleted. Move it to another Set or leave it to be deleted.
                                        This cannot be undone.
                                    </p>
                                    <FormGroup
                                        inline={true}
                                        label={"Move Actions to"}
                                    >
                                        <HTMLSelect
                                            onChange={(e) => {
                                                this.asDelete_handleNewParentId(e)
                                            }}
                                            value={this.state.asDel_conf.moveToId}
                                        >
                                            {listActionSetsOptions().map(item => (
                                                <option key={item.key} value={item.key}>
                                                    {item.value}
                                                </option>
                                            ))}
                                        </HTMLSelect>
                                    </FormGroup>
                                </div>
                        }
                    </div>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button onClick={() => this.asDelete_handleDialogClosed()}>
                                Cancel
                            </Button>
                            <Button
                                intent={Intent.DANGER}
                                onClick={() => this.asDelete_handleDialogClosed(true)}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )
        }

        return (<div/>)
    }




}




function getDefAddActionSetConfig (projectId: string): EditActionSetConfig {
    return {
        showDialog: false,
        isAdding: true,
        actionSet: new ActionSet(DEFAULT_AS_NAME, projectId),
        insertBeforeId: getDefLastAsPosition().key
    }
}

function getDefDeleteActionSetConfig (projectId: string): DeleteActionSetConfig {
    return {
        actionSet: new ActionSet(DEFAULT_AS_NAME, projectId),
        unitsToDelete: "",
        unitsToDeleteQty: -1,
        showDialog: false,
        moveToId: ""
    }
}


export function listActionSetsOptions(isLastToBeAdded?: boolean): IOptionObject[] {
    const storage = new StorageService();
    const actionSetIds = storage.getProject().actionSetIds;
    const options = [];
    for (const actionSetId of actionSetIds) {
        const actionSet = storage.getActionSet(actionSetId);
        if (!actionSet) continue;
        options.push({
            key: actionSetId,
            value: actionSet.name
        })
    }

    if (isLastToBeAdded) options.push(getDefLastAsPosition());
    return options;
}
