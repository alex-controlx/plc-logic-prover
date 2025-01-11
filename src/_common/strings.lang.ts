
interface IInvalidMessageStrings {
    SetTagValue: {
        noTagsIn_tagsToSet: string,
        noSelTagIn_tagsToSet:  string,
        tagWasDeleted: string,
    },
    RunnerLog: {
        no_logMessage: string
    }
}


const TAG_WAS_DELETED = "Tag was deleted";

const invalidMessages_en: IInvalidMessageStrings = {
    SetTagValue: {
        noTagsIn_tagsToSet: "There are no tags to set",
        noSelTagIn_tagsToSet:  "A tag was not selected",
        tagWasDeleted: TAG_WAS_DELETED,
    },
    RunnerLog: {
        no_logMessage: "Log message is empty."
    }
}

export const INVALID_MESSAGE: IInvalidMessageStrings = invalidMessages_en;
