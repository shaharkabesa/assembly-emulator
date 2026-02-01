import { OPCODES } from './assembler';

export interface Registers {
    AX: number;
    BX: number;
    CX: number;
    DX: number;
    SP: number;
    BP: number;
    SI: number;
    DI: number;
    CS: number;
    DS: number;
    ES: number;
    SS: number;
    IP: number;
}

export interface Flags {
    CF: boolean; // Carry
    PF: boolean; // Parity
    AF: boolean; // Auxiliary
    ZF: boolean; // Zero
    SF: boolean; // Sign
    TF: boolean; // Trap
    IF: boolean; // Interrupt Enable
    DF: boolean; // Direction
    OF: boolean; // Overflow
}

export interface CPUState {
    memory: Uint8Array;
    registers: Registers;
    flags: Flags;
    // Metadata for the UI (not strict CPU state but useful)
    status: 'idle' | 'running' | 'paused' | 'error';
    error: string | null;
    logs: string[];
}

export const MEMORY_SIZE = 65536; // 64KB

export const INITIAL_REGISTERS: Registers = {
    AX: 0, BX: 0, CX: 0, DX: 0,
    SP: 0xFFFE, BP: 0, SI: 0, DI: 0,
    CS: 0, DS: 0, ES: 0, SS: 0,
    IP: 0x100
};

export const INITIAL_FLAGS: Flags = {
    CF: false, PF: false, AF: false, ZF: false, SF: false,
    TF: false, IF: false, DF: false, OF: false
};

export const createInitialState = (): CPUState => {
    return {
        memory: new Uint8Array(MEMORY_SIZE),
        registers: { ...INITIAL_REGISTERS },
        flags: { ...INITIAL_FLAGS },
        status: 'idle',
        error: null,
        logs: []
    };
};

// -- Re-export Execution Logic (Included here to avoid circular dep if I split files incorrectly, 
// but I put executeInstruction in cpu.ts before. I will include it here again to keep file valid)

// Helpers to access Assembler constants if I can import them.
// Circular dependency? cpu.ts -> assembler.ts -> cpu.ts.
// cpu.ts imports OPCODES from assembler.ts. 
// assembler.ts imports CPUState from cpu.ts.
// This is fine as long as types are used.
// But `executeInstruction` USES `OPCODES`.
// So cpu.ts imports from assembler.ts.
// assembler.ts imports TYPES from cpu.ts.

// Helpers for register access
const getRegisterRef = (id: number): { key: keyof Registers, high?: boolean, is8Bit: boolean } => {
    if (id >= 8) {
        const keys: (keyof Registers)[] = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'];
        return { key: keys[id - 8], is8Bit: false };
    } else {
        // 0,1,2,3 -> AL, CL, DL, BL
        // 4,5,6,7 -> AH, CH, DH, BH
        const base = id % 4;
        const isHigh = id >= 4;
        const keys: (keyof Registers)[] = ['AX', 'CX', 'DX', 'BX'];
        return { key: keys[base], high: isHigh, is8Bit: true };
    }
};

const getReg = (regs: Registers, id: number): number => {
    const ref = getRegisterRef(id);
    const val = regs[ref.key];
    if (ref.is8Bit) {
        return ref.high ? (val >> 8) & 0xFF : val & 0xFF;
    }
    return val;
};

const setReg = (regs: Registers, id: number, val: number) => {
    const ref = getRegisterRef(id);
    if (ref.is8Bit) {
        const current = regs[ref.key];
        const mask = ref.high ? 0x00FF : 0xFF00;
        const shift = ref.high ? 8 : 0;
        const newVal = (current & mask) | ((val & 0xFF) << shift);
        regs[ref.key] = newVal;
    } else {
        regs[ref.key] = val & 0xFFFF;
    }
};

const updateFlags = (flags: Flags, result: number, is8Bit: boolean) => {
    const max = is8Bit ? 0xFF : 0xFFFF;
    const msb = is8Bit ? 0x80 : 0x8000;

    flags.ZF = (result & max) === 0;
    flags.SF = (result & msb) !== 0;
    flags.CF = result > max || result < 0;
};

export interface ExecutionResult {
    newState: CPUState;
    output?: string;
    halted?: boolean;
}

export const executeInstruction = (state: CPUState): ExecutionResult => {
    const { memory, registers, flags, logs } = state;
    let ip = registers.IP;

    if (ip >= memory.length) throw new Error("IP out of bounds");

    const op = memory[ip++];

    const newState = {
        ...state,
        registers: { ...registers },
        flags: { ...flags },
        // logs not copied here? We return output and let reducer append? 
        // Or we stick to immutable logs. Reducer handles appending.
        // newState.logs is logs (ref).
    };
    newState.registers.IP = ip;

    let output: string | undefined = undefined;

    const read8 = () => newState.memory[newState.registers.IP++];
    const read16 = () => {
        const low = newState.memory[newState.registers.IP++];
        const high = newState.memory[newState.registers.IP++];
        return (high << 8) | low;
    };

    switch (op) {
        case OPCODES.NOP:
            break;

        case OPCODES.HLT:
            return { newState, halted: true };

        case OPCODES.MOV_REG_REG: {
            const byte = read8();
            const dest = (byte >> 4) & 0xF;
            const src = byte & 0xF;
            const val = getReg(newState.registers, src);
            setReg(newState.registers, dest, val);
            break;
        }

        case OPCODES.MOV_REG_IMM: {
            const dest = read8();
            const val = read16();
            setReg(newState.registers, dest, val);
            break;
        }

        case OPCODES.ADD_REG_REG: {
            const byte = read8();
            const dest = (byte >> 4) & 0xF;
            const src = byte & 0xF;
            const val1 = getReg(newState.registers, dest);
            const val2 = getReg(newState.registers, src);
            const is8Bit = dest < 8;
            const res = val1 + val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, is8Bit);
            break;
        }

        case OPCODES.ADD_REG_IMM: {
            const dest = read8();
            const val2 = read16();
            const val1 = getReg(newState.registers, dest);
            const is8Bit = dest < 8;
            const res = val1 + val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, is8Bit);
            break;
        }

        case OPCODES.SUB_REG_REG: {
            const byte = read8();
            const dest = (byte >> 4) & 0xF;
            const src = byte & 0xF;
            const val1 = getReg(newState.registers, dest);
            const val2 = getReg(newState.registers, src);
            const is8Bit = dest < 8;
            const res = val1 - val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, is8Bit);
            break;
        }

        case OPCODES.SUB_REG_IMM: {
            const dest = read8();
            const val2 = read16();
            const val1 = getReg(newState.registers, dest);
            const is8Bit = dest < 8;
            const res = val1 - val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, is8Bit);
            break;
        }

        case OPCODES.INC_REG: {
            const dest = read8();
            const val = getReg(newState.registers, dest);
            const res = val + 1;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }

        case OPCODES.DEC_REG: {
            const dest = read8();
            const val = getReg(newState.registers, dest);
            const res = val - 1;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }

        case OPCODES.MUL_REG: {
            const src = read8(); // Opcode argument is the source
            const val = getReg(newState.registers, src);
            const is8Bit = src < 8;

            if (is8Bit) {
                const al = newState.registers.AX & 0xFF;
                const res = al * val;
                newState.registers.AX = res; // 16-bit result stored in AX
                updateFlags(newState.flags, res, false); // Flags based on 16-bit? x86 MUL sets CF/OF if upper half != 0
            } else {
                const ax = newState.registers.AX;
                const res = ax * val;
                newState.registers.AX = res & 0xFFFF;
                newState.registers.DX = (res >>> 16) & 0xFFFF;
                updateFlags(newState.flags, res, false);
            }
            break;
        }

        case OPCODES.DIV_REG: {
            const src = read8();
            const val = getReg(newState.registers, src);
            if (val === 0) {
                newState.error = "Divide by Zero";
                newState.status = 'error';
                break;
            }
            const is8Bit = src < 8;

            if (is8Bit) {
                const ax = newState.registers.AX;
                const quot = Math.floor(ax / val);
                const rem = ax % val;
                if (quot > 0xFF) {
                    newState.error = "Divide Overflow";
                    newState.status = 'error';
                } else {
                    // AL = quot, AH = rem
                    setReg(newState.registers, 0, quot); // AL
                    setReg(newState.registers, 4, rem);  // AH
                }
            } else {
                // DX:AX / val
                const dxax = (newState.registers.DX << 16) | newState.registers.AX;
                const quot = Math.floor(dxax / val);
                const rem = dxax % val;
                if (quot > 0xFFFF) {
                    newState.error = "Divide Overflow";
                    newState.status = 'error';
                } else {
                    newState.registers.AX = quot;
                    newState.registers.DX = rem;
                }
            }
            break;
        }

        case OPCODES.NOT_REG: {
            const dest = read8();
            const val = getReg(newState.registers, dest);
            const is8Bit = dest < 8;
            const mask = is8Bit ? 0xFF : 0xFFFF;
            const res = (~val) & mask;
            setReg(newState.registers, dest, res);
            // NOT does not touch flags
            break;
        }

        case OPCODES.AND_REG_REG: {
            const byte = read8();
            const dest = (byte >> 4) & 0xF;
            const src = byte & 0xF;
            const val1 = getReg(newState.registers, dest);
            const val2 = getReg(newState.registers, src);
            const res = val1 & val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }
        case OPCODES.AND_REG_IMM: {
            const dest = read8();
            const val2 = read16();
            const val1 = getReg(newState.registers, dest);
            const res = val1 & val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }

        case OPCODES.OR_REG_REG: {
            const byte = read8();
            const dest = (byte >> 4) & 0xF;
            const src = byte & 0xF;
            const val1 = getReg(newState.registers, dest);
            const val2 = getReg(newState.registers, src);
            const res = val1 | val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }
        case OPCODES.OR_REG_IMM: {
            const dest = read8();
            const val2 = read16();
            const val1 = getReg(newState.registers, dest);
            const res = val1 | val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }

        case OPCODES.XOR_REG_REG: {
            const byte = read8();
            const dest = (byte >> 4) & 0xF;
            const src = byte & 0xF;
            const val1 = getReg(newState.registers, dest);
            const val2 = getReg(newState.registers, src);
            const res = val1 ^ val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }
        case OPCODES.XOR_REG_IMM: {
            const dest = read8();
            const val2 = read16();
            const val1 = getReg(newState.registers, dest);
            const res = val1 ^ val2;
            setReg(newState.registers, dest, res);
            updateFlags(newState.flags, res, dest < 8);
            break;
        }

        case OPCODES.JMP: {
            const disp = read16();
            const signedDisp = (disp << 16) >> 16;
            newState.registers.IP = (newState.registers.IP + signedDisp) & 0xFFFF;
            break;
        }

        case OPCODES.LOOP: {
            const disp = read8();
            const signedDisp = (disp << 24) >> 24;
            const cx = newState.registers.CX;
            const newCx = (cx - 1) & 0xFFFF;
            newState.registers.CX = newCx;
            if (newCx !== 0) {
                newState.registers.IP = (newState.registers.IP + signedDisp) & 0xFFFF;
            }
            break;
        }

        case OPCODES.INT: {
            const intNo = read8();
            if (intNo === 0x21) {
                const ah = (newState.registers.AX >> 8) & 0xFF;
                if (ah === 0x02) {
                    const char = String.fromCharCode(newState.registers.DX & 0xFF);
                    output = char;
                } else if (ah === 0x09) {
                    // Print string at DX offset (simplified memory model)
                    let addr = newState.registers.DX;
                    let str = "";
                    while (addr < 65536) {
                        const c = newState.memory[addr++];
                        if (c === 36) break; // '$'
                        str += String.fromCharCode(c);
                    }
                    output = str;
                }
            }
            break;
        }

        // Fallback: If op is 0 (empty memory), just NOP/halt?
        // Real CPU executes 0x00 (ADD [BX+SI], AL).
        // Our custom opcode 0x00 is undefined.
    }

    return { newState, output, halted: false };
};
