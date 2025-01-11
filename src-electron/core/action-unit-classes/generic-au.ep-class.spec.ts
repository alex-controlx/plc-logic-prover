import {ControlledSleep} from "./generic-au.ep-class";
import {expect, assert} from "chai";

describe("Tests on ControlledSleep", () => {

    const controlledSleep = new ControlledSleep();

    it("should sleep for 1 second", async () => {
        const startedAt = Date.now();

        await controlledSleep.for(1000);

        const diff = Date.now() - startedAt;
        expect(diff).to.be.gte(1000).lte(1010);
    })

    it("should cancel sleep after 1 second", async () => {
        const timerId = "timerId";
        const timeout = 1000;

        setTimeout(() => controlledSleep.cancel(timerId), timeout);

        const startedAt = Date.now();
        await controlledSleep.for(3000, timerId);

        const diff = Date.now() - startedAt;
        expect(diff).to.be.gte(timeout - 10).lte(timeout + 10);
    })

    it("should cancel sleep after .5 second", async () => {
        const timerId = "timerId";
        const timer_ms = 500;

        setTimeout(() => controlledSleep.cancelAll(), timer_ms);

        const startedAt = Date.now();
        await controlledSleep.for(3000, timerId);

        const diff = Date.now() - startedAt;
        assert.isAtLeast(diff, timer_ms);
        assert.isAtMost(diff, timer_ms + 10);
    })

})
