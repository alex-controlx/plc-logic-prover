import React, {Component} from "react";
import {
    Button, Intent,
    ITreeNode, Menu, MenuDivider, MenuItem, Popover, PopoverPosition,
} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import {ActionSetModsType} from "./sidebar";

interface TreeMoreMenuProps {
    onActionSetMods(actionSetModsType: ActionSetModsType, treeNode: ITreeNode): void,
    treeNode: ITreeNode,
}

interface TreeMoreMenuState {}

export class TreeMoreMenu extends Component<TreeMoreMenuProps, TreeMoreMenuState> {

    private handleAddActionUnitClick = () => {
        this.props.onActionSetMods(ActionSetModsType.addActionUnit, this.props.treeNode);
    };

    private handleEditClick() {
        this.props.onActionSetMods(ActionSetModsType.edit, this.props.treeNode);
    }

    private handleDeleteClick() {
        this.props.onActionSetMods(ActionSetModsType.delete, this.props.treeNode);
    }

    public render() {
        return (
            <div>
                <Popover position={PopoverPosition.BOTTOM_RIGHT}>
                    <Button small={true} minimal={true} icon={IconNames.MORE}/>
                    <Menu>
                        <MenuItem
                            text="Add Action"
                            icon={IconNames.DOCUMENT}
                            onClick={() => this.handleAddActionUnitClick()}
                        />
                        <MenuItem
                            text="Edit"
                            icon={IconNames.EDIT}
                            onClick={() => this.handleEditClick()}
                        />
                        <MenuDivider />
                        <MenuItem
                            intent={Intent.DANGER}
                            text="Delete"
                            icon={IconNames.TRASH}
                            onClick={() => this.handleDeleteClick()}
                        />
                    </Menu>
                </Popover>
            </div>
        )
    }
}
