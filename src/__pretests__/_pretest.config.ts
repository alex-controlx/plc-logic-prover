import "fake-indexeddb/auto";

process.env.TESTING = "true";


let isInit = false;

export const pretests = {
    init: function() {
        if (isInit) return;
        isInit = true;
    }
}

// export const plcTagObj: {[key: string]: IPlcTag} = {
export const plcTagObj = {
    bool0: {
        id: "bool0", v:1, tagname: "BOOL_tagname", program: "", datatype: "BOOL", desc: "BOOL_tag", smpAddress: ""
    },
    sint0: {
        id: "sint0", v:11, tagname: "SINT_tagname", program: "", datatype: "SINT", desc: "SINT_tag", smpAddress: ""
    },
    int0: {
        id: "int0", v:-222, tagname: "INT_tagname", program: "", datatype: "INT", desc: "INT_tag", smpAddress: ""
    },
    dint0: {
        id: "dint0", v:3333, tagname: "DINT_tagname", program: "", datatype: "DINT", desc: "DINT_tag", smpAddress: ""
    }, // 110100000101 <- right is the first bit
    bool1: {
        id: "bool1", v:1, tagname: "BOOL_tagname", program: "prog1", datatype: "BOOL", desc: "BOOL_tag in prog1", smpAddress: ""
    },
    sint1: {
        id: "sint1", v:-11, tagname: "SINT_tagname", program: "prog1", datatype: "SINT", desc: "SINT_tag in prog1", smpAddress: ""
    },
    int1: {
        id: "int1", v:222, tagname: "INT_tagname", program: "prog1", datatype: "INT", desc: "INT_tag in prog1", smpAddress: ""
    },
    dint1: {
        id: "dint1", v:-3333, tagname: "DINT_tagname", program: "prog1", datatype: "DINT", desc: "DINT_tag in prog1", smpAddress: ""
    },
}
