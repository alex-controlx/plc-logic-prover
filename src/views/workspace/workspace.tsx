import React, {PureComponent} from "react";
import "./workspace.scss";
import {DetailsPanel} from "../details-panel/details-panel";
import Logger from "../../_ui_common/logger.service";
import WorkspaceService from "../../services/workspace.service";
import Sidebar from "../sidebar/sidebar";

const logger = new Logger("Workspace");


interface WorkspaceState {
    hideSidebar: boolean,
}

class Workspace extends PureComponent<{}, WorkspaceState> {
    private unsubscribers: Function[] = [];
    private workspaceService = new WorkspaceService();

    state = {
        hideSidebar: false,
    };

    componentDidMount(): void {
        this.unsubscribers.push(
            this.workspaceService.hideSidebarSubscriber(this.onHideSidebar)
        );
        this.setState({hideSidebar: this.workspaceService.isHiddenSidebar})
    }
    componentWillUnmount(): void {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
    }

    private onHideSidebar = (value: boolean) => {
        this.setState({hideSidebar: value})
    };


    public render() {
        logger.log("render()");

        return (
            <div className="Workspace">
                { this.state.hideSidebar ?
                    null :
                    <Sidebar />
                }
                <DetailsPanel />
            </div>
        )
    }
}

export default Workspace;
