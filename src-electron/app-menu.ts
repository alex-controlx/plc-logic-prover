import {Menu, shell, MenuItem, app} from "electron";
import {
    DEFAULT_APP_NAME,
    DEFAULT_APP_WIN_NAME,
    DEFAULT_BIT_SETTER_NAME,
    DEFAULT_RUNNER_WIN_NAME, DOCS_LINK
} from "../src/_common/defaults";
import {createAboutWindow, createAppWindow} from "./window.app";
import {createTestRunnerWindow} from "./window.runner";
import {DialogRequest, IpcSubTopic, IProjectExpImp} from "../src/_common/interfaces/ipc.interfaces";
import {createBitSetterWindow} from "./window.bit-setter";
import {isMac} from "./services/logger-ep.service";

export const version = app.getVersion();

export default class MenuBuilder {
    private template: MenuItem[] = [
        new MenuItem({
            role: 'fileMenu',
            submenu: [
                {
                    label: "New Action Set",
                    click: () => {
                        const win = createAppWindow();
                        win.webContents.send(IpcSubTopic.onCreateNewDialog, DialogRequest.NewActionSet);
                    }
                },
                {
                    label: "New Project",
                    click: () => {
                        const win = createAppWindow();
                        win.webContents.send(IpcSubTopic.onCreateNewDialog, DialogRequest.NewProject);
                    }
                },
                {type: "separator"},
                {
                    label: "Save (auto save enabled)",
                    enabled: false,
                },
                {type: "separator"},
                {
                    label: "Export Project",
                    click: () => {
                        const config: IProjectExpImp = {
                            type: "export"
                        };
                        const win = createAppWindow();
                        win.webContents.send(IpcSubTopic.onProjectImportExport, config);
                    },
                },
                {
                    label: "Import Project",
                    click: () => {
                        const config: IProjectExpImp = {
                            type: "import"
                        };
                        const win = createAppWindow();
                        win.webContents.send(IpcSubTopic.onProjectImportExport, config);
                    },
                },
                {type: "separator"},
                {
                    role: "quit",
                    label: "Quit program"
                }
            ]
        }),
        new MenuItem({
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { type: 'separator' },
                {
                    label: "Developer Tools",
                    submenu: [
                        {
                            label: "Toggle DevTools",
                            accelerator: isMac ? "Command+I" : "Ctrl+I",
                            role: "toggleDevTools"
                        },
                        {
                            role: "reload"
                        }
                    ]
                }
            ]
        }),
        new MenuItem({
            label: "Window",
            submenu: [
                {
                    label: DEFAULT_APP_WIN_NAME,
                    click: () => createAppWindow()
                },
                {
                    label: DEFAULT_RUNNER_WIN_NAME,
                    click: () => createTestRunnerWindow()
                },
            ]
        }),
        new MenuItem({
            label: "Tools",
            submenu: [
                {
                    label: DEFAULT_BIT_SETTER_NAME,
                    click: createBitSetterWindow
                },
            ]
        }),
        new MenuItem({
            role: "help",
            submenu: [
                {
                    label: "About",
                    click: createAboutWindow
                },
                {
                    label: "Documentation",
                    click: async () => {
                        await shell.openExternal(DOCS_LINK);
                    }
                },
            ]
        })
    ];

    constructor() {
        if (isMac) this.template.unshift(new MenuItem({
            label: DEFAULT_APP_NAME,
            submenu: [
                {
                    label: "About PLC Logic Prover",
                    click: createAboutWindow
                },
                {
                    role: "quit",
                    label: "Quit program"
                }
            ]
        }));

        const menu = Menu.buildFromTemplate(this.template);
        Menu.setApplicationMenu(menu);
    }
}


// private template: MenuItem[] = [
// // { role: 'appMenu' }
// ...(isMac ? [{
//   label: 'PLC Logic Tester',
//   submenu: [
//     // { role: 'about' },
//     // { type: 'separator' },
//     // { role: 'services' },
//     // { type: 'separator' },
//     // { role: 'hide' },
//     // { role: 'hideothers' },
//     // { role: 'unhide' },
//     // { type: 'separator' },
//     { role: 'quit' }
//   ]
// }] : []),
// new MenuItem({ role: 'fileMenu' }),

// { role: 'editMenu' }
// {
//   label: 'Edit',
//   submenu: [
//     { role: 'undo' },
//     { role: 'redo' },
//     { type: 'separator' },
//     { role: 'cut' },
//     { role: 'copy' },
//     { role: 'paste' },
//     ...(isMac ? [
//       { role: 'pasteAndMatchStyle' },
//       { role: 'delete' },
//       { role: 'selectAll' },
//       { type: 'separator' },
//       {
//         label: 'Speech',
//         submenu: [
//           { role: 'startspeaking' },
//           { role: 'stopspeaking' }
//         ]
//       }
//     ] : [
//       { role: 'delete' },
//       { type: 'separator' },
//       { role: 'selectAll' }
//     ])
//   ]
// },
// { role: 'viewMenu' }
// {
//   label: 'View',
//   submenu: [
//     // { role: 'reload' },
//     // { role: 'forcereload' },
//     { role: 'toggledevtools' },
//     // { type: 'separator' },
//     // { role: 'resetzoom' },
//     // { role: 'zoomin' },
//     // { role: 'zoomout' },
//     { type: 'separator' },
//     { role: 'togglefullscreen' }
//   ]
// },
// { role: 'windowMenu' }
// {
//   label: 'Window',
//   submenu: [
//     { role: 'minimize' },
//     { role: 'zoom' },
//     ...(isMac ? [
//       { type: 'separator' },
//       { role: 'front' },
//       { type: 'separator' },
//       { role: 'window' }
//     ] : [
//       { role: 'close' }
//     ])
//   ]
// }
