import {Intent, IToastProps} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";
import PubSub_LP, {EventTopic} from "./_pubsub.aclass";
import {IconName} from "@blueprintjs/core/lib/esm/components/icon/icon";
import {DEFAULT_SUCCESS_TOAST_TIMEOUT, DEFAULT_TOAST_TIMEOUT, DEFAULT_WARNING_TOAST_TIMEOUT} from "../_common/defaults";


export class AppToasterService extends PubSub_LP {
    public showToast(toast: IToastProps) {
        this.dispatchEvent(EventTopic.ShowToast, toast);
    }
    public subscribeOnShowToast(callback: (toast: IToastProps) => void) {
        return this.subscribeOnChange(EventTopic.ShowToast, callback)
    }


    static defaultToast(message: string, icon?: IconName): IToastProps {
        return {
            message: message,
            icon: icon ? icon : IconNames.SAVED,
            timeout: DEFAULT_TOAST_TIMEOUT,
        }
    }

    static defaultSuccessToast(message: string, icon?: IconName): IToastProps {
        return {
            message: message,
            intent: Intent.SUCCESS,
            icon: icon ? icon : IconNames.SAVED,
            timeout: DEFAULT_SUCCESS_TOAST_TIMEOUT,
        }
    }

    static defaultWarningToast(message: string): IToastProps {
        return {
            message: message,
            intent: Intent.WARNING,
            icon: IconNames.WARNING_SIGN,
            timeout: DEFAULT_WARNING_TOAST_TIMEOUT,
        }
    }

    static defaultDangerToast(message: string): IToastProps {
        return {
            message: message,
            intent: Intent.DANGER,
            icon: IconNames.WARNING_SIGN,
            timeout: DEFAULT_WARNING_TOAST_TIMEOUT,
        }
    }
}
