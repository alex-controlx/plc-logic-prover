import React, {ChangeEvent, Component} from "react";
import "./_tags_panel.scss";
import Logger from "../../_ui_common/logger.service";
import {
    Alert,
    AnchorButton,
    Button, IconSize,
    Icon,
    InputGroup,
    Intent,
    Menu,
    MenuItem,
    Popover,
    PopoverPosition,
    Position,
    Spinner,
    Tooltip
} from "@blueprintjs/core";
import {Cell, Column, ColumnHeaderCell, EditableCell, IRegion, SelectionModes, Table, Utils} from "@blueprintjs/table";
import TagsService from "../../services/storage/tags.service";
import {IconName, IconNames} from "@blueprintjs/icons";
import {ITagUI, PlcType} from "../../_common/interfaces";
import {TagPageState} from "../../services/app-state.service";
import {AppToasterService} from "../../services/app-toaster.service";
import {CSV_FILE_EXTENSION} from "../../_common/defaults";
import SpinnerService from "../../services/spinner.service";
import {ConfirmAlertService} from "../dialog-components/confirm-alert";
import StorageService from "../../services/storage/storage.service";
import {IActionUnit} from "../../_common/action-unit";
import DetailsPanelService from "../../services/details-panel.service";
import {getActionUnitIcon} from "../../_ui_common/ui.interfaces";
import CipTagHelper from "../../_common/classes/cip_validator.class";
import {TagHelper} from "../../_common/classes/tag_helper.class";
import {IFocusedCellCoordinates} from "@blueprintjs/table/lib/esnext/common/cellTypes";

const logger = new Logger("AbTagsPanel", true);

const noTagsMessage = "No tags to show.";
const sortDirections: number[] = [0, 0, 0, 0];

enum CellEditEvent {
    onChange,
    onConfirm,
    onCancel,
    onChangeDataType
}

interface AbTagsPanelProps {}

interface AbTagsPanelState {
    searchValue: string,
    sortedIndexMap: number[],
    isRowSelected: boolean,
    focusedCell?: IFocusedCellCoordinates,
    showFilterSpinner: boolean,
    columnWidths: (number | null | undefined)[],
    selectedRegions: IRegion[],
    loadingMessage: string,
    invalidCellSet: {[key: string]: boolean},
    rerenderRequest: boolean,
    showInfo: boolean,
    tagDuplicates: string[],
}

export default class AbTagsPanel extends Component<AbTagsPanelProps, AbTagsPanelState> {
    private tagPageState = new TagPageState();

    private toastService = new AppToasterService();
    private tagService = new TagsService();
    private spinnerService = new SpinnerService();
    private confirmAlert = new ConfirmAlertService();
    private storage = new StorageService();
    private detailsPanelService = new DetailsPanelService();

    private searchTimeoutId: number = 0;
    private selectedSortedRowsIndexes: number[] = [];
    private isSpinnerSpinning = false;
    private tagsUI: ITagUI[] = [];
    private columns: string[] = ["Tag", "Program", "Data Type", "Description", "Used"];
    private cellChangeBuffer: string | null = null;
    private tableElement: Element | null = null;


    constructor(props: AbTagsPanelProps) {
        super(props);

        logger.log("constructor()");

        const columnWidths = this.tagPageState.columnWidths;

        this.state = {
            searchValue: "",
            sortedIndexMap: [],
            isRowSelected: false,
            columnWidths: columnWidths,
            selectedRegions: [],
            loadingMessage: "Reading tags...",
            invalidCellSet: {},
            showFilterSpinner: false,
            rerenderRequest: false,
            showInfo: false,
            tagDuplicates: [],
        };
    }

    async componentDidMount() {
        this.tagsUI = this.tagService.getAllTags();
        const loadingMessage = this.tagsUI.length ? this.state.loadingMessage : noTagsMessage;
        const sortedIndexMap = Utils.times(this.tagsUI.length, (i: number) => i);

        const index = this.tagsUI.findIndex(item => item.id === this.tagPageState.selectedTagId);
        const focusedCell = {
            col: 0,
            row: index < 0 ? 0 : index,
            focusSelectionIndex: 0
        };

        this.setState({sortedIndexMap, loadingMessage, focusedCell});
        document.addEventListener("copy", this.copyListener);
        document.addEventListener("paste", this.pasteListener);
    }

    componentWillUnmount() {
        document.removeEventListener("copy", this.copyListener);
        document.removeEventListener("paste", this.pasteListener);
    }

    private copyListener = async (e: ClipboardEvent) => {
        if (this.isSpinnerSpinning || !this.selectedSortedRowsIndexes.length) return;
        e.preventDefault();
        await this.copyToClipboard();
    }
    private pasteListener = async (e: ClipboardEvent) => {
        if (this.isSpinnerSpinning || !this.selectedSortedRowsIndexes.length) return;
        e.preventDefault();
        await this.pasteFromClipboard();
    }

    private addTag_handleRequest = () => {
        const newTag: ITagUI = TagsService.generateTag();

        this.tagsUI.push(newTag);

        this.selectedSortedRowsIndexes.length = 0;
        const invalidCellSet = this.state.invalidCellSet;
        invalidCellSet[(this.tagsUI.length - 1) + "-0"] = true;

        const sortedIndexMap = Utils.times(this.tagsUI.length, (i: number) => i);
        const focusedCell = {col: 0, row: this.tagsUI.length - 1, focusSelectionIndex: 0};
        this.setState({sortedIndexMap, selectedRegions: [], invalidCellSet, focusedCell});
    };


    private delTag_handleRequest = async () => {
        if (!this.selectedSortedRowsIndexes.length) return;

        const isConfirmed = await this.confirmAlert.isConfirmed(
            `Do you want to delete ${this.selectedSortedRowsIndexes.length} tags?`
        );
        if (!isConfirmed) return;

        this.showSpinner(true);
        let countDeleted = 0;
        this.selectedSortedRowsIndexes.sort((a, b) => a - b);

        this.toastService.showToast(AppToasterService.defaultToast(
            "Deleting " + this.selectedSortedRowsIndexes.length + " tags..."
        ));

        for (let i = this.selectedSortedRowsIndexes.length - 1; i >= 0; i--) {
            const rowIndex = this.selectedSortedRowsIndexes[i];
            await this.tagService.deleteTag(this.tagsUI[rowIndex].id, true);
            const removedTags = this.tagsUI.splice(rowIndex, 1);
            if (removedTags[0] && removedTags[0].usage && removedTags[0].usage.length) {
                for (const actionUnitId of removedTags[0].usage) {
                    await this.storage.setInvalidUnitWithUsedDeletedTag(actionUnitId);
                }
            }
            countDeleted++;
        }

        const index = this.state.sortedIndexMap.findIndex(value => value === this.selectedSortedRowsIndexes[0]);

        this.sortColumn(() => {

            // focused cell pointing to the next row or to the last, if lasted rows deleted
            const nextRow = index > this.state.sortedIndexMap.length - 1 ?
                this.state.sortedIndexMap.length - 1 : index;

            this.selectedSortedRowsIndexes.length = 0;

            const loadingMessage = this.tagsUI.length ? this.state.loadingMessage : noTagsMessage;

            const focusedCell = {col: 0, row: nextRow, focusSelectionIndex: 0};

            this.setState({selectedRegions: [], loadingMessage, focusedCell}, () => {
                this.showSpinner(false);
                this.toastService.showToast(AppToasterService.defaultSuccessToast(
                    "Deleted " + countDeleted + " tags."
                ));
            });
        });
    };


    private clipboardTagIndex = 0;
    private clipboardDatatypeIndex = 5;
    private clipboardDescIndex = 7;
    // based on the example below
    // Local:2:I.Data.30		0		Decimal	BOOL	Standard		Read/Write
    // Local:2:I.Data.31		0		Decimal	BOOL	Standard		Read/Write
    // SYS_Healthy	<normal>	0		Decimal	BOOL	Standard	General System Healthy	Read/Write	0
    // SYS_MixerRTs	<normal>	0		Decimal	DINT	Standard	General Mixer Run Time - Second Count	Read/Write	0


    private copyToClipboard = async () => {
        if (!this.selectedSortedRowsIndexes.length) return;

        let clipboardData = "";
        for (const sortedIndex of this.selectedSortedRowsIndexes) {
            const tag = this.tagsUI[sortedIndex];
            if (!tag) continue;
            const clipboardRow = [];
            for (let i = 0; i < 8; i++) {
                if (i === this.clipboardTagIndex) clipboardRow.push(tag.tagname);
                else if (i === this.clipboardDatatypeIndex) {
                    clipboardRow.push(TagHelper.translateToUi(PlcType.AB_CL, tag.datatype));
                }
                else if (i === this.clipboardDescIndex) clipboardRow.push(tag.desc);
                else clipboardRow.push("");
            }
            clipboardData += clipboardRow.join("\t") + "\n";
        }

        logger.log(clipboardData);

        await navigator.clipboard.writeText(clipboardData);
    }

    private pasteFromClipboard = async () => {
        const text = await navigator.clipboard.readText();

        // this separator makes it working on windows and on linux machines
        const separator = text.includes("\r\n") ? "\r\n" : "\n";
        const lines = text.split(separator);
        const results: ITagUI[] = [];
        for (const line of lines) {
            const tagFields = line.split("\t");
            const tagDatatype = tagFields[this.clipboardDatatypeIndex];
            if (tagFields[this.clipboardTagIndex] &&
                TagHelper.cipDatatypesUi.includes(tagDatatype)) {

                const datatype = TagHelper.translateToLocal(PlcType.AB_CL, tagDatatype);
                const tag = TagsService.generateTag();
                tag.tagname = tagFields[this.clipboardTagIndex];
                tag.datatype = datatype;
                tag.desc = tagFields[this.clipboardDescIndex];
                results.push(tag);
            }
        }

        logger.log(text);
        logger.log(`${results.length} of tags imported`);

        if (results.length) {
            const program = await this.confirmAlert.isPrompted(`About to add ${results.length} tags. ` +
                `What program is it from? (leave the field empty for the controller tags)`);
            if (program === null) return;

            this.showSpinner(true);
            await this.importTags(results, program);
        }
    }

    private importFile = () => {
        const importInput = document.getElementById("csv-import-input");
        if (importInput) importInput.click();
    }

    private handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const target = event.target;
        if (target.files) {
            const file = target.files[0];
            if (!(file instanceof File)) return logger.error("File not selected.");

            this.showSpinner(true);

            const text = await file.text();

            const separator = text.includes("\r\n") ? "\r\n" : "\n";
            const lines = text.split(separator);
            const results: ITagUI[] = [];
            for (const line of lines) {
                if (!line.startsWith("TAG,")) continue;
                // TAG,,TOT_Line2PV,"Totaliser: Line 2 flow count","DINT","","(RADIX := Decimal, Constant := false, ExternalAccess := Read/Write)"
                // TAG,,TOT_Line2PV_buffer,"","DINT","","(RADIX := Decimal, Constant := false, ExternalAccess := Read/Write)"

                const preSplit0 = line.split(`","`);
                const datatype = TagHelper.translateToLocal(PlcType.AB_CL, preSplit0[1]);

                if (TagHelper.cipDatatypesUi.includes(datatype)) {
                    const preSplit1 = preSplit0[0].split(`,"`);
                    const preSplit2 = preSplit1[0].split(`,`);

                    const tag = TagsService.generateTag();
                    tag.tagname = preSplit2[2];
                    tag.program = preSplit2[1];
                    tag.datatype = datatype;
                    tag.desc = preSplit1[1];
                    results.push(tag);
                }
            }

            if (results.length) await this.importTags(results);
        }
        target.value = "";
    }

    private importTags = async (importTags: ITagUI[], program?: string) => {
        this.toastService.showToast(AppToasterService.defaultToast("Adding tags..."));

        let countNew = 0;
        for (const importTag of importTags) {
            if (program) importTag.program = program;

            // const newTag = this.tagService.generateTag(importTag);
            const addedTag = await this.tagService.setTag(importTag, true);
            if (!addedTag) continue;

            countNew++;
            this.tagsUI.push(importTag);
        }

        this.selectedSortedRowsIndexes.length = 0;
        const toast = countNew ? AppToasterService.defaultSuccessToast(
            `Added ${countNew} (out of ${importTags.length}) new tags.`
            ):
            AppToasterService.defaultDangerToast(
                "No tags added."
            );

        const sortedIndexMap = Utils.times(this.tagsUI.length, (i: number) => i);
        const focusedCell = {col: 0, row: this.tagsUI.length - 1, focusSelectionIndex: 0};

        this.setState(
            {sortedIndexMap, focusedCell, selectedRegions: [], searchValue: "", rerenderRequest: true},
            () => {
                this.showSpinner(false);
                this.toastService.showToast(toast);
        });
    };

    private showSpinner(toShow: boolean) {
        this.isSpinnerSpinning = toShow;
        this.spinnerService.displaySpinner(toShow);
    }

    private handleShowInfoClick = () => {
        const tagDuplicates: string[] = [];
        const dupObj: {[key: string]: boolean} = {};
        for (const tag of this.tagsUI) {
            if (dupObj[tag.program + ":" + tag.tagname]) {
                tagDuplicates.push((tag.program ? tag.program + ":" : "") + tag.tagname);
            }
            dupObj[tag.program + ":" + tag.tagname] = true;
        }
        this.setState({tagDuplicates, showInfo: true})
    }

    // DONT DELETE, for debugging
    // componentDidUpdate(prevProps: any, prevState: any) {
    //     Object.entries(this.props).forEach(([key, val]) =>
    //         prevProps[key] !== val && console.log(`Prop '${key}' changed`)
    //     );
    //     if (this.state) {
    //         Object.entries(this.state).forEach(([key, val]) =>
    //             prevState[key] !== val && console.log(`State '${key}' changed`)
    //         );
    //     }
    // }

    public render() {
        const numRows = this.state.sortedIndexMap.length;

        const columns = this.columns
            .map((name, index) =>
                <Column
                    cellRenderer={this.cellRenderer}
                    columnHeaderCellRenderer={() => this.columnHeaderCellRenderer(name, index)}
                    key={index}
                    name={name}
                />
            );

        const deleteMessage = this.selectedSortedRowsIndexes.length ?
            "Delete (" + this.selectedSortedRowsIndexes.length + ")" :
            "Delete";

        return (
            <div className="ab-tags-panel">
                <div className="ab-tags-toolbar">
                    <div className="ab-tags-toolbar--filter">
                        <InputGroup
                            disabled={false}
                            large={false}
                            leftIcon={"search"}
                            type={"search"}
                            onChange={this.handleFilterChange}
                            rightElement={this.state.showFilterSpinner ? <Spinner size={IconSize.STANDARD} /> : undefined}
                            placeholder={"Filter " + this.tagsUI.length + " tags"}
                        />
                    </div>
                    <span className="button-spacer"/>
                    <div className="ab-tags-toolbar--buttons">
                        <Button
                            icon={IconNames.INFO_SIGN}
                            minimal={true}
                            onClick={this.handleShowInfoClick}
                        />
                        <span className="button-spacer"/>
                        <Tooltip
                            content="Add new tag"
                            position={Position.BOTTOM_RIGHT}>
                            <AnchorButton
                                icon={IconNames.ADD}
                                text={"Add"}
                                intent={Intent.PRIMARY}
                                onClick={() => this.addTag_handleRequest()}
                            />
                        </Tooltip>
                        <span className="button-spacer"/>
                        <Tooltip
                            content="Import CSV files from RSLogix5000."
                            position={Position.BOTTOM_RIGHT}>
                            <AnchorButton
                                icon={IconNames.IMPORT}
                                onClick={this.importFile}
                                text={"Import Tags"}
                            />
                        </Tooltip>
                        <span className="button-spacer"/>
                        <Tooltip
                            disabled={!!this.selectedSortedRowsIndexes.length}
                            content="Highlight row(s) to delete."
                            position={Position.BOTTOM_RIGHT}>
                            <AnchorButton
                                icon={IconNames.TRASH}
                                disabled={!this.selectedSortedRowsIndexes.length}
                                onClick={this.delTag_handleRequest}
                                intent={Intent.DANGER}
                                text={deleteMessage}
                            />
                        </Tooltip>
                    </div>
                </div>
                <div className="ab-tags-table-container">
                    {
                        (this.tagsUI.length === 0) ?
                            <div className="button-spacer">{this.state.loadingMessage}</div> :
                            <Table
                                columnWidths={this.state.columnWidths}
                                numRows={numRows}
                                enableMultipleSelection={true}
                                enableRowResizing={false}
                                onSelection={this.onSelection}
                                selectionModes={SelectionModes.ROWS_ONLY}
                                selectedRegions={this.state.selectedRegions}
                                enableFocusedCell={!!this.state.focusedCell}
                                focusedCell={this.state.focusedCell}
                                onFocusedCell={this.onFocusedCell}
                                onCompleteRender={this.onCompleteRender}
                                onColumnWidthChanged={this.onColumnWidthChanged}
                                children={columns}
                            />
                    }
                </div>
                <input
                    id="csv-import-input"
                    type="file"
                    accept={CSV_FILE_EXTENSION}
                    style={{display: 'none'}}
                    onChange={this.handleCsvImport}
                />
                <Alert
                    className="tag-info-alert"
                    canEscapeKeyCancel={true}
                    canOutsideClickCancel={true}
                    confirmButtonText=""
                    cancelButtonText="Close"
                    icon={IconNames.INFO_SIGN}
                    intent={Intent.PRIMARY}
                    isOpen={this.state.showInfo}
                    onCancel={() => this.setState({showInfo: false})}
                >
                    <p>Total number of tags is {this.tagsUI.length}.</p>
                    {
                        (this.state.tagDuplicates.length) ?
                            <div className="tag-duplicate-list">
                                <p>{this.state.tagDuplicates.length} tag duplicates:</p>
                                <ul>
                                    {this.state.tagDuplicates.map((duplicate, index) => {
                                        return (<li key={index}>{duplicate}</li>)
                                    })}
                                </ul>
                            </div> :
                            <p>Tag page has NO duplicates.</p>
                    }
                </Alert>
            </div>
        );
    }

    private onFocusedCell = (focusedCell: IFocusedCellCoordinates) => {
        this.tagPageState.selectedTagId = this.tagsUI[focusedCell.row].id;
        this.setState({focusedCell});
    };

    private onColumnWidthChanged = (index: number, size: number) => {
        const {columnWidths} = this.state;
        columnWidths[index] = size;
        this.tagPageState.columnWidths = [...columnWidths];
        this.setState({columnWidths, rerenderRequest: true})
    };

    private onCompleteRender = () => {

        // if (!this.tableElement) {
        //     this.tableElement = document.querySelector(".bp3-table-quadrant-scroll-container");
        //     this.tableElement?.addEventListener("scroll", () => {
        //         console.log(this.tableElement?.scrollTop);
        //     })
        // }

        // below is a work around for not rendering table properly after:
        // 1. cell DataType update
        // 2. Set of clear filter
        // 3. Resize column width
        // 4. Import tags
        if (this.state.rerenderRequest && this.tableElement) {

            setTimeout(() => {
                if (!this.tableElement) return;
                const scrollTop = this.tableElement.scrollTop;
                const targetScroll = (scrollTop < 10) ? 20 : scrollTop - 10;
                console.log("scrolling from", scrollTop, "to", targetScroll);
                this.tableElement.scrollTo(0, targetScroll);

                setTimeout(() => {
                    console.log("scrolling to", scrollTop);
                    this.tableElement?.scrollTo(0, scrollTop);
                },0);
            }, 0);

            this.setState({rerenderRequest: false});
        }
    };

    /**
     * @desc This fired every time user clicks within the table.
     * @param selectedRegion
     */
    private onSelection = (selectedRegion: IRegion[]) => {
        let isRowSelected = false;
        this.selectedSortedRowsIndexes.length = 0;

        for (const region of selectedRegion) {
            if (region.rows && !region.cols) {
                // unsort and add the rows of the regions to the selectedSortedRowsIndexes array
                for (let i = region.rows[0]; i <= region.rows[1]; i++) {
                    const sortedRowIndex = (this.state.sortedIndexMap[i] !== undefined) ?
                        this.state.sortedIndexMap[i] : i;

                    this.selectedSortedRowsIndexes.push(sortedRowIndex);
                    // console.log(selectedRegion);
                }
                isRowSelected = true;
            }
        }
        const selectedRegions = this.state.selectedRegions;
        selectedRegions.length = 0;
        if (isRowSelected) {
            selectedRegions.push(...selectedRegion);
        }

        if (!this.state.focusedCell) {
            const focusedCell = {col: 0, row: 0, focusSelectionIndex: 0};
            this.setState({focusedCell});
        }

        this.setState({isRowSelected, selectedRegions});
    };

    private handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
        const searchValue = event.target.value;
        clearTimeout(this.searchTimeoutId);

        if (!this.state.showFilterSpinner)
            this.setState({ showFilterSpinner: true });
        if (this.state.focusedCell) this.setState({ focusedCell: undefined });

        this.searchTimeoutId = window.setTimeout(() => {
            this.setState(
                {searchValue, showFilterSpinner: false, rerenderRequest: true},
                () => this.sortColumn());
        }, 200);
    };

    private getCellData = (rowIndex: number, columnIndex: number): [string, number] => {
        const sortedRowIndex = this.state.sortedIndexMap[rowIndex];
        if (sortedRowIndex != null) rowIndex = sortedRowIndex;

        const abTag = this.tagsUI[rowIndex];
        const cellData = "NOT FOUND";

        switch (columnIndex) {
            case 0: return [abTag.tagname, rowIndex];
            case 1: return [abTag.program, rowIndex];
            case 2: return [abTag.datatype, rowIndex];
            case 3: return [abTag.desc, rowIndex];
            case 4: return [abTag.id, rowIndex];
        }
        return [cellData, rowIndex];
    };

    private sortColumn = (callback?: () => void) => {
        let sortedIndexMap = Utils.times(this.tagsUI.length, (i: number) => i);

        if (this.state.searchValue) {
            const normalizedSearchValue = this.state.searchValue.toLowerCase();
            sortedIndexMap = sortedIndexMap
                .filter(item => (
                    this.tagsUI[item].tagname.toLowerCase().includes(normalizedSearchValue) ||
                    this.tagsUI[item].program.toLowerCase().includes(normalizedSearchValue) ||
                    this.tagsUI[item].datatype.toLowerCase().includes(normalizedSearchValue) ||
                    this.tagsUI[item].desc.toLowerCase().includes(normalizedSearchValue)
                ))
        }

        if (sortDirections.findIndex(item => item !== 0) >= 0) {
            const columnIndex = sortDirections.findIndex(item => item !== 0);
            const isAcs = sortDirections[columnIndex] === 1;

            const comparator = (isAcs) ?
                (a: string, b: string) => a.toString().localeCompare(b):
                (a: string, b: string) => b.toString().localeCompare(a);

            sortedIndexMap.sort((a: number, b: number) => {
                switch (columnIndex) {
                    case 0: return comparator(this.tagsUI[a].tagname, this.tagsUI[b].tagname);
                    case 1: return comparator(this.tagsUI[a].program, this.tagsUI[b].program);
                    case 2: return comparator(this.tagsUI[a].datatype, this.tagsUI[b].datatype);
                    case 3: return comparator(this.tagsUI[a].desc, this.tagsUI[b].desc);
                    case 4: return tagUsageSorting(isAcs, this.tagsUI[a].usage, this.tagsUI[b].usage);
                }
                return 0;
            });
        }

        function tagUsageSorting(isAcs: boolean, a?: string[], b?: string[]): number {
            if (!a && !b) return 0;
            const k = isAcs ? 1 : -1;
            if (!a && b) return -1 * k;
            if (a && !b) return 1 * k;
            if (a && b) return (a.length - b.length) * k

            return 0;
        }

        this.setState({sortedIndexMap}, () => {
            if (callback) callback()
        });
    };


    private cellRenderer = (rowIndex: number, columnIndex: number) => {
        const editCallback = async (event: CellEditEvent, value: string) => {
            await this.editCell(event, value, rowIndex, columnIndex);
        };

        const [cellValue, sortedRowIndex] = this.getCellData(rowIndex, columnIndex);

        if (columnIndex === 2) {
            return (
                <Cell>
                    <React.Fragment>
                        <select
                            className="ab-datatype-select"
                            onChange={async (e) => {
                                await editCallback(CellEditEvent.onChangeDataType, e.target.value)
                            }}
                            value={cellValue}
                        >
                            {TagHelper.cipKeyValueDatatype.map(item => (
                                <option key={item.localDatatype} value={item.localDatatype}>
                                    {item.uiDatatype}
                                </option>
                            ))}
                        </select>
                    </React.Fragment>
                </Cell>
            )
        }
        if (columnIndex === 4) {

            const abTag = this.tagsUI[sortedRowIndex];
            const value = abTag.usage ? abTag.usage.length.toString() : "-";

            const actionUnitClick = (actionUnit?: IActionUnit) => {
                if (!actionUnit) return;
                this.detailsPanelService.showActionUnit(actionUnit.id);
            }

            return (
                <Cell>
                    <div className="spaced-container">
                        <div>{value}</div>
                        <span className="button-spacer"/>
                        {
                            abTag.usage && abTag.usage.length ?
                                (
                                    <Popover popoverClassName="used-more--list" position={PopoverPosition.AUTO}>
                                        <Button
                                            className="used-more-button"
                                            small={true}
                                            minimal={true}
                                        >
                                            <Icon className="used-more--icon" icon={IconNames.MORE} size={14}/>
                                        </Button>
                                        <Menu>
                                            {
                                                abTag.usage.map((actionUnitId, index) => {
                                                    const actionUnit = this.storage.getActionUnit(actionUnitId);
                                                    const name = actionUnit ? actionUnit.name : "NOT FOUND";
                                                    const icon = actionUnit ? getActionUnitIcon(actionUnit) : IconNames.DOCUMENT;
                                                    return <MenuItem
                                                        key={index}
                                                        icon={icon}
                                                        text={name}
                                                        onClick={() => actionUnitClick(actionUnit)}
                                                    />
                                                })
                                            }
                                        </Menu>
                                    </Popover>
                                ) : null
                        }
                    </div>
                </Cell>
            )
        }
        return (
            <EditableCell
                key={rowIndex + "-" + columnIndex}
                rowIndex={rowIndex}
                columnIndex={columnIndex}
                value={cellValue}
                intent={this.state.invalidCellSet[rowIndex + "-" + columnIndex] ? Intent.DANGER : undefined}
                onChange={(v) => editCallback(CellEditEvent.onChange, v)}
                onConfirm={(v) => editCallback(CellEditEvent.onConfirm, v)}
            />
        )
    };


    private editCell = async (event: CellEditEvent, value: string, row?: number, col?: number) => {
        if (event === CellEditEvent.onCancel || row === undefined || col === undefined) return;

        const rowIndexReal = (this.state.sortedIndexMap[row] === undefined) ?
            row :
            this.state.sortedIndexMap[row];

        const abTag = this.tagsUI[rowIndexReal];
        const invalidCellSet = this.state.invalidCellSet;

        if (event === CellEditEvent.onChange) {

            // only for tag and program name
            if (col === 0 || col === 1) value = value.replace(" ", "_");

            if (col === 0) {
                if (this.cellChangeBuffer === null) this.cellChangeBuffer = abTag.tagname;
                abTag.tagname = value;
            } else if (col === 1) {
                if (this.cellChangeBuffer === null) this.cellChangeBuffer = abTag.program;
                abTag.program = value;
            } else if (col === 3) {
                if (this.cellChangeBuffer === null) this.cellChangeBuffer = abTag.desc;
                abTag.desc = value;
            }

            invalidCellSet[row + "-" + col] = (col === 0) ?
                !CipTagHelper.isValidTagname(value) :
                (col === 1) ?
                    !CipTagHelper.isValidProgramName(value) :
                    false;

            this.setState({invalidCellSet});
        }

        if (event === CellEditEvent.onChangeDataType) {
            if (abTag.datatype === value) return;

            abTag.datatype = value;
            await this.tagService.setTag(abTag);
            this.setState({rerenderRequest: true}); // this is to show the changed cell
        }

        if (event === CellEditEvent.onConfirm) {
            const isNoChanges = (
                (col === 0 && abTag.tagname === this.cellChangeBuffer) ||
                (col === 1 && abTag.program === this.cellChangeBuffer) ||
                (col === 3 && abTag.desc === this.cellChangeBuffer) ||
                this.cellChangeBuffer === null
            );

            this.cellChangeBuffer = null;
            if (isNoChanges) return;

            await this.tagService.setTag(abTag, true);
        }
    };

    private columnHeaderCellRenderer = (name: string, index: number) => {
        const icon: IconName = (sortDirections[index] > 0) ? IconNames.CARET_UP :
            (sortDirections[index] < 0) ? IconNames.CARET_DOWN : IconNames.DOUBLE_CARET_VERTICAL;

        return (
            <ColumnHeaderCell
                className="column-header--custom"
                name={name}
            >
                <Button
                    className="column-header--icon"
                    small={true}
                    minimal={true}
                    icon={icon}
                    onClick={() => this.setDirectionAndSort(index)}
                />
            </ColumnHeaderCell>
        )
    };

    private setDirectionAndSort = (index: number) => {
        const isAsc = sortDirections[index] !== 1;
        sortDirections.fill(0);
        sortDirections[index] = (isAsc) ? 1 : -1;
        this.sortColumn();
    }
}
