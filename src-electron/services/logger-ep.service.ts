export const isMac = process.platform === "darwin";
export const isDev = process.env.NODE_ENV === "development";

let notificationCallback: (message: string) => void;

const modulesToDebug: string[] = process.env.DEBUG ? process.env.DEBUG.replace(/\s/g, "").split(",") : [];
let lastLoggedAt: number = Date.now();

export default class LoggerMP {
    private readonly tag: string;
    private readonly debug: boolean;

    static registerCallback(callback: (message: string) => void) {
        notificationCallback = callback
    }

    constructor(className: string, debug?: boolean) {
        this.tag = className;
        this.debug = debug ? debug : modulesToDebug.includes(className);
    }

    public log(...args: any) {
        if (isDev && this.debug) {
            const diff = Date.now() - lastLoggedAt;
            console.log(this.tag + " >> ", ...args, "["+diff+"ms]");
            lastLoggedAt = Date.now();
        }
    }

    public error(error: Error | string) {
        const message = (error instanceof Error) ? error.message : error;
        console.error(this.tag + " >> ", error);
        if (typeof notificationCallback === "function") {
            notificationCallback(message)
        }
    }
}

export const ERRORS_EP = {
    ut001: "Tag not found in the map of tags."
};
