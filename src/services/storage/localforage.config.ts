import localForage from "localforage";
const LocalDb = localForage;

LocalDb.config({driver: localForage.INDEXEDDB});

enum StorageKey {
    app = "lp-app",
    appConfig = "app-config",
    project = "project",
    actionSets = "action-sets",
    actionUnits = "action-units",
    tags = "ab-tags",
    results = "action-unit-results",
    invalidUnits = "invalid-units",
}

export const appConfigLocalForage = LocalDb.createInstance({name: StorageKey.appConfig});

export const projectLocalForage = LocalDb.createInstance({name: StorageKey.project});

export const actionSetsLocalForage = LocalDb.createInstance({name: StorageKey.actionSets});

export const actionUnitsLocalForage = LocalDb.createInstance({name: StorageKey.actionUnits});

export const tagsLocalForage = LocalDb.createInstance({name: StorageKey.tags});

export const resultsLocalForage = LocalDb.createInstance({name: StorageKey.results});

export const invalidUnitsLocalForage = LocalDb.createInstance({name: StorageKey.invalidUnits});
