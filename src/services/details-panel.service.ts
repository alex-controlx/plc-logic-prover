import PubSub_LP, {EventTopic} from "./_pubsub.aclass";
// import Logger from "../_common/services/logger.service";
import {DpDisplayedType, IDetailsPanelState} from "../_common/interfaces";
import {AppStateService} from "./app-state.service";
import {ConfirmAlertService} from "../views/dialog-components/confirm-alert";
import {IActionUnit} from "../_common/action-unit";

// const logger = new Logger("DetailsPanelService");

const DEFAULT_ALERT_MESSAGE = "You have unsaved changes that will be lost. Do you want to continue?";

const appState = new AppStateService();
let detailsPanel: IDetailsPanelState = appState.getDetailsPanel();
let currentActionUnit: IActionUnit;

export default class DetailsPanelService extends PubSub_LP {
    private confirmAlert = new ConfirmAlertService();

    constructor() {
        super();
        detailsPanel = appState.getDetailsPanel();
    }

    get displayed(): DpDisplayedType {
        return detailsPanel.displayed;
    }
    get actionUnitId(): string {
        return detailsPanel.actionUnitId;
    }
    get actionUnit(): IActionUnit {
        if (!currentActionUnit) throw new Error("Action Unit is not set in Details Panel");
        return currentActionUnit
    }
    set actionUnit(actionUnit: IActionUnit) {
        if (!actionUnit) return;
        currentActionUnit = actionUnit
    }

    get isResultShown(): boolean {
        return detailsPanel.isResultShown;
    }

    set isDirty(value: boolean) {
        if (value === detailsPanel.isDirty) return;
        detailsPanel.isDirty = value;
        this.dispatchEvent(EventTopic.DpIsDirty, value);
    }
    public isDirtySubscriber(callback: (isDirty: boolean) => void) {
        return this.subscribeOnChange(EventTopic.DpIsDirty, callback)
    }
    get isDirty(): boolean {
        return detailsPanel.isDirty;
    }

    public async isConfirmedToProceed(): Promise<boolean> {
        if (!detailsPanel.isDirty) return true;

        const isConfirmed = await this.confirmAlert.isConfirmed(DEFAULT_ALERT_MESSAGE);
        detailsPanel.isDirty = !isConfirmed;
        return isConfirmed
    }



    public showActionUnit(actionUnitId: string) {
        this.dispatchEvent(EventTopic.ShowActionUnit, actionUnitId);
    }
    public showActionUnitSubscriber(callback: (actionUnitId: string) => void) {
        return this.subscribeOnChange(EventTopic.ShowActionUnit, callback)
    }

    public showPage(displayed: DpDisplayedType) {
        this.dispatchEvent(EventTopic.ShowPage, displayed);
    }
    public showPageSubscriber(callback: (displayed: DpDisplayedType) => void) {
        return this.subscribeOnChange(EventTopic.ShowPage, callback)
    }

    public setDetailedPanelState(displayed: DpDisplayedType, actionUnit?: IActionUnit, isResult = true) {
        detailsPanel.displayed = displayed;
        if (actionUnit) {
            currentActionUnit = actionUnit;
            detailsPanel.actionUnitId = actionUnit.id;
        } else {
            detailsPanel.actionUnitId = "";
        }
        detailsPanel.isResultShown = isResult;
        appState.setDetailsPanel(detailsPanel);
    }
}
