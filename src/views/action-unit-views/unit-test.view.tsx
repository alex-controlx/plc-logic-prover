import React from "react";
import "./plugins.scss";
import {PanelHeader} from "./_au-shared.view";
import {ActionUnitType, ParamsTimedProp} from "../../_common/action-unit";
import {StvInputGroup} from "./_au-stv-group.view";
import {StvtInputGroup} from "./_au-stvt-group.view";
import {AuGenericView, AuGenericViewProps, AuGenericViewState} from "./_au-generic.view";
import {TagListInputGroup} from "./_au-tag_list-group.view";
// import Logger from "../../_ui_common/logger.service";

// const logger = new Logger("UnitTestPlugin");


interface UnitTestPluginState extends AuGenericViewState {

}

export default class UnitTestAuView extends AuGenericView<AuGenericViewProps, UnitTestPluginState> {

    constructor(props: AuGenericViewProps) {
        super(props);

        if (this.actionUnit.type !== ActionUnitType.UnitTest)
            throw new Error("UnitTestAuView supports IUnitTestAU only but got " + this.actionUnit.type);

    }

    protected renderBody() {
        return (
            <div>
                <div className="plugins--test-config">
                    <PanelHeader title="Execution parameters"/>

                    <StvInputGroup title={"Define input actions"} />

                    <StvtInputGroup title={"Expected output change"} paramProp={ParamsTimedProp.expectedChanges} />

                    <TagListInputGroup title={"Monitor for no change"} />
                </div>

                <div className="plugins--post-test-config">
                    <PanelHeader title="Post execution parameters"/>

                    <StvtInputGroup title={"Toggle Reset(s)"} paramProp={ParamsTimedProp.tagsToToggle} />

                </div>
            </div>
        )
    }
}
