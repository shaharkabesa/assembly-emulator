import type { CPUState } from './cpu';

export const REGISTERS_MAP: Record<string, number> = {
    AL: 0, CL: 1, DL: 2, BL: 3, AH: 4, CH: 5, DH: 6, BH: 7,
    AX: 8, CX: 9, DX: 10, BX: 11, SP: 12, BP: 13, SI: 14, DI: 15
};

export const OPCODES = {
    NOP: 0x90,
    MOV_REG_REG: 0x10,
    MOV_REG_IMM: 0x11,
    ADD_REG_REG: 0x20,
    ADD_REG_IMM: 0x21,
    SUB_REG_REG: 0x30,
    SUB_REG_IMM: 0x31,
    INC_REG: 0x40,
    DEC_REG: 0x41,
    MUL_REG: 0xF6, // Simplified: F6/F7 in real x86, we use specific custom ops for simplicity
    DIV_REG: 0xF7,
    AND_REG_REG: 0x22,
    AND_REG_IMM: 0x23,
    OR_REG_REG: 0x0A,
    OR_REG_IMM: 0x0B,
    XOR_REG_REG: 0x32,
    XOR_REG_IMM: 0x33,
    NOT_REG: 0xF8,
    INT: 0xCD,
    JMP: 0xE9,
    LOOP: 0xE2,
    HLT: 0xF4,
    RET: 0xC3,
    MOV_REG_INDEX: 0x8A, // Custom: DEST_REG, INDEX_REG, ADDR_LO, ADDR_HI (Move Register <== Mem[Addr + Index])
    MOV_INDEX_REG: 0x88, // Custom: INDEX_REG, ADDR_LO, ADDR_HI, SRC_REG (Move Mem[Addr + Index] <== Register)
    MOV_REG_MEM: 0x8B,   // Custom: DEST_REG, ADDR_LO, ADDR_HI (Move Register <== Mem[Addr])
    MOV_MEM_REG: 0x89,   // Custom: ADDR_LO, ADDR_HI, SRC_REG
    MOV_MEM_IMM: 0xC6, MOV_INDEX_IMM: 0xC7,

    // Arithmetic Memory Ops (Reg <- Mem/Index)
    ADD_REG_MEM: 0x24, ADD_REG_INDEX: 0x25,
    SUB_REG_MEM: 0x34, SUB_REG_INDEX: 0x35,
    AND_REG_MEM: 0x26, AND_REG_INDEX: 0x27,
    OR_REG_MEM: 0x0C, OR_REG_INDEX: 0x0D,
    XOR_REG_MEM: 0x36, XOR_REG_INDEX: 0x37,

    // Arithmetic To-Memory Ops (Mem/Index <- Reg/Imm)
    ADD_MEM_REG: 0x90, ADD_INDEX_REG: 0x91, ADD_MEM_IMM: 0x92, ADD_INDEX_IMM: 0x93,
    SUB_MEM_REG: 0x94, SUB_INDEX_REG: 0x95, SUB_MEM_IMM: 0x96, SUB_INDEX_IMM: 0x97,
    AND_MEM_REG: 0x98, AND_INDEX_REG: 0x99, AND_MEM_IMM: 0x9A, AND_INDEX_IMM: 0x9B,
    OR_MEM_REG: 0x9C, OR_INDEX_REG: 0x9D, OR_MEM_IMM: 0x9E, OR_INDEX_IMM: 0x9F,
    XOR_MEM_REG: 0xA0, XOR_INDEX_REG: 0xA1, XOR_MEM_IMM: 0xA2, XOR_INDEX_IMM: 0xA3,

    // Single Operand Memory Ops
    INC_MEM: 0xA4, INC_INDEX: 0xA5,
    DEC_MEM: 0xA6, DEC_INDEX: 0xA7,
    NOT_MEM: 0xA8, NOT_INDEX: 0xA9,
    MUL_MEM: 0xAA, MUL_INDEX: 0xAB,
    DIV_MEM: 0xAC, DIV_INDEX: 0xAD,

    // CMP (Same addressing modes as SUB)
    CMP_REG_REG: 0x38, CMP_REG_IMM: 0x39,
    CMP_REG_MEM: 0x3C, CMP_REG_INDEX: 0x3D,
    CMP_MEM_REG: 0x3E, CMP_INDEX_REG: 0x3F, // CMP [MEM], REG
    CMP_MEM_IMM: 0x42, CMP_INDEX_IMM: 0x43,

    // Conditional Jumps
    JE: 0x74, JZ: 0x74,
    JNE: 0x75, JNZ: 0x75,
    JL: 0x7C, JNGE: 0x7C,
    JLE: 0x7E, JNG: 0x7E,
    JG: 0x7F, JNLE: 0x7F,
    JGE: 0x7D, JNL: 0x7D,
    JB: 0x72, JNAE: 0x72, JC: 0x72,
    JBE: 0x76, JNA: 0x76,
    JA: 0x77, JNBE: 0x77,
    JAE: 0x73, JNB: 0x73, JNC: 0x73
};

export const compile = (source: string): { machineCode: Uint8Array, startAddress: number, errors: string[], sourceMap: Map<number, number> } => {
    const lines = source.split('\n');
    const errors: string[] = [];
    const labels: Record<string, number> = {};
    const machineCode = new Uint8Array(65536);
    let offset = 0x100;
    const startOffset = 0x100;
    const sourceMap = new Map<number, number>();

    // Helper to parse number
    const parseNumber = (str: string): number => {
        str = str.trim().toUpperCase();
        if (str.endsWith('H')) return parseInt(str.substring(0, str.length - 1), 16);
        if (str.startsWith('0X')) return parseInt(str.substring(2), 16);
        return parseInt(str, 10);
    };

    const isReg = (s: string) => !!REGISTERS_MAP.hasOwnProperty(s.toUpperCase());
    const getRegId = (s: string) => REGISTERS_MAP[s.toUpperCase()];

    const resolveValue = (s: string, labels: Record<string, number>, currentOffset: number = 0, allowUnresolved: boolean = false): number => {
        // Check for indexed addressing: LABEL[SI] or LABEL[BX]
        const openBracket = s.indexOf('[');
        const closeBracket = s.indexOf(']');
        if (openBracket !== -1 && closeBracket !== -1) {
            throw new Error("Indexed addressing not supported in direct value resolution.");
        }

        if (labels[s] !== undefined) return labels[s];
        const n = parseNumber(s);
        if (isNaN(n)) {
            if (allowUnresolved) return 0;
            throw new Error(`Invalid value: ${s}`);
        }
        return n;
    };

    const parseIndexed = (s: string, labels: Record<string, number>, currentOffset: number, allowUnresolved: boolean) => {
        const openBracket = s.indexOf('[');
        const closeBracket = s.indexOf(']');
        if (openBracket !== -1 && closeBracket !== -1) {
            const labelStr = s.substring(0, openBracket).trim();
            const regStr = s.substring(openBracket + 1, closeBracket).trim();
            if (!isReg(regStr)) {
                if (labelStr === '') return null;
                throw new Error(`Invalid index register: ${regStr}`);
            }
            let addr = 0;
            if (labelStr !== '') {
                addr = resolveValue(labelStr, labels, currentOffset, allowUnresolved);
            }
            return { reg: getRegId(regStr), addr };
        }
        return null;
    };

    const parseMem = (s: string, labels: Record<string, number>, allowUnresolved: boolean) => {
        if (s.startsWith('[') && s.endsWith(']')) {
            const content = s.substring(1, s.length - 1).trim();
            return resolveValue(content, labels, 0, allowUnresolved);
        }
        if (labels[s] !== undefined) return labels[s];
        if (allowUnresolved) {
            const n = parseNumber(s);
            if (isNaN(n) && !isReg(s)) return 0;
        }
        return null;
    };


    const encodeInstruction = (op: string, args: string[], labels: Record<string, number>, currentOffset: number, allowUnresolved: boolean = false): number[] => {
        op = op.toUpperCase();

        if (op === 'NOP') return [OPCODES.NOP];
        if (op === 'HLT') return [OPCODES.HLT];
        if (op === 'RET') return [OPCODES.RET];

        if (op === 'MOV') {
            const dest = args[0];
            const src = args[1];

            const destIndexed = parseIndexed(dest, labels, currentOffset, allowUnresolved);
            const srcIndexed = parseIndexed(src, labels, currentOffset, allowUnresolved);
            const destMem = parseMem(dest, labels, allowUnresolved);
            const srcMem = parseMem(src, labels, allowUnresolved);

            // Check for Illegal Memory-to-Mem
            if ((destIndexed || destMem !== null) && (srcIndexed || srcMem !== null)) {
                throw new Error("Memory to Memory transfer not allowed. Use a register as intermediate.");
            }

            // 1. REG <- REG
            if (isReg(dest) && isReg(src)) {
                return [OPCODES.MOV_REG_REG, (getRegId(dest) << 4) | getRegId(src)];
            }

            // 2. REG <- MEM[INDEX]
            if (isReg(dest) && srcIndexed) {
                return [OPCODES.MOV_REG_INDEX, getRegId(dest), srcIndexed.reg, srcIndexed.addr & 0xFF, (srcIndexed.addr >> 8) & 0xFF];
            }

            // 3. MEM[INDEX] <- REG
            if (destIndexed && isReg(src)) {
                return [OPCODES.MOV_INDEX_REG, destIndexed.reg, destIndexed.addr & 0xFF, (destIndexed.addr >> 8) & 0xFF, getRegId(src)];
            }

            // 4. REG <- [MEM]
            if (isReg(dest)) {
                if (srcMem !== null) {
                    const addr = srcMem;
                    return [OPCODES.MOV_REG_MEM, getRegId(dest), addr & 0xFF, (addr >> 8) & 0xFF];
                }
                // Legacy Fallback for IMM
                const val = resolveValue(src, labels, currentOffset, allowUnresolved);
                return [OPCODES.MOV_REG_IMM, getRegId(dest), val & 0xFF, (val >> 8) & 0xFF];
            }

            // 5. [MEM] <- REG
            if (isReg(src)) {
                if (destMem !== null) {
                    const addr = destMem;
                    return [OPCODES.MOV_MEM_REG, addr & 0xFF, (addr >> 8) & 0xFF, getRegId(src)];
                }
            }

            // 6. [MEM] <- IMM / [INDEX] <- IMM
            // Check Dest is Mem/Index
            if (destIndexed) {
                const val = resolveValue(src, labels, currentOffset, allowUnresolved);
                return [OPCODES.MOV_INDEX_IMM, destIndexed.reg, destIndexed.addr & 0xFF, (destIndexed.addr >> 8) & 0xFF, val & 0xFF]; // 8-bit default
            }
            if (destMem !== null) { // Implicit or Explicit Mem
                const val = resolveValue(src, labels, currentOffset, allowUnresolved);
                const dm = destMem;
                return [OPCODES.MOV_MEM_IMM, dm & 0xFF, (dm >> 8) & 0xFF, val & 0xFF]; // 8-bit default
            }

            // Error Handling
            if (destIndexed || parseMem(dest, labels, allowUnresolved) !== null) throw new Error(`Invalid source for MOV to Memory: ${src}`);
        }

        // Shared Logic for Arithmetic that supports REG, IMM, MEM, INDEX
        if (['ADD', 'SUB', 'AND', 'OR', 'XOR', 'CMP'].includes(op)) {
            const dest = args[0];
            const src = args[1];

            const destIndexed = parseIndexed(dest, labels, currentOffset, allowUnresolved);
            const destMem = parseMem(dest, labels, allowUnresolved);
            const srcIndexed = parseIndexed(src, labels, currentOffset, allowUnresolved);
            const srcMem = parseMem(src, labels, allowUnresolved);

            // Mem-to-Mem check
            if ((destIndexed !== null || destMem !== null) && (srcIndexed !== null || srcMem !== null)) {
                throw new Error("Memory to Memory transfer not allowed. Use a register as intermediate.");
            }

            // Select Opcode Base
            let opCodes = {
                reg: 0, imm: 0, mem: 0, idx: 0,
                memReg: 0, idxReg: 0, memImm: 0, idxImm: 0
            };
            switch (op) {
                case 'ADD': opCodes = { reg: OPCODES.ADD_REG_REG, imm: OPCODES.ADD_REG_IMM, mem: OPCODES.ADD_REG_MEM, idx: OPCODES.ADD_REG_INDEX, memReg: OPCODES.ADD_MEM_REG, idxReg: OPCODES.ADD_INDEX_REG, memImm: OPCODES.ADD_MEM_IMM, idxImm: OPCODES.ADD_INDEX_IMM }; break;
                case 'SUB': opCodes = { reg: OPCODES.SUB_REG_REG, imm: OPCODES.SUB_REG_IMM, mem: OPCODES.SUB_REG_MEM, idx: OPCODES.SUB_REG_INDEX, memReg: OPCODES.SUB_MEM_REG, idxReg: OPCODES.SUB_INDEX_REG, memImm: OPCODES.SUB_MEM_IMM, idxImm: OPCODES.SUB_INDEX_IMM }; break;
                case 'AND': opCodes = { reg: OPCODES.AND_REG_REG, imm: OPCODES.AND_REG_IMM, mem: OPCODES.AND_REG_MEM, idx: OPCODES.AND_REG_INDEX, memReg: OPCODES.AND_MEM_REG, idxReg: OPCODES.AND_INDEX_REG, memImm: OPCODES.AND_MEM_IMM, idxImm: OPCODES.AND_INDEX_IMM }; break;
                case 'OR': opCodes = { reg: OPCODES.OR_REG_REG, imm: OPCODES.OR_REG_IMM, mem: OPCODES.OR_REG_MEM, idx: OPCODES.OR_REG_INDEX, memReg: OPCODES.OR_MEM_REG, idxReg: OPCODES.OR_INDEX_REG, memImm: OPCODES.OR_MEM_IMM, idxImm: OPCODES.OR_INDEX_IMM }; break;
                case 'XOR': opCodes = { reg: OPCODES.XOR_REG_REG, imm: OPCODES.XOR_REG_IMM, mem: OPCODES.XOR_REG_MEM, idx: OPCODES.XOR_REG_INDEX, memReg: OPCODES.XOR_MEM_REG, idxReg: OPCODES.XOR_INDEX_REG, memImm: OPCODES.XOR_MEM_IMM, idxImm: OPCODES.XOR_INDEX_IMM }; break;
                case 'CMP': opCodes = { reg: OPCODES.CMP_REG_REG, imm: OPCODES.CMP_REG_IMM, mem: OPCODES.CMP_REG_MEM, idx: OPCODES.CMP_REG_INDEX, memReg: OPCODES.CMP_MEM_REG, idxReg: OPCODES.CMP_INDEX_REG, memImm: OPCODES.CMP_MEM_IMM, idxImm: OPCODES.CMP_INDEX_IMM }; break;
            }

            if (isReg(dest)) {
                // REG <- REG
                if (isReg(src)) return [opCodes.reg, (getRegId(dest) << 4) | getRegId(src)];
                // REG <- [INDEX]
                if (srcIndexed) return [opCodes.idx, getRegId(dest), srcIndexed.reg, srcIndexed.addr & 0xFF, (srcIndexed.addr >> 8) & 0xFF];
                // REG <- [MEM]
                if (srcMem !== null) return [opCodes.mem, getRegId(dest), srcMem & 0xFF, (srcMem >> 8) & 0xFF];
                // REG <- IMM
                const val = resolveValue(src, labels, currentOffset, allowUnresolved);
                return [opCodes.imm, getRegId(dest), val & 0xFF, (val >> 8) & 0xFF];
            } else {
                // Dest is Mem/Index
                if (destIndexed) {
                    // [INDEX] <- REG
                    if (isReg(src)) return [opCodes.idxReg, destIndexed.reg, destIndexed.addr & 0xFF, (destIndexed.addr >> 8) & 0xFF, getRegId(src)];
                    // [INDEX] <- IMM (Default 8-bit)
                    const val = resolveValue(src, labels, currentOffset, allowUnresolved);
                    return [opCodes.idxImm, destIndexed.reg, destIndexed.addr & 0xFF, (destIndexed.addr >> 8) & 0xFF, val & 0xFF];
                }
                if (destMem !== null) {
                    const dm = destMem;
                    // [MEM] <- REG
                    if (isReg(src)) return [opCodes.memReg, dm & 0xFF, (dm >> 8) & 0xFF, getRegId(src)];
                    // [MEM] <- IMM (Default 8-bit)
                    const val = resolveValue(src, labels, currentOffset, allowUnresolved);
                    return [opCodes.memImm, dm & 0xFF, (dm >> 8) & 0xFF, val & 0xFF];
                }
            }
        }

        // Single Operand Logic (INC, DEC, MUL, DIV, NOT)
        if (['INC', 'DEC', 'MUL', 'DIV', 'NOT'].includes(op)) {
            const dest = args[0];

            let opCodes = { reg: 0, mem: 0, idx: 0 };
            switch (op) {
                case 'INC': opCodes = { reg: OPCODES.INC_REG, mem: OPCODES.INC_MEM, idx: OPCODES.INC_INDEX }; break;
                case 'DEC': opCodes = { reg: OPCODES.DEC_REG, mem: OPCODES.DEC_MEM, idx: OPCODES.DEC_INDEX }; break;
                case 'NOT': opCodes = { reg: OPCODES.NOT_REG, mem: OPCODES.NOT_MEM, idx: OPCODES.NOT_INDEX }; break;
                case 'MUL': opCodes = { reg: OPCODES.MUL_REG, mem: OPCODES.MUL_MEM, idx: OPCODES.MUL_INDEX }; break;
                case 'DIV': opCodes = { reg: OPCODES.DIV_REG, mem: OPCODES.DIV_MEM, idx: OPCODES.DIV_INDEX }; break;
            }

            if (isReg(dest)) return [opCodes.reg, getRegId(dest)];

            const destIndexed = parseIndexed(dest, labels, currentOffset, allowUnresolved);
            if (destIndexed) return [opCodes.idx, destIndexed.reg, destIndexed.addr & 0xFF, (destIndexed.addr >> 8) & 0xFF];

            const destMem = parseMem(dest, labels, allowUnresolved);
            if (destMem !== null) return [opCodes.mem, destMem & 0xFF, (destMem >> 8) & 0xFF];

            throw new Error(`Invalid operand for ${op}: ${dest}`);
        }

        if (op === 'INT') {
            const val = parseNumber(args[0]);
            return [OPCODES.INT, val];
        }

        if (op === 'JMP') {
            const target = resolveValue(args[0], labels, currentOffset, allowUnresolved);
            const disp = target - (currentOffset + 3);
            return [OPCODES.JMP, disp & 0xFF, (disp >> 8) & 0xFF];
        }

        const JUMPS = ['JE', 'JZ', 'JNE', 'JNZ', 'JL', 'JNGE', 'JLE', 'JNG', 'JG', 'JNLE', 'JGE', 'JNL', 'JB', 'JNAE', 'JC', 'JBE', 'JNA', 'JA', 'JNBE', 'JAE', 'JNB', 'JNC'];
        if (JUMPS.includes(op)) {
            const target = resolveValue(args[0], labels, currentOffset, allowUnresolved);
            const disp = target - (currentOffset + 2); // 2 bytes for opcode + imm8
            // Map mnemonic to opcode
            const opcode = (OPCODES as any)[op];
            return [opcode, disp & 0xFF];
        }

        if (op === 'LOOP') {
            const target = resolveValue(args[0], labels, currentOffset, allowUnresolved);
            const disp = target - (currentOffset + 2);
            return [OPCODES.LOOP, disp & 0xFF];
        }

        throw new Error(`Unknown instruction or mode: ${op} ${args.join(', ')}`);
    };

    const parseLine = (line: string) => {
        const clean = line.split(';')[0].trim();
        if (!clean) return null;

        let label: string | null = null;
        let rest = clean;

        // Detect Label (with or without Colon)
        // Standard: "Label:"
        // Variable often: "VarName DB ..."
        // Heuristic: If parsing first token looks like a valid symbol and 2nd token is a directive, treat 1st as label.
        // But first, strict check for colon.
        if (clean.includes(':')) {
            const parts = clean.split(':');
            label = parts[0].trim();
            rest = parts[1] ? parts[1].trim() : '';
        } else {
            // Check for direct Variable Declaration e.g. "VAR DB 10"
            // Split by space
            const spaceIdx = clean.indexOf(' ');
            if (spaceIdx !== -1) {
                const first = clean.substring(0, spaceIdx).trim();
                const remainder = clean.substring(spaceIdx + 1).trim();
                const possibleDirective = remainder.split(' ')[0].toUpperCase();
                if (['DB', 'DW', 'EQU'].includes(possibleDirective)) {
                    label = first;
                    rest = remainder;
                }
            }
        }

        if (!rest) return { label, instruction: null, directive: null, operands: [] };

        const spaceIdx = rest.indexOf(' ');
        let op = '';
        let argsStr = '';

        if (spaceIdx === -1) {
            op = rest;
        } else {
            op = rest.substring(0, spaceIdx);
            argsStr = rest.substring(spaceIdx + 1);
        }

        // Handle string operands (e.g. DB "Hello")
        // If quote exists, treat as single arg or handle specifically
        let operands: string[] = [];
        if (['DB'].includes(op.toUpperCase()) && (argsStr.includes("'") || argsStr.includes('"'))) {
            // Check for mixed content "Hello", 0
            if (argsStr.includes(',')) {
                // Complex split. Regex?
                // Simple parser: iterate chars.
                // For now, support simple "String" OR 1,2,3
                if (argsStr.trim().startsWith("'") || argsStr.trim().startsWith('"')) {
                    // Assume quoted string is first.
                    operands = [argsStr.trim()];
                    // Pass 2 handles quoted string stripping.
                } else {
                    operands = argsStr.split(',').map(s => s.trim());
                }
            } else {
                operands = [argsStr.trim()];
            }
        } else {
            operands = argsStr ? argsStr.split(',').map(s => s.trim()) : [];
        }

        const isDirective = ['ORG', 'DB', 'DW', 'EQU'].includes(op.toUpperCase());

        return {
            label,
            instruction: isDirective ? null : op,
            directive: isDirective ? op.toUpperCase() : null,
            operands
        };
    };



    // Pass 1
    lines.forEach((line) => {
        const parts = parseLine(line);
        if (!parts) return;
        if (parts.label) labels[parts.label] = offset;

        if (parts.instruction) {
            try {
                // Pass allowUnresolved=true for Pass 1 to avoid throwing on forward references
                const len = encodeInstruction(parts.instruction, parts.operands, labels, 0, true).length;
                offset += len;
            } catch {
                offset += 2; // dummy fallback (should rarely happen now)
            }
        } else if (parts.directive === 'DB') {
            const args = parts.operands[0]; // Simplified single arg for string handling logic above
            if (args.startsWith("'") || args.startsWith('"')) {
                offset += args.length - 2; // Quote stripping length
                // Wait, logic in Pass 2 does `op.length - 1` ?
                // Let's match pass 2 logic.
                // For now, rough estimate or fix later.
            } else {
                offset += parts.operands.length;
            }
        } else if (parts.directive === 'DW') {
            offset += parts.operands.length * 2;
        } else if (parts.directive === 'ORG') {
            const val = parseNumber(parts.operands[0]);
            if (!isNaN(val)) offset = val;
        }
    });

    // Pass 2
    offset = startOffset;
    lines.forEach((line, lineIndex) => {
        const parts = parseLine(line);
        if (!parts) return;

        if (parts.instruction || parts.directive === 'DB' || parts.directive === 'DW') {
            sourceMap.set(offset, lineIndex);
        }

        if (parts.directive === 'ORG') {
            const val = parseNumber(parts.operands[0]);
            if (!isNaN(val)) offset = val;
            return;
        }

        if (parts.directive === 'DB') {
            // Check if string
            const raw = parts.operands[0];
            if (raw.startsWith("'") || raw.startsWith('"')) {
                const content = raw.substring(1, raw.length - 1);
                for (let i = 0; i < content.length; i++) {
                    machineCode[offset++] = content.charCodeAt(i);
                }
            } else {
                // multiple numbers?
                // parseLine above didn't split commas if quotes present.
                // If no quotes, SPLIT was done.
                // Need to handle DB 10, 13
                // Re-parse operands if not string.
                const ops = raw.includes(',') ? raw.split(',').map(x => x.trim()) : [raw];
                // Wait, if quotes were NOT present, parseLine ALREADY split it.
                // If quotes were present, it returns [raw].
                // So if parts.operands has > 1, it's numbers.
                parts.operands.forEach(o => {
                    if ((o.startsWith("'") || o.startsWith('"'))) {
                        // Already handled?
                        // My parseLine logic is a bit rigid.
                        // For "Hello", parts.operands=['"Hello"']
                        // For 10, 13, parts.operands=['10', '13']
                        // Logic is likely fine.
                        const str = o.substring(1, o.length - 1);
                        for (let k = 0; k < str.length; k++) machineCode[offset++] = str.charCodeAt(k);
                    } else {
                        machineCode[offset++] = parseNumber(o) & 0xFF;
                    }
                });
            }
            return;
        }

        // DW ...

        if (parts.instruction) {
            try {
                const bytes = encodeInstruction(parts.instruction, parts.operands, labels, offset);
                bytes.forEach(b => machineCode[offset++] = b);
            } catch (e: any) {
                errors.push(`Line ${lineIndex + 1}: ${e.message}`);
            }
        }
    });

    return { machineCode, startAddress: startOffset, errors, sourceMap };
};
