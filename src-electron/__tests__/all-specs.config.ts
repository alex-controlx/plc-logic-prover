export const specsConfig = {
    _selfInit: function(){
        process.env.NODE_ENV = "development";
        process.env.DEBUG = "SimulatedPLC, GenericUnitRunner, HeartBeatRunner, ResetTagValuesRunner, " +
            "UnitTestRunner, CheckTagValuesRunner, SetTagValuesRunner, SleepRunner";
    }(),

    // this is the main config for specs / tests
    init: () => {}
}
