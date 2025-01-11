import {contextBridge, ipcRenderer, IpcRendererEvent, shell} from "electron";
import {IElectronApi, IpcPubTopic, IpcRemote, IpcRequest, IpcSubTopic} from "../src/_common/interfaces/ipc.interfaces";

const validIpcPubTopic = Object.values(IpcPubTopic);
const validIpcSubTopic = Object.values(IpcSubTopic);

const electronApi: IElectronApi = {
    sendIpcRequest,
    ipcSubscriber: (channel: IpcSubTopic, callback:(data: any) => any) => {
        if (!validIpcSubTopic.includes(channel)) return;
        ipcRenderer.on(channel, (event, data) => callback(data));
    },
    getAppVersion: async () => ipcRenderer.invoke(IpcRemote.appVersion),
    getClientId: async () => ipcRenderer.invoke(IpcRemote.getClientId),
    openExternal: async (link: string) => {
        await shell.openExternal(link);
    }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronApi", electronApi);



function sendIpcRequest<T>(channel: IpcPubTopic, data?: any): Promise<T> {
    if (!validIpcPubTopic.includes(channel)) {
        return new Promise((accept, reject) => reject("Invalid Publish Topic"));
    }

    const request: IpcRequest = {
        responseChannel: `${channel}_response_${new Date().getTime()}`,
        data: data
    };

    ipcRenderer.send(channel, request);
    // This method returns a promise which will be resolved when the response has arrived.
    return new Promise(resolve => {
        ipcRenderer?.once(request.responseChannel, (event: IpcRendererEvent , response) => resolve(response));
    });
}
