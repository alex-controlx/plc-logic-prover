import {pretests} from "../../__pretests__/_pretest.config";
import {ProjectDbService} from "../../services/storage/project_db.service";
import {DataType, TagHelper} from "./tag_helper.class";

pretests.init();
let tegHelper: TagHelper;

describe("Service Initialisation", () => {
    it("should initialise projectDb", async () => {
        await ProjectDbService.init();
        tegHelper = new TagHelper();

        for (const key in DataType) {
            if (DataType.hasOwnProperty(key)) {
                // @ts-ignore
                expect(key).toBe(DataType[key])
            }
        }
    });

    it(`should test static methods`, () => {
        [
            "bitArray"
        ].forEach(method => {
            // @ts-ignore
            expect(typeof TagHelper[method]).toBe("function");
        });
    });

    it(`should test class methods`, () => {
        [
            "isValidTag"
        ].forEach(method => {
            // @ts-ignore
            expect(typeof tegHelper[method]).toBe("function");
        });
    });
})
