import Logger from "../_ui_common/logger.service";
import PubSub_LP, {EventTopic} from "./_pubsub.aclass";

const logger = new Logger("SpinnerService");

export default class SpinnerService extends PubSub_LP {
    constructor() {
        super();
        logger.log("constructor()");
    }

    public displaySpinner(value: boolean) {
        this.dispatchEvent(EventTopic.DisplaySpinner, value);
    }

    public displaySpinnerSubscriber(callback: (value: boolean) => void) {
        return this.subscribeOnChange(EventTopic.DisplaySpinner, callback)
    }

}
