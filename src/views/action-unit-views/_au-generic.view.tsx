import {
    ActionUnitType,
    AuCriticalityType,
    CheckTagValue, getActionUnitConfigDescription,
    IActionUnit,
    IModTagValue,
    ISetTagValue,
    ISetValueAuType,
    ModTagValue,
    ModTagValueTimed,
    SetTagValue,
} from "../../_common/action-unit";
import React, {ChangeEvent, Component} from "react";
import {
    Button,
    Classes,
    Collapse,
    FormGroup,
    HTMLSelect,
    InputGroup,
    Intent,
    Switch,
    TextArea
} from "@blueprintjs/core";
import DetailsPanelService from "../../services/details-panel.service";
import {ITagUI} from "../../_common/interfaces";
import {TagSuggestShared} from "./_au-shared.view";
import TagsService from "../../services/storage/tags.service";
import {listAuCriticalityOptions} from "../../_ui_common/ui.interfaces";
import {IconNames} from "@blueprintjs/icons";
import {TagHelper} from "../../_common/classes/tag_helper.class";

enum GenericConfigInput {
    Name,
    Desc,
    Enable,
    Criticality,
}

export interface AuGenericViewProps {
    onSave(actionUnit: IActionUnit): void,
}

export interface AuGenericViewState {

}

export abstract class AuGenericView<P extends AuGenericViewProps, S extends AuGenericViewState> extends Component<P, S> {
    protected detailsPanelService = new DetailsPanelService();
    protected actionUnit = this.detailsPanelService.actionUnit;
    protected callPriorSave?(): void;

    protected registerCopyListener = (element: HTMLDivElement | null) => {
        element?.addEventListener("keydown", async (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "s") {

                this.handleSaveClick();
            }
        });
    }

    protected handleSaveClick = () => {
        if (typeof this.callPriorSave === "function") this.callPriorSave();
        this.props.onSave(this.actionUnit);
    };

    protected abstract renderBody(): void;

    render() {
        return (
            <div className="plugin-container" ref={this.registerCopyListener}>
                <>
                    <p>Note: {getActionUnitConfigDescription(this.actionUnit.type)}</p>
                    <ActionUnitGeneralConfig />

                    {/* ------------------------------- Main Config Body -------------------------------*/}

                    {this.renderBody()}

                    {/* ------------------------------- Footer Action Buttons -------------------------------*/}

                    <div className="plugin-container-footer-action">
                        <div className="plugin-container-footer-button">
                            <Button
                                text={"Save"}
                                disabled={!this.detailsPanelService.isDirty}
                                intent={Intent.PRIMARY}
                                onClick={this.handleSaveClick}
                            />
                            <small className={Classes.TEXT_MUTED + " helper-text"}>CTRL+S</small>
                        </div>
                    </div>
                </>
            </div>
        )
    }
}


export enum ModTagViewGroup {
    STV,        // Set Tag To Value
    STVT,       // Set Tag To Value Timed
    STFTVT,     // Set Tag From and To Value Timed
    T_LIST,     // Tag List
}


export interface StvGenericGroupViewProps {
    title: string
}

export interface StvGenericGroupViewState {
    invalidTags: boolean[],
    paramsArray: SetTagValue[],
}

export abstract class StvGenericGroupView<P extends StvGenericGroupViewProps, S extends StvGenericGroupViewState>
    extends Component<P, S> {

    public abstract groupType: ModTagViewGroup;
    protected detailsPanelService = new DetailsPanelService();
    protected abstract actionUnit: IActionUnit;

    protected tagService: TagsService = new TagsService();
    protected tags = this.tagService.getAllTags();

    protected suggestShared = new TagSuggestShared(this.tagService);
    private unsubscribers: Function[] = [];

    async componentDidMount() {
        this.unsubscribers.push(
            this.tagService.addTagSubscriber(this.onTagDBUpdate)
        );
    }

    componentWillUnmount() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    protected onTagDBUpdate = () => {
        this.tags = this.tagService.getAllTags();
    };

    protected handleAddClick = () => {
        if (this.groupType !== ModTagViewGroup.STV) throw new Error("Wrong group type, must be STV");
        this.detailsPanelService.isDirty = true;
        const paramsArray = this.state.paramsArray;
        const invalidSetValues = this.state.invalidTags;

        switch (this.actionUnit.type) {
            case ActionUnitType.SetTagValue: paramsArray.push(new SetTagValue()); break;
            case ActionUnitType.CheckTagValue: paramsArray.push(new CheckTagValue()); break;
            case ActionUnitType.UnitTest: paramsArray.push(new ModTagValue()); break;
            default: return;
        }

        invalidSetValues[paramsArray.length - 1] = true;
        this.setState({invalidTags: invalidSetValues});
    };

    protected handleAddTimedClick = () => {
        this.detailsPanelService.isDirty = true;
        const paramsArray = this.state.paramsArray;
        const invalidSetValues = this.state.invalidTags;

        paramsArray.push(new ModTagValueTimed());

        invalidSetValues[paramsArray.length - 1] = true;
        this.setState({paramsArray, invalidTags: invalidSetValues});
    };

    protected handleTagSelect = async (abTag: ITagUI, _index: number) => {
        const {paramsArray} = this.state;
        const tagToSet = paramsArray[_index];
        const invalidTags = this.state.invalidTags;
        invalidTags[_index] = false;

        if (abTag.id !== tagToSet.tagId) {
            this.detailsPanelService.isDirty = true;
            // setting basics on selected tag
            tagToSet.tagId = abTag.id;
            tagToSet.bitNo = -1;
            tagToSet.toValue = this._getCheckedEnteredValue(tagToSet.toValue, tagToSet.bitNo, abTag.id, abTag);

            if (tagToSet instanceof ModTagValueTimed || ("after_s" in tagToSet && "fromValue" in tagToSet)) {
                // the following is for STVT and STFVT groups only
                if ((this.groupType === ModTagViewGroup.STVT || this.groupType === ModTagViewGroup.STFTVT)) {
                    // @ts-ignore
                    tagToSet.after_s = 1;
                }
                if (this.groupType === ModTagViewGroup.STFTVT) {
                    // @ts-ignore
                    tagToSet.fromValue = this._getCheckedEnteredValue(tagToSet.fromValue, tagToSet.bitNo, abTag.id, abTag);
                }
            }

            // if tag is not in Database (create tag has been selected) then add it
            await this.tagService.addTagIfDoesNotExist(abTag);
        }
        this.suggestShared.setLastSelectedTag(abTag);
        this.setState({paramsArray, invalidTags})
    };

    protected handleBitSelect = (bitNoVal: string, _index: number) => {
        this.detailsPanelService.isDirty = true;
        const bitNo = parseInt(bitNoVal);

        const tagToSet = this.state.paramsArray[_index];
        tagToSet.bitNo = (Number.isInteger(bitNo)) ? bitNo : -1;

        this.handleToValueChange(tagToSet.toValue, _index);
        if (this.groupType === ModTagViewGroup.STFTVT && (tagToSet instanceof ModTagValueTimed || "fromValue" in tagToSet)) {
            this.handleFromValueChange(tagToSet.fromValue || 0, _index);
        }
    };

    protected handleFromValueChange = (value: number, _index: number) => {
        this.detailsPanelService.isDirty = true;
        const {paramsArray} = this.state;
        const tagToSet = (paramsArray[_index] as IModTagValue | ModTagValueTimed);

        const newValue = this._getCheckedEnteredValue(value, tagToSet.bitNo, tagToSet.tagId);

        // set the incoming value and if it is differ from newValue set it again to update the input
        tagToSet.fromValue = value;
        this.setState({paramsArray}, () => {
            if (newValue !== value) {
                tagToSet.fromValue = newValue;
                this.setState({paramsArray})
            }
        })
    }

    protected handleToValueChange = (value: number, _index: number) => {
        this.detailsPanelService.isDirty = true;
        const {paramsArray} = this.state;
        const tagToSet = paramsArray[_index];

        const newValue = this._getCheckedEnteredValue(value, tagToSet.bitNo, tagToSet.tagId);

        // set the incoming value and if it is differ from newValue set it again to update the input
        tagToSet.toValue = value;
        this.setState({paramsArray}, () => {
            if (newValue !== value) {
                tagToSet.toValue = newValue;
                this.setState({paramsArray})
            }
        })
    };

    protected handleAfterSecChange = (value: number, _index: number) => {
        this.detailsPanelService.isDirty = true;
        const {paramsArray} = this.state;
        const tagToSet = paramsArray[_index];
        if (!(tagToSet instanceof ModTagValueTimed || "after_s" in tagToSet))
            throw new Error("Calling handleAfterSecChange() from wrong group or on wrong actionUnit");

        const newValue = (value < 0) ? 0 : value;

        tagToSet.after_s = value;
        this.setState({paramsArray}, () => {
            if (newValue !== value) {
                tagToSet.after_s = newValue;
                this.setState({paramsArray})
            }
        })
    };

    protected handleDeleteClick = (_index: number) => {
        this.detailsPanelService.isDirty = true;
        const {paramsArray, invalidTags} = this.state;
        invalidTags.splice(_index, 1);
        paramsArray.splice(_index, 1);
        this.setState({paramsArray, invalidTags})
    };




    protected abstract _getTagsToSet(actionUnit: ISetValueAuType): ISetTagValue[] | IModTagValue[] | ModTagValueTimed[];

    protected _getCheckedEnteredValue(value: number, bitNo: number, tagId: string, abTag?: ITagUI): number {
        const tag = abTag || this.tagService.getTag(tagId);
        if (!tag) return value;

        return TagHelper.clampTagValue(tag.datatype, bitNo, value);
    }


    protected _onTagInputBlur = (value: string, _index: number, tagId: string) => {
        const tag = this.tagService.getTag(tagId);
        const invalidTags = this.state.invalidTags;
        invalidTags[_index] = (value !== tag?.tagname);
        this.setState({ invalidTags })
    };

    protected getInitInvalidTags = (tagArray: any[]) => {
        const invalidTags = [];

        for (let i = 0; i < tagArray.length; i++) {
            const tagToToggle = tagArray[i];
            invalidTags[i] = (tagToToggle && (!tagToToggle.tagId || !this.tagService.getTag(tagToToggle.tagId)));
        }

        return invalidTags;
    }
}



interface IActionUnitConfigState {
    showDesc: boolean,
    name: string,
    desc: string,
    enabled: boolean,
    criticality?: string,
}


export class ActionUnitGeneralConfig extends Component<{}, IActionUnitConfigState> {
    private detailsPanelService = new DetailsPanelService();
    private actionUnit = this.detailsPanelService.actionUnit;

    state = {
        showDesc: !!this.actionUnit.desc,
        name: this.actionUnit.name,
        desc: this.actionUnit.desc,
        enabled: this.actionUnit.enabled,
        criticality: this.actionUnit.criticality,
    }

    private onGenericConfigChange = (path: GenericConfigInput, strValue: string) => {
        const newState = this.state;
        switch (path) {
            case GenericConfigInput.Name:
                this.actionUnit.name = newState.name = strValue; break;
            case GenericConfigInput.Desc:
                this.actionUnit.desc = newState.desc = strValue; break;
            case GenericConfigInput.Enable:
                this.actionUnit.enabled = newState.enabled = !this.actionUnit.enabled; break;
            case GenericConfigInput.Criticality:
                this.actionUnit.criticality = newState.criticality = (strValue as AuCriticalityType); break;
            default: return;
        }
        this.detailsPanelService.isDirty = true;
        this.setState(newState);
    };

    private showDescriptionClick = () => {
        this.setState({showDesc: !this.state.showDesc})
    }

    public render() {
        const descButton = (
            <Button
                minimal={true}
                rightIcon={this.state.showDesc ? IconNames.CARET_UP : IconNames.CARET_DOWN}
                onClick={this.showDescriptionClick}
                text={this.state.showDesc ? "less" : "more"}
            />
        );

        return (
            <div className="plugins--au-config-container">
                <FormGroup
                    className="lp-panel-form-group"
                    inline={true}
                    label={"Name *"}
                >
                    <InputGroup
                        placeholder="It should..."
                        value={this.state.name}
                        rightElement={descButton}
                        onChange={
                            (e: ChangeEvent<HTMLInputElement>) =>
                                this.onGenericConfigChange(GenericConfigInput.Name, e.target.value)
                        }
                    />
                </FormGroup>
                <Collapse
                    isOpen={this.state.showDesc}
                    keepChildrenMounted={true}
                    transitionDuration={500}
                >
                    <FormGroup
                        className="lp-panel-form-group"
                        inline={true}
                        label={"Description"}
                    >
                        <TextArea
                            className={"description-details"}
                            placeholder="Add details here"
                            value={this.state.desc}
                            onChange={
                                (e: ChangeEvent<HTMLTextAreaElement>) =>
                                    this.onGenericConfigChange(GenericConfigInput.Desc, e.target.value)
                            }
                        />
                    </FormGroup>
                </Collapse>
                <FormGroup
                    className="lp-panel-form-group"
                    inline={true}
                    label={"Execution options"}
                >
                    <div className="exec-options-container">
                        <Switch
                            label={(this.state.enabled) ? "Enabled" : "Disabled"}
                            checked={this.state.enabled}
                            onChange={
                                () =>
                                    this.onGenericConfigChange(GenericConfigInput.Enable, "")
                            }
                        />
                        <span className="button-spacer"/>
                        <span style={{margin: "auto 0 10px"}}>and it's</span>
                        <span className="button-spacer"/>
                        <HTMLSelect
                            onChange={(e) => this.onGenericConfigChange(GenericConfigInput.Criticality, e.target.value)}
                            value={this.state.criticality || AuCriticalityType.NoneCritical}
                        >
                            {listAuCriticalityOptions().map(item => (
                                <option key={item.key} value={item.key}>
                                    {item.value}
                                </option>
                            ))}
                        </HTMLSelect>
                    </div>
                </FormGroup>
            </div>
        )
    }
}
