export enum ConsoleColors {
    Green = "Green",
    DodgerBlue = "DodgerBlue",
    Red = "Red",
    Orange = "Orange",
}

export class LpUtils {
    static isIpAddress(string: string): boolean {
        return (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(string));
    }

    static generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36);
    }

    /**
     * Invokes the callback `n` times, collecting the results in an array, which
     * is the return value. Similar to _.times
     */
    static times<T>(n: number, callback: (i: number) => T): T[] {
        if (n < 0) {
            throw new Error("times() cannot be called with negative numbers.");
        }
        const result: T[] = Array(n);
        for (let index = 0; index < n; index++) {
            result[index] = callback(index);
        }
        return result;
    }

    /**
     * Given a number, returns a value that is clamped within a
     * minimum/maximum bounded range. The minimum and maximum are optional. If
     * either is missing, that extrema limit is not applied.
     *
     * Assumes max >= min.
     */
    static clamp(value: number, min?: number, max?: number): number {
        if (min != null && value < min) {
            value = min;
        }
        if (max != null && value > max) {
            value = max;
        }
        return value;
    }

    static async sleep(ms: number) {
        return new Promise<void>((accept) => {
            setTimeout(() => {
                accept();
            }, ms);
        });
    }

    static async waitFor(condition: () => boolean, timeout = 10000) {
        return new Promise<void>((accept, reject) => {
            const startedAt = Date.now();
            const intervalId = setInterval(() => {
                if (condition()) {
                    clearInterval(intervalId);
                    accept();
                }

                if (Date.now() - startedAt > timeout) {
                    clearInterval(intervalId);
                    reject("waitFor timed out after " + timeout + "ms");
                }
            }, 25);
        });
    }

    static async delayedAsyncFunction(callback: () => void, ms: number) {
        return new Promise<void>((accept) => {
            setTimeout(() => {
                callback();
                accept();
            }, ms);
        });
    }

    static compareValues(key: string, isDesc?: boolean) {
        return function innerSort(a: { [key: string]: any }, b: { [key: string]: any }) {
            if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
                // property doesn't exist on either object
                return 0;
            }

            const varA = (typeof a[key] === "string") ? a[key].toUpperCase() : a[key];
            const varB = (typeof b[key] === "string") ? b[key].toUpperCase() : b[key];

            let comparison = 0;
            if (varA > varB) comparison = 1;
            else if (varA < varB) comparison = -1;

            return (isDesc) ? (comparison * -1) : comparison;
        };
    }

    static colorLog(message: string, color: ConsoleColors) {
        console.log("%c" + message, "color:" + color);
    }

    static listenForEnter(element: HTMLElement, callback: Function) {
        if (typeof callback === "function") {
            element.addEventListener("keydown", (event: KeyboardEvent) => {
                if (((event.key === "Enter" && event.ctrlKey) || (event.key === "Enter" && event.metaKey))) {
                    callback();
                }
            });
        }
    }

    static isValidAuName(name: string): boolean {
        return (!!name && name.trim().length > 0);
    }

    static isValidConsoleLogMessage(name: string): boolean {
        return (!!name && name.trim().length > 0);
    }


    static testBit(integer: number, bitPosition: number): number {
        return ((integer >> bitPosition) % 2 !== 0) ? 1 : 0;
    }

    static setBit(integer: number, bitPosition: number): number {
        return integer | (1 << bitPosition);
    }

    static clearBit(integer: number, bitPosition: number): number {
        return integer & ~(1 << bitPosition);
    }

    static toggleBit(integer: number, bitPosition: number): number {
        return LpUtils.testBit(integer, bitPosition) ?
            LpUtils.clearBit(integer, bitPosition) :
            LpUtils.setBit(integer, bitPosition);
    }

    static toSignedInt(integer: number, bitQty: 8 | 16 | 32): number {
        // SINT 8bit    −128 to 127 => 255
        // INT 16bit    −32768 to 32767 => 65535
        // DINT 32bit   −2147483648 to 2147483647 => 4294967295
        // LINT 64bit   −9223372036854775808 to 9223372036854775807 => 18446744073709551615
        if (bitQty === 8 && integer <= 255 && integer > 127) return integer - 255 - 1;
        if (bitQty === 16 && integer <= 65535 && integer > 32767) return integer - 65535 - 1;
        if (bitQty === 32 && integer <= 4294967295 && integer > 2147483647) return integer - 4294967295 - 1;
        return integer
    }

    static toUnsignedInt(integer: number, bitQty: 8 | 16 | 32): number {
        if (bitQty === 8 && integer >= -128 && integer < 0) return integer + 255 + 1;
        if (bitQty === 16 && integer >= -32768 && integer < 0) return integer + 65535 + 1;
        if (bitQty === 32 && integer >= -2147483648 && integer < 0) return integer + 4294967295 + 1;
        return integer
    }

    // creates a bit mask: eg. (8, [1,7]) return 130 = "10000010"
    static bitMask(maskLength: number, bitPositions: number[]): number{
        let newMask = 0;
        for (let i = 0; i < maskLength; i++) {
            // set a bit in newMask if bit is in the requested bitPosition array
            if (bitPositions.indexOf(i) > -1 ) newMask |= 1 << i
        }
        return newMask
    }
}
