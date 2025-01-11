import React, {BaseSyntheticEvent, ChangeEvent, Component} from "react";
import "./sidebar.scss";
import {Button, Classes, Icon, InputGroup, Intent, ITreeNode, Position, Tooltip, Tree} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import {TreeMoreMenu} from "./tree-more-menu";
import Logger, {ERRORS} from "../../_ui_common/logger.service";
import {
    AddActionUnitConfig,
    DeleteActionSetConfig,
    EditActionSetConfig,
    MoveToActionUnitConfig,
} from "../../services/storage";
import StorageService from "../../services/storage/storage.service";
import {AppToasterService} from "../../services/app-toaster.service";
import DetailsPanelService from "../../services/details-panel.service";
import {ActionSetDialogService, ActionUnitDialogService} from "../../services/app-dialogs.service";
import {AppStateService} from "../../services/app-state.service";
import {IActionUnit, IInvalidUnitMessage} from "../../_common/action-unit";
import {DpDisplayedType, IActionSet} from "../../_common/interfaces";
import {getActionUnitIcon} from "../../_ui_common/ui.interfaces";
import UnitsChecker from "../../services/storage/units-checker";


const logger = new Logger("Sidebar");


export enum ActionSetModsType {
    addActionUnit,
    edit,
    delete,
}

interface SidebarProps {}

interface SidebarState {
    wrapperWidth: number;
    nodes: ITreeNode[];
    searchValue: string;

}

class Sidebar extends Component<SidebarProps, SidebarState> {
    private unsubscribers: Function[] = [];
    private minSideBarWidth = 270;
    private maxSideBarWidth = 500;
    private nodes: ITreeNode[];

    private storage: StorageService = new StorageService();
    private appStateService = new AppStateService();
    private toaster = new AppToasterService();
    private detailsPanelService = new DetailsPanelService();
    private asDialogService = new ActionSetDialogService();
    private auDialogService = new ActionUnitDialogService();
    private unitsChecker = new UnitsChecker();
    private selectedActionUnitId: string = "";

    constructor(props: SidebarProps) {
        super(props);

        this.nodes = this.getInitialState(
            this.appStateService.sidebar().getExpanded(),
            [this.detailsPanelService.actionUnitId],
            );

        this.state = {
            wrapperWidth: 300,
            searchValue: "",
            nodes: this.nodes,
        }
    };



    componentDidMount(): void {
        this.unsubscribers.push(
            this.detailsPanelService.showActionUnitSubscriber(this.handleExternalRequestToShowNode),
            this.storage.subscribeOnDeleteActionSet(this.delParentNode),
            this.storage.subscribeOnEditActionSet(this.editParentNode),
            this.storage.subscribeOnAddActionUnit(this.addChildNode),
            this.storage.subscribeOnDeleteActionUnit(this.delChildNode),
            this.storage.subscribeOnMoveActionUnit(this.moveChildNode),
            this.storage.subscribeOnUpdateActionUnit(this.editChildNode),
            this.unitsChecker.onUpdatedInvalidUnitsSubscriber(this.handleUpdatedInvalidUnits),
        );
    }

    componentWillUnmount(): void {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    // -------------------------------------- MODIFYING NODES ----------------------------------------

    private getInitialState = (nodeIdsToExpand?: string[], nodesIdsToSelect?: string[]): ITreeNode[] => {
        const out: ITreeNode[] = [];
        nodeIdsToExpand = nodeIdsToExpand || [];
        nodesIdsToSelect = nodesIdsToSelect || [];

        const actionSetIds = this.storage.getProject().actionSetIds;

        for (const actionSetId of actionSetIds) {
            const actionSet = this.storage.getActionSet(actionSetId);
            if (!actionSet) {
                logger.error(ERRORS.err004 + ": " + actionSetId);
                continue;
            }
            const newTreeNode = createTreeNodeFromActionSet(
                this._handleActionSetModClick, actionSet);

            if (nodeIdsToExpand.includes(actionSet.id)) newTreeNode.isExpanded = true;
            // if (nodesIdsToSelect.includes(actionSet.id)) newTreeNode.isSelected = true;

            for (const actionUnitId of actionSet.actionUnitIds) {
                const actionUnit = this.storage.getActionUnit(actionUnitId);
                if (!actionUnit) {
                    logger.error(ERRORS.err005 + ": " + actionUnitId);
                    continue;
                }

                const isInvalid = !!this.unitsChecker.getInvalidAUById(actionUnit.id);
                const childNode = addActionUnitToTreeNode(newTreeNode, actionUnit, -1, isInvalid);
                if (nodesIdsToSelect.includes(actionUnit.id)) childNode.isSelected = true;
            }
            out.push(newTreeNode);
        }

        return out;
    };

     private delParentNode = (config: DeleteActionSetConfig) => {
        //TODO fix lazy approach

        this.nodes = this.getInitialState(
            this.appStateService.sidebar().getExpanded(),
            [this.detailsPanelService.actionUnitId],
        );
        const isToBeMoved = (
            config.actionSet.actionUnitIds.length &&
            config.moveToId &&
            config.moveToId !== config.actionSet.id
        );
        if (isToBeMoved) {
            const parentNodeMovedTo = this.nodes.find(item => item.id === config.moveToId);
            if (parentNodeMovedTo) parentNodeMovedTo.isExpanded = true;
        }
        this.setState({nodes: this.nodes});
    };

    private editParentNode = (config: EditActionSetConfig) => {
        const actionSet = config.actionSet;
        logger.log("Editing Tree Node:", actionSet.name);

        if (config.isAdding) {
            const newTreeNode = createTreeNodeFromActionSet(this._handleActionSetModClick, actionSet);
            addParentNode(this.nodes, newTreeNode, config.insertBeforeId);
            // newTreeNode.isSelected = true;
        } else {
            const currentNode = this.nodes.find(node => node.id === actionSet.id);
            if (!currentNode) return logger.error(ERRORS.err001);

            currentNode.label = actionSet.name;
            currentNode.className = (actionSet.enabled) ? "" : "action-set-ignored";

            // check if relocating is required
            if (config.insertBeforeId !== actionSet.id) {
                moveParentNode(this.nodes, currentNode, config.insertBeforeId)
            }
        }

        if (this.state.searchValue) this._notifyOnSearchValue();
        this.setState({nodes: this.nodes});

        function addParentNode(nodes: ITreeNode[], node: ITreeNode, insertBeforeId: string) {
            const position = nodes.findIndex(item => item.id === insertBeforeId);
            if (position >= 0) {
                nodes.splice(position, 0, node);
            } else {
                nodes.push(node);
            }
        }
        function moveParentNode(nodes: ITreeNode[], node: ITreeNode, insertBeforeId: string) {
            const positionToRemove = nodes.findIndex(item => item.id === node.id);
            if (!(positionToRemove >= 0)) return logger.error(ERRORS.err010);
            // deleting the node from the nodes
            nodes.splice(positionToRemove, 1);
            // adding the deleted node to the nodes
            addParentNode(nodes, node, insertBeforeId);
        }
    };

    private addChildNode = async (config: AddActionUnitConfig) => {
        logger.log("Adding Child Tree Node:", config.name);
        const actionUnit = this.storage.getActionUnit(config.actionUnitId);
        if (!actionUnit) return logger.error(ERRORS.err013);

        await this._insertChildNode(config.actionSetId, actionUnit, config.insertBeforeId);

        if (this.state.searchValue) this._notifyOnSearchValue();
        this.setState({nodes: this.nodes});
    };

    private delChildNode = (actionUnit: IActionUnit) => {
        this._deleteChildNode(actionUnit);
        this.setState({nodes: this.nodes});
    };

    private moveChildNode = async (config: MoveToActionUnitConfig) => {
        const actionUnit = this.storage.getActionUnit(config.actionUnitId);
        if (!actionUnit) return logger.error(ERRORS.err021);

        this._deleteChildNode(actionUnit, config.fromActionSetId);
        await this._insertChildNode(config.toActionSetId, actionUnit, config.insertBeforeId);
        this.setState({nodes: this.nodes});
    };

    private editChildNode = (actionUnit: IActionUnit, isInvalid?: boolean) => {

        const parentNode = this.nodes.find(item => item.id === actionUnit.parentId);
        if (!parentNode || !parentNode.childNodes) return logger.error(ERRORS.err012);

        const childNode = parentNode.childNodes.find(item => item.id === actionUnit.id);
        if (!childNode) return logger.error(ERRORS.err017);

        isInvalid = isInvalid !== undefined ? isInvalid : !!this.unitsChecker.getInvalidAUById(actionUnit.id);

        childNode.label = actionUnit.name;
        childNode.className = (actionUnit.enabled) ? "" : "action-set-ignored";
            // (isInvalid ? "action-unit-invalid" : "") : "action-set-ignored";
        childNode.secondaryLabel = (isInvalid) ?
            (<span className="action-unit-invalid spacer-right-10">!</span>) : null;


        this.setState({nodes: this.nodes});
    };

    private handleUpdatedInvalidUnits = (invalidAu: IInvalidUnitMessage | string) => {
        if (typeof invalidAu === "string") {
            const actionUnit = this.storage.getActionUnit(invalidAu);
            if (!actionUnit) return logger.error(ERRORS.sb01);

            this.editChildNode(actionUnit, false);
        } else {
            const actionUnit = this.storage.getActionUnit(invalidAu.actionUnitId);
            if (!actionUnit) return logger.error(ERRORS.sb02);

            this.editChildNode(actionUnit, true);
        }
    }


    private handleExternalRequestToShowNode = (actionUnitId: string) => {
        if (this.selectedActionUnitId === this.detailsPanelService.actionUnitId) return;
        for (const parenNode of this.nodes) {
            if (parenNode.childNodes) {
                for (const childNode of parenNode.childNodes) {
                    if (childNode.id === actionUnitId) return this.highlightActionUnitInTree(childNode, parenNode);
                }
            }
        }
    }

    private dragHandle(e: BaseSyntheticEvent<MouseEvent>) {
        if (e.nativeEvent.button !== 0) return;
        e.preventDefault();
        const self = this;
        let prevOffsetX = 0;
        const clickMouseX = e.nativeEvent.pageX;
        const initialWidth = self.state.wrapperWidth;
        document.addEventListener("mouseup", mouseUpHere);
        document.addEventListener("mousemove", trackMouse);

        function mouseUpHere() {
            document.removeEventListener("mouseup", mouseUpHere);
            document.removeEventListener("mousemove", trackMouse);
        }

        function trackMouse(e: MouseEvent) {
            const currentOffsetX = e.pageX - clickMouseX;
            if (prevOffsetX === currentOffsetX) return;
            prevOffsetX = currentOffsetX;
            const newWidth = initialWidth + currentOffsetX;
            if (newWidth > self.minSideBarWidth && newWidth < self.maxSideBarWidth) {
                self.setState({ wrapperWidth: newWidth });
            }
        }
    }

    private handleNodeClick = async (treeNode: ITreeNode, _nodePath: number[]) => {
        if (!treeNode.childNodes && (this.detailsPanelService.displayed !== DpDisplayedType.ActionUnit || !treeNode.isSelected)) {
            await this.onSelectActionUnit(treeNode, this.state.nodes[_nodePath[0]]);
        }
    };

    private handleNodeDoubleClick = (treeNode: ITreeNode, _nodePath: number[]) => {

        if (treeNode.childNodes && treeNode.childNodes.length > 0) {
            treeNode.isExpanded = !treeNode.isExpanded;

            if (treeNode.isExpanded) this.appStateService.sidebar().addExpandedId([treeNode.id.toString()]);
            else this.appStateService.sidebar().removeExpandedId(treeNode.id.toString());

            this.setState({nodes: this.state.nodes});
        }
    };

    private handleNodeCollapse = (treeNode: ITreeNode) => {
        treeNode.isExpanded = false;
        this.appStateService.sidebar().removeExpandedId(treeNode.id.toString());
        this.setState({nodes: this.state.nodes});
    };

    private handleNodeExpand = (treeNode: ITreeNode) => {
        treeNode.isExpanded = true;
        this.appStateService.sidebar().addExpandedId([treeNode.id.toString()]);
        this.setState({nodes: this.state.nodes});
    };

    private forEachNode(nodes: ITreeNode[], callback: (node: ITreeNode) => void) {
        if (nodes == null) return;

        for (const node of nodes) {
            callback(node);
            if (node.childNodes) this.forEachNode(node.childNodes, callback);
        }
    }

    private async onSelectActionUnit(childTreeNode: ITreeNode, parentTreeNode: ITreeNode) {
        if (!await this.detailsPanelService.isConfirmedToProceed()) return;

        this.highlightActionUnitInTree(childTreeNode, parentTreeNode);
        this.detailsPanelService.showActionUnit(this.selectedActionUnitId);
    }

    private highlightActionUnitInTree(childTreeNode: ITreeNode, parentTreeNode: ITreeNode) {
        const nodes = this.state.nodes;
        this.forEachNode(this.nodes, n => n.isSelected = false);
        childTreeNode.isSelected = true;
        parentTreeNode.isExpanded = true;
        this.appStateService.sidebar().addExpandedId([parentTreeNode.id.toString()]);
        this.selectedActionUnitId = childTreeNode.id.toString();

        this.setState({nodes})
    }

    private handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
        const searchValue = (event.target.value) ? event.target.value.toLowerCase() : "";
        this.setState({nodes: this.filteredNodes(searchValue), searchValue});
    };

    private filteredNodes(searchValue: string): ITreeNode[] {
        if (searchValue) {
            return this.nodes.filter((node: ITreeNode): boolean => {
                if (node.label.toString().toLowerCase().includes(searchValue)) {
                    return true
                }

                if (node.childNodes) {
                    return node.childNodes.some(
                        (childNode) =>
                            childNode.label.toString().toLowerCase().includes(searchValue)
                    );
                }
                return false
            })
        }

        return this.nodes
    }

    private handleCollapseAll = () => {
        const nodes = this.state.nodes;
        nodes.forEach(n => (n.isExpanded = false));
        this.appStateService.sidebar().removeAllExpandedIds();
        this.setState({nodes});
    };

    private expandAllHandle = () => {
        const nodes = this.state.nodes;
        const nodeIds: string[] = [];
        nodes.forEach(n => {n.isExpanded = true; nodeIds.push(n.id.toString())});
        this.appStateService.sidebar().addExpandedId(nodeIds);
        this.setState({nodes});
    };

    // ------------------------------------- TREE MORE MENU ------------------------------------------------

    private _notifyOnSearchValue() {
        this.toaster.showToast({
            icon: IconNames.WARNING_SIGN,
            intent: Intent.WARNING,
            message: "Filter value is disregarded. Re-enter value to filter again.",
            // timeout: 1000,
        })
    }

    private async _insertChildNode(actionSetId: string, actionUnit: IActionUnit, insertBeforeId: string) {
        const parentNode = this.nodes.find(item => item.id === actionSetId);
        const actionSet = this.storage.getActionSet(actionSetId);
        if (!parentNode || !parentNode.childNodes || !actionSet) return logger.error(ERRORS.err012);

        const newPosition = parentNode.childNodes.findIndex(item => item.id === insertBeforeId);
        const isInvalid = !!this.unitsChecker.getInvalidAUById(actionUnit.id);
        const newChildNode = addActionUnitToTreeNode(parentNode, actionUnit, newPosition, isInvalid);

        await this.onSelectActionUnit(newChildNode, parentNode);
    }

    private _deleteChildNode(actionUnit: IActionUnit, fromActionSetId?: string) {
        fromActionSetId = fromActionSetId || actionUnit.parentId;
        const parentNode = this.nodes.find(item => item.id === fromActionSetId);
        if (!parentNode || !parentNode.childNodes) return logger.error(ERRORS.err012);

        const childNodeIndex = parentNode.childNodes.findIndex(item => item.id === actionUnit.id);
        if (childNodeIndex < 0) return logger.error(ERRORS.err017);

        parentNode.childNodes.splice(childNodeIndex, 1);
        if (parentNode.childNodes.length === 0) parentNode.hasCaret = false;
    }

    private _handleActionSetModClick = (actionSetModsType: ActionSetModsType, treeNode: ITreeNode) => {
        const actionSetId = treeNode.id.toString();

        if (actionSetModsType === ActionSetModsType.addActionUnit) {
            return this.auDialogService.showAddDialog(actionSetId);
        }

        if (actionSetModsType === ActionSetModsType.edit) {
            return this.asDialogService.showEditDialog(actionSetId);
        }

        if (actionSetModsType === ActionSetModsType.delete) {
            treeNode.isExpanded = true;
            return this.asDialogService.showDeleteDialog(actionSetId);
        }
    };









    // ------------------------------------- RENDER IT ------------------------------------------------

    public render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return (
            <div className="left-sidebar-wrapper" style={{width: this.state.wrapperWidth}}>
                <div className={"workspace-left-sidebar"}>
                    <div className={"workspace-left-sidebar__search-container"}>
                        <InputGroup
                            disabled={false}
                            large={false}
                            leftIcon="search"
                            type={"search"}
                            onChange={this.handleFilterChange}
                            placeholder="Filter by name"
                            // rightElement={maybeSpinner}
                            value={this.state.searchValue}
                        />
                    </div>
                    <div className={"action-set-sidebar"}>
                        <div className={"sidebar-tools"}>
                            <Tooltip content="Expand all" position={Position.BOTTOM_LEFT}>
                                <Button
                                    small={true}
                                    minimal={true}
                                    icon={IconNames.EXPAND_ALL}
                                    icon-size={4}
                                    onClick={this.expandAllHandle}
                                />
                            </Tooltip>
                            <Tooltip content="Collapse all" position={Position.BOTTOM_LEFT}>
                                <Button
                                    small={true}
                                    minimal={true}
                                    icon={IconNames.COLLAPSE_ALL}
                                    onClick={this.handleCollapseAll}
                                />
                            </Tooltip>
                        </div>
                        <div className="action-set-sidebar-list">
                            {
                                (this.state.nodes.length) ?
                                    <Tree
                                        contents={this.state.nodes}
                                        onNodeClick={this.handleNodeClick}
                                        onNodeDoubleClick={this.handleNodeDoubleClick}
                                        onNodeCollapse={this.handleNodeCollapse}
                                        onNodeExpand={this.handleNodeExpand}
                                        className={"action-set-sidebar-tree"}
                                    /> :
                                    <div className="empty-sidebar-message">
                                        <span className={Classes.TEXT_MUTED}>[No Action Sets to show]</span>
                                    </div>
                            }
                        </div>
                    </div>

                </div>
                <div className={"workspace-left-sidebar-resize-handle"} onMouseDown={this.dragHandle.bind(this)}>
                    <Icon className={"sidebar-resize-handle-icon"} icon={"drag-handle-vertical"} />
                </div>
            </div>
        );
    }
}

export default Sidebar;

function createTreeNodeFromActionSet(
    onActionSetMods: (actionSetModsType: ActionSetModsType, treeNode: ITreeNode) => void,
    actionSet: IActionSet): ITreeNode
{
    const newTreeNode: ITreeNode = {
        id: actionSet.id,
        label: actionSet.name,
        hasCaret: false,
        icon: IconNames.FOLDER_CLOSE,
        className: (actionSet.enabled) ? "" : "action-set-ignored",
        childNodes: []
    };

    newTreeNode.secondaryLabel = (
        <TreeMoreMenu
            treeNode={newTreeNode}
            onActionSetMods={onActionSetMods}
        />
    );

    return newTreeNode;
}

function addActionUnitToTreeNode(parentNode: ITreeNode, actionUnit: IActionUnit, position: number, isInvalid: boolean): ITreeNode {
    parentNode.hasCaret = true;

    const childNode: ITreeNode = {
        id: actionUnit.id,
        label: actionUnit.name,
        icon: getActionUnitIcon(actionUnit),
        className: actionUnit.enabled ? "" : "action-set-ignored",
            // (isInvalid ? "action-unit-invalid" : "") : "action-set-ignored",
        secondaryLabel: (isInvalid) ? (<span className="action-unit-invalid spacer-right-10">!</span>) : null
    };
    if (!parentNode.childNodes) parentNode.childNodes = [];
    if (position > -1) {
        parentNode.childNodes.splice(position, 0, childNode);
    } else {
        parentNode.childNodes.push(childNode);
    }

    return childNode;
}
