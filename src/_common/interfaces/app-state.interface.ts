import {TAGS_COLUMNS_WIDTHS} from "../defaults";
const {tagname, program, datatype, desc, usage, mbAddress} = TAGS_COLUMNS_WIDTHS;

export enum DpDisplayedType {
    StartPage,
    TagsPage,
    ActionUnit,
}

export interface ISidebarState {
    expandedSets: string[],
}

export interface IDetailsPanelState {
    isDirty: boolean;
    displayed: DpDisplayedType,
    actionUnitId: string,
    isResultShown: boolean;
}

export interface ITagPageState {
    selectedTagId: string,
    columnWidths: (number | undefined | null)[],
    columnWidthsSmp: (number | undefined | null)[],
}

export interface IWorkspaceState {
    isHiddenSidebar: boolean
}

export interface IAppState {
    modifiedOn: number,
    workspace: IWorkspaceState,
    detailsPanel: IDetailsPanelState,
    sidebar: ISidebarState,
    tagPage: ITagPageState,
}

export function defaultAppState(): IAppState {
    return {
        // do not modify, it is a test property for the default AppState
        modifiedOn: 0,
        workspace: {
            isHiddenSidebar: false,
        },
        detailsPanel: {
            displayed: DpDisplayedType.StartPage,
            actionUnitId: "",
            isDirty: false,
            isResultShown: true,
        },
        sidebar: {
            expandedSets: [],
        },
        tagPage: {
            selectedTagId: "",
            columnWidths: [tagname, program, datatype, desc, usage],
            columnWidthsSmp: [mbAddress, datatype, desc, usage],
        },
    }
}
