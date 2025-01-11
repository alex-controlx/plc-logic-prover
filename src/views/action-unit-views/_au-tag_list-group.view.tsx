import { ActionUnitType, IUnitTestAU} from "../../_common/action-unit";
import {ITagUI} from "../../_common/interfaces";
import React, {ReactNode} from "react";
import {MultiSelect} from "@blueprintjs/select";
import {Button, MenuItem} from "@blueprintjs/core";
import {
    StvGenericGroupViewProps,
    StvGenericGroupViewState,
    StvGenericGroupView,
    ModTagViewGroup
} from "./_au-generic.view";
import {Intent} from "@blueprintjs/core/lib/esm/common/intent";
import {DELETED_TAG_LABEL} from "./_au-shared.view";
import TagsService from "../../services/storage/tags.service";

// const logger = new Logger("TagListInputGroupState");
const TagMultiSelect = MultiSelect.ofType<ITagUI>();

interface TagListInputGroupProps extends StvGenericGroupViewProps {

}

interface TagListInputGroupState extends StvGenericGroupViewState {
    noChangeTags: ITagUI[],
}

export class TagListInputGroup extends StvGenericGroupView<TagListInputGroupProps, TagListInputGroupState> {
    public groupType = ModTagViewGroup.T_LIST;
    protected actionUnit = (this.detailsPanelService.actionUnit as IUnitTestAU);

    constructor(props: TagListInputGroupProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.UnitTest)
            throw new Error("This input group supports 'Unit Test' Actions only");

        const deletedTagIds = this.actionUnit.params.noChangeTagIds.filter(tagId => {
            return !this.tags.some(tagUi => tagUi.id === tagId)
        });

        for (const deletedTagId of deletedTagIds) {
            const deletedTag = TagsService.generateTag();
            deletedTag.id = deletedTagId;
            deletedTag.tagname = DELETED_TAG_LABEL;
            this.tags.push(deletedTag)
        }

        this.state = {
            paramsArray: [],
            invalidTags: [],
            noChangeTags: this.tags.filter(item => this.actionUnit.params.noChangeTagIds.includes(item.id)),
        };
    }

    protected _getTagsToSet() {return []}


    componentDidUpdate() {
        this.actionUnit.params.noChangeTagIds = this.state.noChangeTags.map(uiTag => uiTag.id);
    }

    private noChange_handleTagSelect = (tag: ITagUI) => {
        this.detailsPanelService.isDirty = true;
        const noChangeTags = this.state.noChangeTags;

        noChangeTags.push(tag);
        this.setState({noChangeTags});
    };

    private noChange_handleClear = () => {
        this.detailsPanelService.isDirty = true;
        const noChangeTags = this.state.noChangeTags;

        noChangeTags.length = 0;
        this.setState({noChangeTags});
    };

    private noChange_handleTagRemove = (tagname: ReactNode, index: number) => {
        tagname = tagname;
        this.detailsPanelService.isDirty = true;
        const noChangeTags = this.state.noChangeTags;

        noChangeTags.splice(index, 1);
        this.setState({noChangeTags})
    };


    render() {
        const clearButton = this.state.noChangeTags.length > 0 ?
            <Button icon="cross" minimal={true} onClick={this.noChange_handleClear} /> :
            undefined;

        const getTagProps = (value: ReactNode) => ({
            minimal: true,
            intent: value === DELETED_TAG_LABEL ? Intent.DANGER : undefined
        });

        return (
            <div>

                <p className="section-header">
                    <strong>{this.props.title}</strong>
                </p>
                <TagMultiSelect
                    fill={true}
                    resetOnSelect={true}
                    tagRenderer={this.suggestShared.ui_renderInputValue}
                    tagInputProps={{
                        tagProps: getTagProps,
                        onRemove: this.noChange_handleTagRemove,
                        rightElement: clearButton
                    }}
                    initialContent={this.suggestShared.ui_initialContent(this.tags)}

                    itemPredicate={this.suggestShared.ui_filterAbTags}
                    itemRenderer={this.suggestShared.ui_renderAbTag}
                    items={this.tags}

                    noResults={<MenuItem disabled={true} text="No results." />}
                    onItemSelect={(abTag: ITagUI) => this.noChange_handleTagSelect(abTag)}
                    popoverProps={{minimal: true}}
                    selectedItems={this.state.noChangeTags}
                />
                <div className="vertical-spacer-25"/>
            </div>
        )
    }
}
