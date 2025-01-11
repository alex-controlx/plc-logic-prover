import React from "react";
import {PanelHeader} from "./_au-shared.view";
import {ActionUnitType} from "../../_common/action-unit";
import {AuGenericView, AuGenericViewProps, AuGenericViewState} from "./_au-generic.view";
import {StvInputGroup} from "./_au-stv-group.view";

interface SetValueAuProps extends AuGenericViewProps {}

interface SetValueAuState extends AuGenericViewState {

}

export default class CheckTagValueAuView extends AuGenericView<SetValueAuProps, SetValueAuState> {

    constructor(props: SetValueAuProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.CheckTagValue)
            throw new Error("CheckTagValueAuView supports ICheckValuesAU only but got " + this.actionUnit.type);
    }

    public renderBody() {
        return (
            <div className="plugins--test-config">
                <PanelHeader title="Execution parameters"/>

                <StvInputGroup title={"Tags to check"} />
            </div>
        )
    }
}
