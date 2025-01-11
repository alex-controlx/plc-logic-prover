import React, {ChangeEvent, Component} from "react";
import "./App.scss";
import Toolbar from "./toolbar/toolbar";
import Statusbar from "./statusbar/statusbar";
import Workspace from "./workspace/workspace";
import {
    FocusStyleManager,
    Intent,
    IToasterProps,
    IToastProps,
    Position,
    Spinner,
    Toaster,
} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";

import Logger from "../_ui_common/logger.service";
import ProjectDialogs from "./dialog-components/project-dialogs";
import {AppToasterService} from "../services/app-toaster.service";
import ConfirmAlert, {ConfirmAlertService} from "./dialog-components/confirm-alert";
import ActionUnitDialogs from "./dialog-components/action-unit-dialogs";
import StorageService, {
    AddActionUnitConfig,
    DeleteActionSetConfig,
    EditActionSetConfig
} from "../services/storage/storage.service";
import ActionSetDialogs from "./dialog-components/action-set-dialog";
import DetailsPanelService from "../services/details-panel.service";
import {DpDisplayedType} from "../_common/interfaces";
import {IActionUnit} from "../_common/action-unit";
import TagsService from "../services/storage/tags.service";
import UnitsChecker from "../services/storage/units-checker";
import {IProjectExpImp, IRunnerStatus} from "../_common/interfaces/ipc.interfaces";
import ResultsService from "../services/storage/results_db.service";
import IpcRendererService from "../services/ipc_renderer.service";
import ImportExportService from "../services/import-export.service";
import {ProjectDialogService} from "../services/app-dialogs.service";
import {
    DEFAULT_APP_WIN_NAME,
    DEFAULT_DANGER_TOAST_TIMEOUT, DUPLICATED_TAG,
    EXPORT_FILE_EXTENSION
} from "../_common/defaults";
import AppDialogs from "./dialog-components/app-dialogs";
import SpinnerService from "../services/spinner.service";

FocusStyleManager.onlyShowFocusOnTabs();


const logger = new Logger("App");

interface AppProps {}

interface AppState {
    isLoading: boolean,
    showSpinner: boolean,
}

class App extends Component<AppProps, AppState> {
    private toastService = new AppToasterService();
    private storage = new StorageService();
    private detailsPanelService = new DetailsPanelService();
    private tagService = new TagsService();
    private unitsChecker = new UnitsChecker();
    private ipcComms = new IpcRendererService();
    private resultsDb = new ResultsService();
    private toaster: Toaster | undefined;
    private toasterProps: IToasterProps = {
        canEscapeKeyClear: false,
        usePortal: true,
        position: Position.BOTTOM_RIGHT,
        maxToasts: 5,
    };
    private isTestRunning: Boolean = false;
    private confirmAlert = new ConfirmAlertService();
    private projectDialog = new ProjectDialogService();
    private spinnerService = new SpinnerService();

    constructor(props: AppProps) {
        super(props);
        document.title = DEFAULT_APP_WIN_NAME;

        logger.log("Constructing the component");
        Logger.registerCallback(this.handleInternalError);
        this.ipcComms.registerIpcSubscribers(false);

        this.state = { isLoading: true, showSpinner: false };
    }

    private unsubscribers: Function[] = [];
    componentDidMount() {
        logger.log("componentDidMount()");

        this.setState({ isLoading: false });
        this.unsubscribers.push(
            this.toastService.subscribeOnShowToast(this.addToast),
            this.storage.subscribeOnAddActionUnit(this.onAddActionUnit),
            this.storage.subscribeOnDeleteActionSet(this.onDeleteActionSet),
            this.storage.subscribeOnDeleteActionUnit(this.onDeleteActionUnit),
            this.storage.subscribeOnEditActionSet(this.onEditActionSet),
            this.storage.subscribeOnMoveActionUnit(this.onMoveActionUnit),
            this.storage.subscribeOnUpdateActionUnit(this.onUpdateActionUnit),

            this.tagService.updateTagSubscriber(this.onTagUpdated),
            this.tagService.deleteTagSubscriber(this.onTagDeleted),

            this.storage.clearProjectSubscriber(this.handleNoProject),
            this.storage.clearProjectCompletedSubscriber(() => this.setState({isLoading: false})),

            this.unitsChecker.onUpdatedInvalidUnitsSubscriber(this.handleUpdatedInvalidUnits),
            this.ipcComms.onRunnerStatusChangeSubscriber(this.onRunnerStatusChanged),
            this.ipcComms.onProjectExpImpSubscriber(this.onProjectExpImpRequest),
            this.projectDialog.onProjectExpImpSubscriber(this.onProjectExpImpRequest),
            this.spinnerService.displaySpinnerSubscriber(this.displaySpinner),
        );
    }
    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    private refHandlers = {
        toaster: (ref: Toaster) => (this.toaster = ref),
    };

    private handleInternalError = (message: string) => {
        const newToast: IToastProps = {
            icon: IconNames.WARNING_SIGN,
            intent: Intent.DANGER,
            timeout: DEFAULT_DANGER_TOAST_TIMEOUT,
            message: "Error: " + message
        };
        this.addToast(newToast);
    };

    private addToast = (newToast: IToastProps) => {
        this.toaster?.show(newToast);
    };


    private onAddActionUnit = (config: AddActionUnitConfig) => {
        this.addToast(AppToasterService.defaultToast(
            `${config.name} successfully added.`
        ));
    };

    private onDeleteActionSet = (config: DeleteActionSetConfig) => {
        this.addToast(AppToasterService.defaultToast(
            `${config.actionSet.name} successfully deleted.`
        ));
    };

    private onDeleteActionUnit = (config: IActionUnit) => {
        this.addToast(AppToasterService.defaultToast(
            `${config.name} successfully deleted.`
        ));
    };

    private onEditActionSet = (config: EditActionSetConfig) => {
        this.addToast(AppToasterService.defaultToast(
            `${config.actionSet.name} successfully saved.`
        ));
    };

    private onMoveActionUnit = () => {
        this.addToast(AppToasterService.defaultToast(
            `Moved successfully.`
        ));
    };

    private onUpdateActionUnit = (config: IActionUnit) => {
        this.addToast(AppToasterService.defaultSuccessToast(
            `${config.name} successfully saved.`
        ));
    };


    private onTagUpdated = (tagId?: string) => {

        if (this.state.isLoading) return;

        // If no Tag ID then the tag wasn't updated
        if (!tagId) {
            return this.addToast(AppToasterService.defaultWarningToast("Invalid tag naming. Not saved."));
        }

        if (tagId === DUPLICATED_TAG) {
            return this.addToast(AppToasterService.defaultWarningToast("Duplicated tag. Not saved."));
        }

        const tag = this.tagService.getTag(tagId);
        this.addToast(AppToasterService.defaultToast(
            `Tag '${tag?.tagname}' successfully saved.`
        ));
    };

    private onTagDeleted = (tagname: string) => {
        this.addToast(AppToasterService.defaultToast(
            `Tag '${tagname}' was successfully deleted.`
        ));
    };




    private handleNoProject = async () => {
        await this.ipcComms.closeRunner();
        this.detailsPanelService.setDetailedPanelState(DpDisplayedType.StartPage);
        this.setState({isLoading: true})
    };

    private handleUpdatedInvalidUnits = () => {
        // this is reserved in case we need to notify on invalid units
    }

    private onRunnerStatusChanged = async (status: IRunnerStatus) => {
        if (status.isRunning !== this.isTestRunning) {
            this.isTestRunning = status.isRunning;
            const message = "Test is " + (status.isRunning ? "started" : "completed");
            if (status.isRunning)
                this.addToast(AppToasterService.defaultToast(message, IconNames.SOCIAL_MEDIA));
            else this.addToast(AppToasterService.defaultSuccessToast(message, IconNames.TICK));
        }
        if (status.error) this.handleInternalError(status.error);
        if (Array.isArray(status.results)) {
            logger.log(`Received ${status.results.length} results`)
            await this.resultsDb.setAllResultsAtOnce(status.results);
        }
    }

    private onProjectExpImpRequest = async (config: IProjectExpImp) => {
        if (config.type === "export") {
            await ImportExportService.exportProject();
        } else if (config.type === "import") {
            const isConfirmed = await this
                .confirmAlert
                .isConfirmed(
                    "Heads up! By importing a project all existing data will be deleted. Make sure current " +
                    "project has been exported. The export function is located in File menu. It will also abort " +
                    "current test if it's running."
                );
            if (isConfirmed) {
                const importInput = document.getElementById("project-import-input");
                if (importInput) importInput.click();
            }
        }
    }

    private handleProjectImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const target = event.target;
        if (target.files) {
            await this.ipcComms.abortRunner();
            await ImportExportService.handleConfirmedImport(target.files[0]);
        }
        target.value = "";
    }


    private displaySpinner = (toShow: boolean) => {
        this.setState({showSpinner: toShow})
    }

    render() {
        const {isLoading} = this.state;
        logger.log("render()");

        return (
            <div>
                {
                    (isLoading) ?
                        <div>
                            <Spinner
                                className="start-spinner-position"
                                intent={Intent.PRIMARY}
                                size={100}
                            />
                        </div>
                        :
                        <div className="App">
                            {
                                (this.state.showSpinner) ?
                                    <Spinner
                                        className="worker-spinner-position"
                                        intent={Intent.PRIMARY}
                                        size={100}
                                    /> :
                                    null
                            }
                            <Toolbar />
                            <Workspace />
                            <Statusbar />
                        </div>
                }

                <Toaster {...this.toasterProps} ref={this.refHandlers.toaster} />
                <ProjectDialogs />
                <ActionSetDialogs />
                <ActionUnitDialogs />
                <ConfirmAlert />
                <AppDialogs />
                <input
                    id="project-import-input"
                    type="file"
                    accept={EXPORT_FILE_EXTENSION}
                    style={{display: 'none'}}
                    onChange={this.handleProjectImport}
                />
            </div>
        );
    }
}

export default App;

