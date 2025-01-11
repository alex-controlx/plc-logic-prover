import React from "react";
import { createRoot } from 'react-dom/client';
import "./index.scss";
import * as serviceWorker from "./serviceWorker";
import {AppStateService} from "./services/app-state.service";
import StorageService from "./services/storage/storage.service";
import Logger from "./_ui_common/logger.service";
import {HashRouter, Route, Routes} from "react-router-dom";
import TestRunnerView from "./views/test-runner/test-runner-view";
import App from "./views/App";
import BitSetterView from "./views/_tools/bit-setter-view";


appInit().then(() => {
    const container = document.getElementById('root');
    const root = createRoot(container!); // createRoot(container!) if you use TypeScript
    root.render(
        <HashRouter>
            <Routes>
                <Route path="/test-runner" element={<TestRunnerView />} />
                <Route path="/bit-setter" element={<BitSetterView />} />
                <Route path="*" element={<App />} />
            </Routes>
        </HashRouter>
    );

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: https://bit.ly/CRA-PWA
    serviceWorker.unregister();

}).catch(e => console.error(e));

async function appInit() {
    await Logger.init();
    await AppStateService.init();
    await StorageService.init();
}
