import React from "react";
import {
    ActionUnitType, IModTagValue,
    ISetTagValue, ISetValueAuType,
} from "../../_common/action-unit";
import {ITagUI} from "../../_common/interfaces";
import {Suggest} from "@blueprintjs/select";
import {Button, HTMLInputProps, IInputGroupProps, Intent, MenuItem, NumericInput} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
// import Logger from "../../_ui_common/logger.service";
import {
    StvGenericGroupViewProps,
    StvGenericGroupViewState,
    StvGenericGroupView,
    ModTagViewGroup
} from "./_au-generic.view";

// const logger = new Logger("StvInputGroup");
const TagSuggest = Suggest.ofType<ITagUI>();


interface StvInputGroupState extends StvGenericGroupViewState {
}

export class StvInputGroup extends StvGenericGroupView<StvGenericGroupViewProps, StvInputGroupState> {
    public groupType = ModTagViewGroup.STV;
    actionUnit = (this.detailsPanelService.actionUnit as ISetValueAuType);

    constructor(props: StvGenericGroupViewProps) {
        super(props);

        const paramsArray = this._getTagsToSet(this.actionUnit);

        this.state = {
            paramsArray,
            invalidTags: this.getInitInvalidTags(paramsArray),
        };
    }


    protected _getTagsToSet(actionUnit: ISetValueAuType): ISetTagValue[] | IModTagValue[] {
        switch (actionUnit.type) {
            case ActionUnitType.SetTagValue: return actionUnit.params.tagsToSet;
            case ActionUnitType.CheckTagValue: return actionUnit.params.tagsToCheck;
            case ActionUnitType.UnitTest: return actionUnit.params.tagsToModify;
        }
        return [];
    }



    render() {
        const {paramsArray} = this.state;
        return (
            <div>
                <p className="section-header">
                    <strong>{this.props.title}</strong>
                    <Button
                        className="align-right"
                        icon={IconNames.ADD}
                        minimal={true}
                        onClick={this.handleAddClick}
                    />
                </p>
                <div className="utp--actions-header-row">
                    <div className="utp--input-tagname-header">Tag name</div>
                    <div className="utp--input-value-header">
                        {(this.actionUnit.type === ActionUnitType.CheckTagValue)? "To be checked to" : "Set to value"}
                    </div>
                </div>
                {
                    (paramsArray.length > 0) ?
                        paramsArray.map( (setTagValue: ISetTagValue, index: number) => {

                            const inputPros: IInputGroupProps & HTMLInputProps = {
                                placeholder: 'Select tag',
                                rightElement: this.suggestShared.ui_getBitMenu(setTagValue, index, this.handleBitSelect),
                                onBlur: (e) =>
                                    this._onTagInputBlur(e.target.value, index, setTagValue.tagId),
                                intent: (this.state.invalidTags[index]) ? Intent.DANGER : undefined,
                            };

                            return (
                                <div
                                    key={`${setTagValue.tagId}-${index}`}
                                    className="utp--group-container"
                                >
                                    <TagSuggest
                                        className="utp--input-tagname"
                                        inputProps={ inputPros }
                                        itemPredicate={this.suggestShared.ui_filterAbTags}
                                        itemRenderer={this.suggestShared.ui_renderAbTag}
                                        items={this.tags}
                                        query={this.tagService.getTag(setTagValue.tagId)?.tagname}
                                        createNewItemFromQuery={this.suggestShared.ui_createTagUI}
                                        createNewItemRenderer={this.suggestShared.ui_renderCreateAbTagOption}
                                        inputValueRenderer={this.suggestShared.ui_renderInputValue}
                                        initialContent={this.suggestShared.ui_initialContent(this.tags)}

                                        noResults={<MenuItem disabled={true} text="No results." />}
                                        onItemSelect={(abTag: ITagUI) => this.handleTagSelect(abTag, index)}
                                        popoverProps={{minimal: true}}
                                        // itemDisabled={this.ui_handleItemDisabled}
                                    />
                                    <NumericInput
                                        className="utp--input-value"
                                        value={setTagValue.toValue || 0}
                                        onValueChange={(value: number) => this.handleToValueChange(value, index)}
                                    />
                                    <Button
                                        className="utp--action-trash"
                                        icon={IconNames.TRASH}
                                        disabled={paramsArray.length < 2}
                                        minimal={true}
                                        onClick={() => this.handleDeleteClick(index)}
                                    />
                                </div>
                            )
                        })
                        :
                        <div>No inputs defined</div>
                }
                <div className="vertical-spacer-25"/>
            </div>
        )
    }
}
