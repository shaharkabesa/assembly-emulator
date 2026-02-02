Design Plan for Indexed Addressing:
1. assembler.ts: Detect `ar[SI]` pattern.
2. assembler.ts: Emit new Opcodes: `MOV_REG_MEMIDX` (from memory[addr+index] to reg) and `MOV_MEMIDX_REG` (from reg to memory[addr+index]).
3. cpu.ts: Implement these opcodes.
   - Opcode layout: [OP] [DEST_REG] [INDEX_REG] [BASE_ADDR_LOW] [BASE_ADDR_HIGH]
   - Execution: `addr = base + regs[index_reg]`. `regs[dest] = memory[addr]`.
