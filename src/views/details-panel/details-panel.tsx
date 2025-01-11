import React, {PureComponent} from "react";
import "./details-panel.scss";
import {
    Button,
    Classes,
    H4,
    Icon,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    PopoverPosition,
} from "@blueprintjs/core";

import {IconNames} from "@blueprintjs/icons";
import moment from "moment";
import Logger, {ERRORS} from "../../_ui_common/logger.service";
import AbTagsPanel from "./ab-tags-panel";
import ResultsService from "../../services/storage/results_db.service";
import StorageService, {
    AddActionUnitConfig,
    DeleteActionSetConfig,
    MoveToActionUnitConfig
} from "../../services/storage/storage.service";
import StartPage from "./start-page";
import {DpDisplayedType, PlcType} from "../../_common/interfaces";
import DetailsPanelService from "../../services/details-panel.service";
import {ActionUnitDialogService} from "../../services/app-dialogs.service";
import {ActionUnitType, DEFAULT_UNNAMED_AU, IActionUnit} from "../../_common/action-unit";
import RunnerLogAuView from "../action-unit-views/runner-log.view";
import UnitTestAuView from "../action-unit-views/unit-test.view";
import CheckTagValueAuView from "../action-unit-views/check-tag-value.view";
import {IResultFromIpc} from "../../_common/interfaces/result.class";
import RunnerLogBuilder from "../../_ui_common/runner-log-builder";
import SleepAuView from "../action-unit-views/sleep-au.view";
import ResetTagValueAuView from "../action-unit-views/reset-tag-value.view";
import HeartbeatAuView from "../action-unit-views/heartbeat.view";
import {getActionUnitIcon, getSupportedActionUnits} from "../../_ui_common/ui.interfaces";
import SetTagValueAuView from "../action-unit-views/set-tag-value.view";
import {ProjectDbService} from "../../services/storage/project_db.service";
import SmpTagsPanelView from "./tags_panel_smp.view";

const logger = new Logger("DetailsPanel");
const DATE_FORMAT = "h:mm:ss a on D MMM YYYY";

interface DetailsPanelProps {}

interface DetailsPanelState {
    isDirty: boolean,
    result: IResultFromIpc | null,
    actionUnit: IActionUnit | undefined,
    displayed: DpDisplayedType,
    title: string,
    isResult: boolean,
}

export class DetailsPanel extends PureComponent<DetailsPanelProps, DetailsPanelState> {
    private unsubscribers: Function[] = [];
    private detailsPanelService = new DetailsPanelService();
    private storage = new StorageService();
    private resultsDb = new ResultsService();
    private auDialogService = new ActionUnitDialogService();
    private logBuilder = new RunnerLogBuilder();

    // keep constructor to avoid TS comments that actionUnit has type "never"
    constructor(props: DetailsPanelProps) {
        super(props);

        this.state = {
            isDirty: false,
            result: null,
            actionUnit: undefined,
            displayed: DpDisplayedType.StartPage,
            title: "Config ",
            isResult: true,
        }
    }

    async componentDidMount() {
        this.unsubscribers.push(
            this.detailsPanelService.showActionUnitSubscriber(this.onActionUnitSelection),
            this.detailsPanelService.showPageSubscriber(this.setCurrentView),
            this.detailsPanelService.isDirtySubscriber(this.onDpDirtyUpdate),

            this.storage.subscribeOnDeleteActionSet(this.onDeleteActionSet),

            this.storage.subscribeOnAddActionUnit(this.onAddOrMoveToActionUnit),
            this.storage.subscribeOnDeleteActionUnit(this.onDeleteActionUnit),
            this.storage.subscribeOnMoveActionUnit(this.onAddOrMoveToActionUnit),
            this.storage.subscribeOnUpdateActionUnit(this.onUpdateActionUnit),
        );

        // get last state from AppState Service
        const displayed = this.detailsPanelService.displayed;
        const isResultShown = this.detailsPanelService.isResultShown;
        if (displayed === DpDisplayedType.ActionUnit) {
            await this.onActionUnitSelection(this.detailsPanelService.actionUnitId);
        }

        this.setState({displayed, isResult: isResultShown});
    }

    componentWillUnmount(): void {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }


    private onActionUnitSelection = async (actionUnitId: string) => {
        const actionUnit = this.storage.getActionUnit(actionUnitId);
        if (!actionUnit) return logger.error(ERRORS.ws003);

        await this.setCurrentView(DpDisplayedType.ActionUnit, actionUnit);
    };


    private onDeleteActionSet = async (config: DeleteActionSetConfig) => {
        if (this.state.actionUnit && config.actionSet.actionUnitIds.includes(this.state.actionUnit.id)) {
            await this.setCurrentView(DpDisplayedType.StartPage);
        }
    };


    private onAddOrMoveToActionUnit = async (config: AddActionUnitConfig | MoveToActionUnitConfig) => {
        const actionUnit = this.storage.getActionUnit(config.actionUnitId);
        if (!actionUnit) return logger.error(ERRORS.ws003);
        await this.setCurrentView(DpDisplayedType.ActionUnit, actionUnit);
    };

    private onDeleteActionUnit = async (config: IActionUnit) => {
        if (!this.state.actionUnit || this.state.actionUnit.id !== config.id) return;
        await this.setCurrentView(DpDisplayedType.StartPage);
    };

    private onUpdateActionUnit = async (actionUnit: IActionUnit) => {
        await this.onActionUnitSelection(actionUnit.id)
    };

    // ------------------- Save Edited Action Unit

    private handleSaveClick = async (actionUnitFromDP: IActionUnit) => {

        // below is to check that not to save if the unit has been deleted and the details hasn't been cleared
        const actionSet = this.storage.getActionSet(actionUnitFromDP.parentId);
        if (!actionSet) return logger.error(ERRORS.ws000);
        if (!actionSet.actionUnitIds.includes(actionUnitFromDP.id))
            return logger.error(ERRORS.ws001);

        actionUnitFromDP.name = actionUnitFromDP.name || DEFAULT_UNNAMED_AU;
        try {
            await this.storage.updateActionUnit(actionUnitFromDP);
        } catch (e) {
            logger.error(e);
        }


        this.detailsPanelService.actionUnit = actionUnitFromDP;
    };


    // ------------------- Duplicate Action Unit

    /**
     * Duplicates the currently open Action units without opening it.
     */
    private handleAuDuplicateClick = async () => {
        if (!await this.detailsPanelService.isConfirmedToProceed()) return;

        const actionUnit = this.state.actionUnit;
        if (!actionUnit) return logger.error(ERRORS.ws002);

        try {
            await this.storage.duplicateActionUnit(actionUnit.id);
        } catch (e) {
            logger.error(e);
        }

    };


    // --------------------------------- SETTING CURRENT VIEW ---------------------------------

    private setCurrentView = async (displayed: DpDisplayedType, actionUnit?: IActionUnit) => {
        this.detailsPanelService.setDetailedPanelState(displayed, actionUnit, this.state.isResult);

        let actionUnitToDisplay;
        let result = null;
        if (displayed === DpDisplayedType.ActionUnit && actionUnit) {
            actionUnitToDisplay = actionUnit;
            result = await this.resultsDb.getResultFromDb(actionUnit.id);
            this.logBuilder.resetCounters();
        }

        this.detailsPanelService.isDirty = false;
        this.setState({
            actionUnit: actionUnitToDisplay,
            displayed,
            isDirty: false,
            result,
        });
    };


    // --------------------------------- ACTION UNIT DISPLAYING HANDLER ---------------------------------

    private pluginPanel = (actionUnit: IActionUnit) => {

        const viewProps = {
            key: actionUnit.id,
            onSave: this.handleSaveClick
        }
        switch (actionUnit.type) {
            case ActionUnitType.RunnerLog: return <RunnerLogAuView {...viewProps} />;
            case ActionUnitType.UnitTest: return <UnitTestAuView {...viewProps} />;
            case ActionUnitType.SetTagValue: return <SetTagValueAuView {...viewProps} />;
            case ActionUnitType.CheckTagValue: return <CheckTagValueAuView {...viewProps} />;
            case ActionUnitType.Sleep: return <SleepAuView {...viewProps} />;
            case ActionUnitType.ResetTagValue: return <ResetTagValueAuView {...viewProps} />;
            case ActionUnitType.Heartbeat: return <HeartbeatAuView {...viewProps} />;
            default: return (<div>Unsupported Action type!</div>)
        }
    };

    private onDpDirtyUpdate = (isDirty: boolean) => {
        this.setState({isDirty: isDirty});
    };

    private showResult = () => {
        this.setState({isResult: !this.state.isResult})
    }




    public render() {
        const {actionUnit} = this.state;
        logger.log("render()");

        if (this.state.displayed === DpDisplayedType.StartPage) {
            return <StartPage/>
        }

        if (this.state.displayed === DpDisplayedType.TagsPage) {
            return (
                <div className="details-panel-wrapper">
                    {
                        ProjectDbService.getProjectPlcType() === PlcType.AB_CL ?
                            <AbTagsPanel /> :
                            <SmpTagsPanelView />
                    }
                </div>
            )
        }

        if (this.state.displayed === DpDisplayedType.ActionUnit && actionUnit) {

            const isTitle = getSupportedActionUnits().find(item => item.key === actionUnit.type)?.value;
            const title = (isTitle)? isTitle + " config" : "Action config";

            return (
                <div className="details-panel-wrapper">
                    <div className="details-panel">
                        <div className="action-unit-panel">
                            <H4 className="section-header">
                                {
                                    (this.state.displayed === DpDisplayedType.ActionUnit) ?
                                        <Icon icon={getActionUnitIcon(actionUnit)} className="button-spacer" /> :
                                        null
                                }
                                <span>{title}</span>
                                {
                                    (this.state.isDirty) ?
                                        <Icon
                                            className="is-dirty-dot"
                                            intent={Intent.WARNING}
                                            iconSize={6}
                                            icon={IconNames.FULL_CIRCLE}
                                        />:
                                        null
                                }
                                <DetailsPanelMoreMenu
                                    onDuplicateClick={() => this.handleAuDuplicateClick()}
                                    onMoveToClick={() => this.auDialogService.showMoveToDialog(actionUnit.id)}
                                    onDeleteClick={() => this.auDialogService.showDeleteDialog(actionUnit.id)}
                                />
                            </H4>

                            {this.pluginPanel(actionUnit)}

                            <details>
                                <summary>Config metadata</summary>
                                <p className={Classes.TEXT_SMALL}>
                                    Action Unit ID: {actionUnit.id}
                                    <br/>
                                    Last modified: {moment(actionUnit.modifiedOn).format(DATE_FORMAT)}
                                </p>
                            </details>
                        </div>
                        <div className="test-results-panel">
                            <div className="test-results-panel-inner">
                                <div className="test-results-panel-header">
                                    <span>
                                        <strong>Action result</strong>
                                        {(this.state.result) ?
                                            <small>{
                                                "  at " + moment(this.state.result.startedAt).format(DATE_FORMAT)
                                            }</small> : null
                                        }
                                    </span>
                                    <Button
                                        minimal={true}
                                        small={true}
                                        className="align-right"
                                        icon={(this.state.isResult) ? IconNames.CARET_DOWN : IconNames.CARET_UP}
                                        onClick={this.showResult}
                                    />
                                </div>
                                {
                                    (this.state.isResult) ?
                                        <pre className="test-results-code-block">
                                            {
                                                (this.state.result && this.state.result.finishedAt > 0) ?
                                                    this.logBuilder.generateAuResultPassOutput(this.state.result, true) :
                                                    <span>No result found</span>
                                            }
                                        </pre> : null
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        return (<div/>)
    }
}


interface DetailsPanelMoreMenuProps {
    onDuplicateClick(): void;
    onMoveToClick(): void;
    onDeleteClick(): void;
}

function DetailsPanelMoreMenu(props: DetailsPanelMoreMenuProps) {

    return (
        <Popover className="align-right" position={PopoverPosition.BOTTOM_RIGHT}>
            <Button
                small={true}
                minimal={true}
                icon={IconNames.MORE}
            />
            <Menu>
                <MenuItem
                    text="Duplicate"
                    icon={IconNames.DUPLICATE}
                    onClick={props.onDuplicateClick}
                />
                <MenuItem
                    text="Move To"
                    icon={IconNames.MOVE}
                    onClick={props.onMoveToClick}
                />
                <MenuDivider />
                <MenuItem
                    intent={Intent.DANGER}
                    text="Delete"
                    icon={IconNames.TRASH}
                    onClick={props.onDeleteClick}
                />
            </Menu>
        </Popover>
    );
}
