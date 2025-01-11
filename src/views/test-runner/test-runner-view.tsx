import React, {Component} from "react";
import "./test-runner.scss";
import TestRunnerToolbarView from "./toolbar/tr-toolbar.view";
import Logger from "../../_ui_common/logger.service";
import {LAST_RESULT_ID, IResultFromIpc, ResultType} from "../../_common/interfaces/result.class";
import {Button, Classes, Drawer, Intent, Position, ProgressBar, Tag, Tooltip} from "@blueprintjs/core";
import UnitsChecker from "../../services/storage/units-checker";
import {IInvalidUnitMessage} from "../../_common/action-unit";
import StorageService from "../../services/storage/storage.service";
import {IconNames} from "@blueprintjs/icons";
import ResultsService from "../../services/storage/results_db.service";
import RunnerLogBuilder from "../../_ui_common/runner-log-builder";
import {IRunnerStatus} from "../../_common/interfaces/ipc.interfaces";
import IpcRendererService from "../../services/ipc_renderer.service";
import {DEFAULT_RUNNER_WIN_NAME, EXPORT_TEST_EXTENSION} from "../../_common/defaults";
import {IProjectTransfer} from "../../_common/interfaces";


const logger = new Logger("TestRunnerView");
// this number is a quantity of tests to establish comms and close comms from UnitRunner class
const INITIAL_NUMBER_OF_TESTS = 2 + 2;

interface TestRunnerViewProps {
}

interface TestRunnerViewState {
    isInvalid: boolean,
    invalidMessage: string,
    isTestRunning: boolean,
    invalidUnits: IInvalidUnitMessage[],
    showDrawer: boolean,
    outputLogElements: JSX.Element[],
    totalUnitsCount: number,
    currentUnitCount: number,
    currentUnitFailed: number,
    currentUnitPassed: number,
    currentUnitDisabled: number,
}

export default class TestRunnerView extends Component<TestRunnerViewProps, TestRunnerViewState> {
    private storage = new StorageService();
    private ipcComms = new IpcRendererService();
    private unitChecker = new UnitsChecker();
    private resultsDb = new ResultsService();

    private lastAuResultId: string = "";
    private logBuilder = new RunnerLogBuilder();
    private preContainer?: HTMLPreElement | null;
    private projectTransfer?: IProjectTransfer;

    constructor(props: TestRunnerViewProps) {
        super(props);
        document.title = DEFAULT_RUNNER_WIN_NAME;
        this.ipcComms.registerIpcSubscribers(true);

        this.state = {
            isInvalid: true,
            invalidMessage: "Analysing the project...",
            invalidUnits: [],
            isTestRunning: false,
            showDrawer: false,
            outputLogElements: [],
            totalUnitsCount: INITIAL_NUMBER_OF_TESTS,
            currentUnitCount: 0,
            currentUnitFailed: 0,
            currentUnitPassed: 0,
            currentUnitDisabled: 0,
        };
    }

    private unsubscribers: Function[] = [];
    async componentDidMount() {
        this.unsubscribers.push(
            this.ipcComms.onNewResultSubscriber(this.handleReceivedResult),
            this.ipcComms.onInvalidUnitsFromElectronSubscriber(this.handleReceivedInvalidUnits),
            this.ipcComms.onRunnerStatusChangeSubscriber(this.onRunnerStatusChanged),
        );
        const isTestRunning = await this.ipcComms.isRunnerActive();
        const invalidUnits = await this.unitChecker.getUnitsFromDb();
        const lastResults = await this.resultsDb.getResultsFromDb();

        this.setState({isTestRunning});
        this.handleReceivedInvalidUnits(invalidUnits);

        for (const result of lastResults) {
            this.handleReceivedResult(result)
        }
    }

    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }


    private handleReceivedResult = (result: IResultFromIpc) => {
        const outputLogElements = this.state.outputLogElements;
        if (outputLogElements.length >= 1000) {
            outputLogElements.slice(0, outputLogElements.length - 1000);
        }

        // this will not clutter UI Log even the same result has pushed different messages
        if (this.lastAuResultId === result.id) outputLogElements.splice(outputLogElements.length - 2, 2);

        // counting skips, passes and failures
        let currentUnitFailed = this.state.currentUnitFailed;
        let currentUnitPassed = this.state.currentUnitPassed;
        let currentUnitDisabled = this.state.currentUnitDisabled;
        if (result.type === ResultType.AuResult && result.finishedAt > 0) {
            if (result.disabled) currentUnitDisabled++;
            else if (result._error) currentUnitFailed++;
            else currentUnitPassed++;
        }

        let currentUnitCount = this.state.currentUnitCount;
        if (result.type === ResultType.AuResult && this.lastAuResultId !== result.id) {
            this.lastAuResultId = result.id;
            currentUnitCount++;
        }

        // generate log line and add it to the log window
        const generatedLine = this.logBuilder.generateLine(result, outputLogElements.length === 0);
        outputLogElements.push(...generatedLine);

        if (result.id === LAST_RESULT_ID) currentUnitCount = this.state.totalUnitsCount;

        this.setState({
            outputLogElements, currentUnitCount, currentUnitFailed, currentUnitPassed, currentUnitDisabled
        }, () => {
            if (this.preContainer) this.preContainer.scrollTo(0, this.preContainer.scrollHeight);
        });
    };

    private onRunnerStatusChanged = async (status: IRunnerStatus) => {
        const currentUnitCount = status.isRunning ? this.state.currentUnitCount : this.state.totalUnitsCount;
        if (!status.isRunning) {
            if (Array.isArray(status.results)) {
                // const totalUserActions = this.state.totalUnitsCount - INITIAL_NUMBER_OF_TESTS;
                await this.resultsDb.setAllResultsAtOnce(status.results);
            }
        }
        this.setState({isTestRunning: status.isRunning, currentUnitCount})
    }


    private handleReceivedInvalidUnits = (invalidUnitsRaw: IInvalidUnitMessage[]) => {
        const invalidUnits = invalidUnitsRaw.filter(unit => unit.isEnabled === undefined || unit.isEnabled);
        const isInvalid = (invalidUnits.length > 0);
        const invalidMessage = (isInvalid) ?
            "Clear the following errors to proceed with the test" :
            "Yay, no errors found";
        this.setState({invalidUnits, isInvalid, invalidMessage});
    };


    private runTest = async () => {
        if (this.state.isTestRunning) {
            await this.ipcComms.abortRunner();
            return;
        }

        try {
            this.projectTransfer = await this.storage.exportProject();
        } catch (e) {
            return logger.error(e);
        }

        let totalUnitsCount = INITIAL_NUMBER_OF_TESTS;
        totalUnitsCount += this.projectTransfer.actionUnits.size;
        // if Action Set is disabled then the action units are skipped and not included in the results
        // however if Action Unit is disabled it still will be in the results, but without a PASS or FAIL conditions.
        this.projectTransfer.actionSets.forEach(set => {
            if (!set.enabled) totalUnitsCount -= set.actionUnitIds.length;
        });

        this.setState({
            totalUnitsCount,
            currentUnitCount: 0,
            currentUnitFailed: 0,
            currentUnitPassed: 0,
            currentUnitDisabled: 0,
        });
        logger.log("Number of Action Units: " + (totalUnitsCount - INITIAL_NUMBER_OF_TESTS));
        await this.ipcComms.sendDataToElectron(this.projectTransfer);
    };

    private saveRunnerLog = () => {
        let runnerLog = "";
        // const pre = document.querySelector(".runner-output");
        if (this.preContainer) {
            this.preContainer.childNodes.forEach(node => {
                runnerLog += (node.nodeName === "BR") ? "\n" : node.textContent;
            });
        }
        const project = this.storage.getProject();
        const element = document.createElement("a");
        const file = new Blob([runnerLog], {type: "text/plain"});
        element.href = URL.createObjectURL(file);
        element.download = project.name + " [results].txt";
        element.click();
    };

    private handleClearOutputLog = () => {
        this.setState({outputLogElements: []});
    };

    private showDrawer = () => {
        this.setState({showDrawer: true});
    };

    private handleDrawerClose = () => {
        this.setState({showDrawer: false});
    };

    private exportDataForReport = async () => {
        if (!this.storage.getProject().name.includes("genrep") || !this.projectTransfer) return;

        const exportData = {
            projectExport: {
                ...this.projectTransfer,
                actionSets: [...this.projectTransfer.actionSets.values()],
                actionUnits: [...this.projectTransfer.actionUnits.values()],
            },
            results: await this.resultsDb.getResultsFromDb()
        };
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(exportData)], {type: "text/plain"});
        element.href = URL.createObjectURL(file);
        element.download = exportData.projectExport.project.name + " [in_report]" + EXPORT_TEST_EXTENSION;
        element.click();
    }

    render() {
        logger.log("render()");
        const {currentUnitCount, totalUnitsCount, currentUnitPassed, currentUnitFailed, currentUnitDisabled} = this.state;
        const ratio = currentUnitCount / totalUnitsCount;

        return (
            <div>
                <div className="test-runner">
                    <TestRunnerToolbarView
                        isInvalid={this.state.isInvalid}
                        isRunning={this.state.isTestRunning}
                        onRunTest={this.runTest}
                        onSaveClick={this.saveRunnerLog}
                        onBellClick={this.showDrawer}
                    />
                    <div className="runner-output-container">
                        <div className="runner-meta">
                            <div className="output-log-header">
                                <div className="output-log-left-header">
                                    <span onClick={this.exportDataForReport}>Output Log</span>
                                </div>
                                <div className="output-log-right-header">
                                    <span>
                                        <Tooltip content="Disabled actions" position={Position.BOTTOM_RIGHT}>
                                            <Tag icon={IconNames.DISABLE}>
                                                {currentUnitDisabled}
                                            </Tag>
                                        </Tooltip>
                                        <span className={"button-spacer"}/>
                                        <Tooltip content="Passed actions" position={Position.BOTTOM_RIGHT}>
                                            <Tag intent={Intent.SUCCESS} icon={IconNames.TICK}>
                                                {currentUnitPassed}
                                            </Tag>
                                        </Tooltip>
                                        <span className={"button-spacer"}/>
                                        <Tooltip content="Failed actions" position={Position.BOTTOM_RIGHT}>
                                            <Tag
                                                intent={currentUnitFailed > 0 ? Intent.DANGER : Intent.NONE}
                                                icon={IconNames.CROSS}
                                            >
                                                {currentUnitFailed}
                                            </Tag>
                                        </Tooltip>
                                        <span className={"button-spacer"}/>
                                        <span className={"button-spacer"}/>
                                    </span>
                                    <span className="button-spacer"/>
                                    <Tooltip content="Clear output log" position={Position.BOTTOM_RIGHT}>
                                        <Button
                                            minimal={true}
                                            small={true}
                                            icon={IconNames.TRASH}
                                            onClick={this.handleClearOutputLog}
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                            <ProgressBar
                                className="runner-output-progress-bar"
                                intent={(ratio < 1) ? Intent.PRIMARY : Intent.NONE}
                                animate={(ratio < 1)}
                                stripes={(ratio < 1)}
                                value={currentUnitCount / totalUnitsCount}
                            />
                        </div>
                        <pre
                            className={Classes.CODE_BLOCK + " runner-output"}
                            ref={(pre) => this.preContainer = pre}
                        >
                            {this.state.outputLogElements}
                        </pre>
                    </div>
                </div>

                <Drawer
                    icon={IconNames.WARNING_SIGN}
                    onClose={this.handleDrawerClose}
                    title="Action Unit checks"
                    autoFocus={true}
                    canEscapeKeyClose={true}
                    canOutsideClickClose={true}
                    enforceFocus={true}
                    hasBackdrop={true}
                    isOpen={this.state.showDrawer}
                    position={Position.RIGHT}
                    usePortal={true}
                    size={"75%"}
                >
                    <div className={Classes.DRAWER_BODY}>
                        <div className={Classes.DIALOG_BODY}>
                            <p>{this.state.invalidMessage}</p>
                            <ul className={Classes.LIST}>
                                {this.state.invalidUnits.map(item => {
                                    return (
                                        <li key={item.actionUnitId}>
                                            {item.message} at <strong>{item.name}</strong>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                    {/*<div className={Classes.DRAWER_FOOTER}>Footer</div>*/}
                </Drawer>
            </div>
        );
    }
}
