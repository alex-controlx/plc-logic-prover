import React, {Component} from "react";
import "./start-page.scss";
import {H2} from "@blueprintjs/core";


interface StartPageProps {
    // actionSets: Map<string, IActionSet>,
}

interface StartPageState {

}

export default class StartPage extends Component<StartPageProps, StartPageState> {

    public render() {
        return (
            <div className="start-page-container">
                <H2>Start page</H2>
                <div>
                    <p>This software designed for testing PLC logic.</p>
                    <p>
                        To get started, add Test Units, called Actions, from menu under "New" button.
                    </p>
                </div>
            </div>
        )
    }
}
