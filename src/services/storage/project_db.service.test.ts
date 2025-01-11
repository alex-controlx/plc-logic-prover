import {pretests} from "../../__pretests__/_pretest.config";
import {ProjectDbService} from "./project_db.service";
import {PlcType, Project} from "../../_common/interfaces";
import {LpUtils} from "../../_common/utils";


pretests.init();
let projectDb: ProjectDbService;
let projectId = "";

describe("Service Initialisation", () => {
    it("should fail on usage of ProjectDbService before calling init", () => {
        try {
            new ProjectDbService()
        } catch (e) {
            const message = (e instanceof Error) ? e.message :
                (typeof e === "string") ? e : JSON.stringify(e);

            expect(message).toBe("ProjectDbService wasn't initialised yet. Call ProjectDbService.init() first.");
        }
    })

    it("should initialise projectDb", async () => {
        await ProjectDbService.init();
        projectDb = new ProjectDbService();

        [
            "getProject", "getProjectFromDB", "count", "setProject", "removeActionSets",
            "clearDb"
        ].forEach(method => {
            // @ts-ignore
            expect(typeof projectDb[method]).toBe("function");
        });

        [
            "getProjectPlcType"
        ].forEach(method => {
            // @ts-ignore
            expect(typeof ProjectDbService[method]).toBe("function");
        });
    })
});


describe("General tests on projectDb methods", () => {

    it(`should test "getProject()"`, async () => {
        const project = projectDb.getProject();
        projectId = project.id;
        checkProjectProperties(project);
    });

    it(`should test "getProjectFromDB()"`, async () => {
        const noProject = await projectDb.getProjectFromDB("_fake_id_");
        expect(noProject).toBe(null);

        const project = await projectDb.getProjectFromDB();
        if (!project) return expect(project).toBeTruthy();
        expect(project.id).toBe(projectId);
        checkProjectProperties(project);
    });

    it(`should test "getProjectPlcType()"`, async () => {
        const plcType = ProjectDbService.getProjectPlcType();
        expect(plcType).toBe(PlcType.AB_CL);
    });

    it(`should test "count()"`, async () => {
        const count = await projectDb.count();
        expect(count).toBe(1);
    });

    it(`should test "setProject()"`, async () => {
        const project = await projectDb.getProjectFromDB();
        if (!project) return expect(project).toBeTruthy();

        project.name = "_newName_";
        await projectDb.setProject(project);

        const updatedProject = await projectDb.getProjectFromDB();
        if (!updatedProject) return expect(updatedProject).toBeTruthy();

        expect(updatedProject.name).toBe("_newName_");

    });

    it(`should test "removeActionSets()"`, async () => {
        const project = await projectDb.getProjectFromDB();
        if (!project) return expect(project).toBeTruthy();

        expect(project.actionSetIds.length).toBe(0);

        const [asId1, asId2, asId3] = [LpUtils.generateId(), LpUtils.generateId(), LpUtils.generateId()];
        project.actionSetIds.push(asId1, asId2, asId3);
        await projectDb.setProject(project);

        const updatedProject = await projectDb.getProjectFromDB();
        if (!updatedProject) return expect(updatedProject).toBeTruthy();

        expect(updatedProject.actionSetIds.length).toBe(3);

        await projectDb.removeActionSets([asId1, asId2]);

        const updatedProject1 = await projectDb.getProjectFromDB();
        if (!updatedProject1) return expect(updatedProject1).toBeTruthy();

        expect(updatedProject1.actionSetIds.length).toBe(1);
        expect(updatedProject1.actionSetIds[0]).toBe(asId3);
    });

    it(`should test "clearDb()"`, async () => {
        const project = await projectDb.getProjectFromDB();
        if (!project) return expect(project).toBeTruthy();

        await projectDb.clearDb();

        const updatedProject = await projectDb.getProjectFromDB();
        expect(updatedProject).toBe(null);
    });

});


function checkProjectProperties(project: Project) {

    expect(typeof project.version).toBe("string");
    expect(project.version).not.toBe("0.0.0");
    expect(typeof project.id).toBe("string");
    expect(typeof project.name).toBe("string");
    expect(typeof project.modifiedOn).toBe("number");
    expect(Array.isArray(project.actionSetIds)).toBe(true);
    expect(typeof project.config).toBe("object");
    expect(typeof project.plcConfig).toBe("object");

    const {config, plcConfig} = project;
    expect(typeof config.unitTestTolerance).toBe("number");
    expect(typeof plcConfig.type).toBe("string");
    expect(typeof plcConfig.ipAddress).toBe("string");
    expect(typeof plcConfig.cpuSlot).toBe("number");


    expect(project.modifiedOn).toBeGreaterThan(0);
    
}
