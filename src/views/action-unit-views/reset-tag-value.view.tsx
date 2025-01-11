import React from "react";
import {PanelHeader} from "./_au-shared.view";
import {
    ActionUnitType,
    ParamsTimedProp
} from "../../_common/action-unit";
import {AuGenericView, AuGenericViewProps, AuGenericViewState} from "./_au-generic.view";
import {StvtInputGroup} from "./_au-stvt-group.view";


interface ResetValueAuState extends AuGenericViewState {
}

export default class ResetTagValueAuView extends AuGenericView<AuGenericViewProps, ResetValueAuState> {

    constructor(props: AuGenericViewProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.ResetTagValue)
            throw new Error("ResetTagValueAuView supports IResetValueAU only but got " + this.actionUnit.type);
    }

    public renderBody() {
        return (
            <div className="plugins--test-config">
                <PanelHeader title="Execution parameters"/>

                <StvtInputGroup title={"Toggle Tag Value(s)"} paramProp={ParamsTimedProp.tagsToToggle}/>
            </div>
        );
    }
}
