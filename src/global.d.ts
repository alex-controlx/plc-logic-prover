declare global {
    import {IElectronApi} from "./_common/interfaces/ipc.interfaces";

    export interface Window { electronApi?: IElectronApi }
}

export {}
