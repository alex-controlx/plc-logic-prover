import React, {ChangeEvent, Component} from "react";
import "./bit-setter-view.scss";
import {Checkbox, ControlGroup, HTMLSelect, NumericInput} from "@blueprintjs/core";
import {LpUtils} from "../../_common/utils";
import {DEFAULT_BIT_SETTER_NAME} from "../../_common/defaults";

interface BitSetterViewProps {}

type SelectableDataTypes = "SINT" | "INT" | "DINT";

interface BitSetterViewState {
    decimal: number,
    bits: (boolean | undefined)[],
    datatype: SelectableDataTypes,
    bitsQty: number,
}

export default class BitSetterView extends Component<BitSetterViewProps, BitSetterViewState> {
    private dataTypes: string[] = ["SINT", "INT", "DINT"];
    private groupOne: number[] = [0, 1];
    private groupTwo: number[] = [];

    constructor(props: BitSetterViewProps) {
        super(props);
        document.title = DEFAULT_BIT_SETTER_NAME;

        this.state = {
            decimal: 0,
            bits: [],
            datatype: "SINT",
            bitsQty: 8,
        }
    }

    private handleValueChange = (numericValue: number) => {
        if (numericValue == null || isNaN(numericValue)) return;

        const {bits} = this.state;
        const clampedValue = this._clampValue(numericValue);
        const clampedValueStr = this._toUnsignedInt(clampedValue).toString(2);
        for (let i = 0; i < this.state.bitsQty; i++) {
            bits[i] = clampedValueStr[clampedValueStr.length - 1 - i] === "1";
        }

        this.setState({
            bits,
            decimal: numericValue
        }, () => {
            if (this.state.decimal !== clampedValue)
                this.setState({ decimal: clampedValue })
        })
    }

    private handleBitChange = (index: number, value: boolean) => {
        const bits = this.state.bits;
        bits.length = this.state.bitsQty;
        bits[index] = value;
        let bitString = "";
        for (let i = this.state.bitsQty; i >= 0 ; i--) {
            bitString += bits[i] ? "1" : "0";
        }
        this.setState({
            decimal: this._toSignedInt(parseInt(bitString, 2))
        })
    }

    private handleDatatypeSelect = (event: ChangeEvent<HTMLSelectElement>) => {
        const datatype = (event.target.value as SelectableDataTypes);
        if (datatype === "SINT") {
            this.groupOne = [0, 1];
            this.groupTwo = [];
        } else if (datatype === "INT") {
            this.groupOne = [0, 1, 2, 3];
            this.groupTwo = [];
        } else if (datatype === "DINT") {
            this.groupOne = [0, 1, 2, 3];
            this.groupTwo = [4, 5, 6, 7];
        }
        const bitsQty = this.groupOne.length * 4 + this.groupTwo.length * 4;

        this.setState({datatype, bitsQty}, () => {
            this.handleValueChange(this.state.decimal);
        });
    }

    private _clampValue(value: number): number {
        const {datatype} = this.state;
        switch (datatype) {
            case "SINT": return LpUtils.clamp(value, -128, 127);
            case "INT": return LpUtils.clamp(value, -32768, 32767);
            case "DINT": return LpUtils.clamp(value, -2147483648, 2147483647);
            default: return value;
        }
    }

    private _toSignedInt(integer: number) {
        const {datatype} = this.state;
        // SINT 8bit    −128 to 127 => 255
        // INT 16bit    −32768 to 32767 => 65535
        // DINT 32bit   −2147483648 to 2147483647 => 4294967295
        // LINT 64bit   −9223372036854775808 to 9223372036854775807 => 18446744073709551615
        if (datatype === "SINT" && integer <= 255 && integer > 127) return integer - 255 - 1;
        if (datatype === "INT" && integer <= 65535 && integer > 32767) return integer - 65535 - 1;
        if (datatype === "DINT" && integer <= 4294967295 && integer > 2147483647) return integer - 4294967295 - 1;
        return integer
    }

    private _toUnsignedInt(integer: number) {
        const {datatype} = this.state;
        if (datatype === "SINT" && integer >= -128 && integer < 0) return integer + 255 + 1;
        if (datatype === "INT" && integer >= -32768 && integer < 0) return integer + 65535 + 1;
        if (datatype === "DINT" && integer >= -2147483648 && integer < 0) return integer + 4294967295 + 1;
        return integer
    }


    render() {
        const {bits, decimal} = this.state;
        return (
            <div className="bit-setter-container">
                <p>This is a helper to set a multiple bits with one number or vise verse.</p>
                <p><strong>DECIMAL VALUE</strong></p>
                <div className="decimal-groups">
                    <ControlGroup>
                        <HTMLSelect onChange={this.handleDatatypeSelect}>
                            {this.dataTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </HTMLSelect>
                        <NumericInput value={decimal} onValueChange={this.handleValueChange}/>
                    </ControlGroup>
                </div>
                <p><strong>BITS</strong></p>
                <div className="bit-groups">
                    {this.groupOne.map(item => {
                        return BitGroup(item, bits, this.handleBitChange)
                    })}
                </div>
                <div className="bit-groups">
                    {this.groupTwo.map(item => {
                        return BitGroup(item, bits, this.handleBitChange)
                    })}
                </div>
            </div>
        )
    }
}

function BitGroup(index: number, bits: (boolean | undefined)[], onChange: (index: number, isChecked: boolean) => void) {

    const handleChecked = (event: ChangeEvent<HTMLInputElement>, index: number) => {
        onChange(index, event.target.checked);
    }

    return (
        <div key={index} className="bit-group-outer">
            {[0, 1, 2, 3].map(item => {
                const bitNumber = index * 4 + item;
                return (
                    <div key={bitNumber} className="bit-group-inner">
                        <span>{bitNumber}</span>
                        <Checkbox
                            checked={bits[bitNumber] === true}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => handleChecked(event, bitNumber)}
                        />
                    </div>
                )
            })}
        </div>
    )
}
