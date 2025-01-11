import React from "react";
import {H5, MenuItem} from "@blueprintjs/core";
import {ITagUI} from "../../_common/interfaces";
import TagsService from "../../services/storage/tags.service";
import {ItemPredicate, ItemRenderer} from "@blueprintjs/select";
import {ISetTagValue} from "../../_common/action-unit";
import CipTagHelper from "../../_common/classes/cip_validator.class";
import {DataType, TagHelper} from "../../_common/classes/tag_helper.class";

export const DELETED_TAG_LABEL = "_tag_deleted_";

interface PanelHeaderProps {
    title: string
}

export const PanelHeader:React.FunctionComponent<PanelHeaderProps> = (props) => {
    return (
        <div>
            <div className="vertical-spacer-25"/>
            <H5 className="section-header">{props.title}</H5>
            <hr/>
        </div>
    )
};




export class TagSuggestShared {
    private lastSelectedTag: ITagUI | undefined;
    private tagService: TagsService;

    constructor(tagService: TagsService, lastSelectedTag?: ITagUI) {
        this.lastSelectedTag = lastSelectedTag;
        this.tagService = tagService;
    }

    public ui_renderInputValue = (tagUI: ITagUI) => tagUI.tagname;

    public ui_getBitMenu = (
        modTagValue: ISetTagValue,
        index: number,
        handleBitSelect: (value: string, index: number) => void
    ) => {
        const tag = this.tagService.getTag(modTagValue.tagId);
        let bitMenu;
        if (tag && TagHelper.isInteger(tag.datatype)) {
            const options = TagHelper.bitArray(tag.datatype);
            bitMenu = (
                <div className="utp--bit-select-container">
                    <select
                        className="utp--bit-select"
                        value={modTagValue.bitNo}
                        onChange={(e) => handleBitSelect(e.target.value, index)}
                    >
                        <option key={0} value={-1}>{tag.datatype}</option>
                        {options.map(item => (
                            <option key={item + 1} value={item}>
                                BIT {item}
                            </option>

                        ))}
                    </select>
                </div>
            )
        }
        return bitMenu
    };

    public ui_initialContent = (tags: ITagUI[]) => {
        if (tags.length < 8) return;
        return (
            <MenuItem disabled={true} text={`Start typing. Filtering ${tags.length} tags.`} />
        )
    };

    public ui_renderAbTag: ItemRenderer<ITagUI> = (tagUI, { handleClick, modifiers}) => {
        if (!modifiers.matchesPredicate || tagUI.tagname === DELETED_TAG_LABEL) {
            return null;
        }
        const text = tagUI.tagname + ((tagUI.program) ? " [" + tagUI.program + "]": "");
        return (
            <MenuItem
                active={modifiers.active}
                disabled={modifiers.disabled}
                label={tagUI.datatype}
                key={tagUI.id}
                onClick={handleClick}
                text={text}
            />
        );
    };

    public ui_filterAbTags: ItemPredicate<ITagUI> = (query, tagUI) => {
        return tagUI.tagname.toLowerCase().indexOf(query.toLowerCase()) >= 0 ||
            tagUI.desc.toLowerCase().indexOf(query.toLowerCase()) >= 0;
    };

    public ui_renderCreateAbTagOption = (
        query: string,
        active: boolean,
        handleClick: React.MouseEventHandler<HTMLElement>,
    ) => {

        if (!CipTagHelper.isValidTagname(query)) return;

        const text = (!this.lastSelectedTag) ?
            `Create BOOL "${query}"`:
            `Create ${this.lastSelectedTag.datatype} "${query}"${(this.lastSelectedTag.program) ? " at " + this.lastSelectedTag.program : ""}`;

        return (
            <MenuItem
                icon="add"
                text={text}
                active={active}
                onClick={handleClick}
                shouldDismissPopover={false}
            />
        )
    };

    public ui_createTagUI = (title: string): ITagUI => {
        const newTag: ITagUI = TagsService.generateTag();
        newTag.tagname = title;

        if (this.lastSelectedTag) {
            newTag.program = this.lastSelectedTag.program;
            newTag.datatype = this.lastSelectedTag.datatype;
        }

        return newTag;
    };

    public ui_handleItemDisabled = (tagUI: ITagUI): boolean => {
        return tagUI.datatype === DataType.REAL;
    }

    public setLastSelectedTag(tagUI: ITagUI) {
        this.lastSelectedTag = tagUI;
    }
}
