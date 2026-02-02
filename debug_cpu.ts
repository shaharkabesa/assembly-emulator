
import { compile, OPCODES } from './src/core/assembler';
import { createInitialState, executeInstruction } from './src/core/cpu';

console.log("--- Debug Session: CMP, Jumps & Arrays ---");

const source = `
ORG 100h
start:
    MOV AX, 10
    CMP AX, 10     ; ZF=1
    JE equal       ; Should Jump
    MOV DX, 0DEADh ; Should be skipped
    HLT
equal:
    MOV BX, 20
    ; Test Array Access
    MOV SI, 1
    MOV CL, data[SI] ; Should be 55h
    HLT
data: DB 11h, 55h, 99h
`;

console.log("Compiling...");
try {
    const result = compile(source);
    console.log(`Compilation Success. Start: ${result.startAddress}`);
    if (result.errors.length > 0) console.error("Errors:", result.errors);

    console.log("Machine Code:");
    console.log(Array.from(result.machineCode.slice(0x100, 0x120)).map(b => b.toString(16).padStart(2, '0')).join(' '));

    let state = createInitialState();
    // Load program
    for (let i = 0; i < result.machineCode.length; i++) {
        state.memory[i] = result.machineCode[i];
    }
    state.registers.IP = result.startAddress;
    state.status = 'running';

    console.log(`Initial IP: ${state.registers.IP.toString(16)}`);

    for (let i = 0; i < 20; i++) {
        if (state.status !== 'running') break;
        console.log(`Step ${i + 1}: Executing IP ${state.registers.IP.toString(16)}...`);
        try {
            const step = executeInstruction(state);
            state = step.newState;
            const flags = `ZF=${state.flags.ZF ? 1 : 0} CF=${state.flags.CF ? 1 : 0}`;
            console.log(`  -> AX=${state.registers.AX.toString(16)} BX=${state.registers.BX.toString(16)} CL=${state.registers.CX & 0xFF} IP=${state.registers.IP.toString(16)} Flags=[${flags}]`);
            if (step.halted) {
                console.log("  -> Halted.");
                break;
            }
        } catch (e: any) {
            console.error("  -> Execution Error:", e.message);
            break;
        }
    }

} catch (e: any) {
    console.error("CRITICAL ERROR:", e.message);
}
console.log("--- End Debug Session ---");
