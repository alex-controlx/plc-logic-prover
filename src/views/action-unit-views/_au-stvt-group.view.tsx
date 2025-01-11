import {
    ActionUnitType,
    ISetValueTimedAuType, ModTagValueTimed,
    ParamsTimedProp,
} from "../../_common/action-unit";
import {ITagUI} from "../../_common/interfaces";
import React from "react";
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

// const logger = new Logger("StvtInputGroup");
const TagSuggest = Suggest.ofType<ITagUI>();

interface StvtInputGroupProps extends StvGenericGroupViewProps {
    paramProp: ParamsTimedProp,
}

interface StvtInputGroupState extends StvGenericGroupViewState {
    paramsArray: ModTagValueTimed[]
}

// SetTagValueTimed
export class StvtInputGroup extends StvGenericGroupView<StvtInputGroupProps, StvtInputGroupState> {
    public groupType = ModTagViewGroup.STVT;
    protected actionUnit = this.detailsPanelService.actionUnit;

    constructor(props: StvtInputGroupProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.UnitTest && this.actionUnit.type !== ActionUnitType.ResetTagValue)
            throw new Error("This input group supports 'Unit Test' OR 'Reset Tag Value' Actions only");

        const paramsArray = this._getTagsToSet(this.actionUnit);

        this.state = {
            paramsArray,
            invalidTags: this.getInitInvalidTags(paramsArray),
        };
    }

    protected _getTagsToSet(actionUnit: ISetValueTimedAuType): ModTagValueTimed[] {
        if (actionUnit.type === ActionUnitType.UnitTest && this.props.paramProp === ParamsTimedProp.expectedChanges) {
            return actionUnit.params.expectedChanges;
        }

        if (this.props.paramProp === ParamsTimedProp.tagsToToggle) {
            return actionUnit.params.tagsToToggle;
        }
        return [];
    }



    render() {
        const {paramsArray} = this.state;
        // const setTagValues = this._getTagsToSet(actionUnit);

        let column2Name: string = "Value";
        let column3Name: string = "Time, s";
        let noResults: string = "No tags added";
        if (this.props.paramProp === ParamsTimedProp.expectedChanges) {
            column2Name = "Expected to be";
            column3Name = "After, sec";
            noResults = "No outputs defined";
        } else if (this.props.paramProp === ParamsTimedProp.tagsToToggle) {
            column2Name = "Toggle to";
            column3Name = "Hold for, sec";
            noResults = "No tags to toggle";
        }

        return (
            <div>

                <p className="section-header">
                    <strong>{this.props.title}</strong>
                    <Button
                        className="align-right"
                        icon={IconNames.ADD}
                        minimal={true}
                        onClick={this.handleAddTimedClick}
                    />
                </p>
                {
                    (paramsArray.length > 0) ?
                        <div>
                            <div className="utp--actions-header-row">
                                <div className="utp--output-tagname-header">Tag name</div>
                                <div className="utp--output-value-header">{column2Name}</div>
                                <div className="utp--output-after-s-header">{column3Name}</div>
                            </div>
                            {
                                paramsArray.map( (setTagValue, index) => {

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
                                                className="utp--output-tagname"
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
                                                className="utp--output-value"
                                                value={setTagValue.toValue || 0}
                                                onValueChange={(value: number) => this.handleToValueChange(value, index)}
                                            />
                                            <NumericInput
                                                className="utp--output-after-s"
                                                min={0}
                                                majorStepSize={1}
                                                stepSize={0.1}
                                                minorStepSize={0.01}
                                                value={setTagValue.after_s || 0}
                                                onValueChange={(value: number) => this.handleAfterSecChange(value, index)}
                                            />
                                            <Button
                                                className="utp--action-trash"
                                                icon={IconNames.TRASH}
                                                disabled={
                                                    this.props.paramProp === ParamsTimedProp.expectedChanges &&
                                                    paramsArray.length < 2
                                                }
                                                minimal={true}
                                                onClick={() => this.handleDeleteClick(index)}
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                        :
                        <div>{noResults}</div>
                }
                <div className="vertical-spacer-25"/>
            </div>
        )
    }
}
