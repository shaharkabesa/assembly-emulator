import React, { useReducer, useEffect, useState } from 'react';
import CodeEditor from './CodeEditor';
import RegistersPanel from './RegistersPanel';
import MemoryInspector from './MemoryInspector';
import { createInitialState, CPUState, executeInstruction } from '../core/cpu';
import { compile } from '../core/assembler';

type Action =
   | { type: 'RESET' }
   | { type: 'LOAD_PROGRAM', payload: { code: Uint8Array, entry: number, sourceMap: Map<number, number> } }
   | { type: 'STEP' }
   | { type: 'RUN_START' }
   | { type: 'RUN_STOP' }
   | { type: 'ERROR', payload: string };

const cpuReducer = (state: CPUState, action: Action): CPUState => {
   switch (action.type) {
      case 'RESET':
         return createInitialState();
      case 'LOAD_PROGRAM': {
         const newState = createInitialState();
         for (let i = 0; i < action.payload.code.length; i++) {
            newState.memory[i] = action.payload.code[i];
         }
         newState.registers.IP = action.payload.entry;
         newState.status = 'idle';
         return newState;
      }
      case 'STEP': {
         try {
            const res = executeInstruction(state);
            const newLogs = res.output ? [...state.logs, res.output] : state.logs;

            if (res.halted) return { ...res.newState, status: 'idle', logs: newLogs };
            // Return state with new logs
            return { ...res.newState, logs: newLogs };
         } catch (e: any) {
            return { ...state, status: 'error', error: e.message };
         }
      }
      case 'RUN_START':
         return { ...state, status: 'running' };
      case 'RUN_STOP':
         return { ...state, status: 'idle' };
      case 'ERROR':
         return { ...state, status: 'error', error: action.payload };
      default:
         return state;
   }
};

const SAMPLE_PROGRAM = `; Hello World Example
ORG 100h
start:
    MOV AH, 09h    ; Function 9: Print String
    MOV DX, msg    ; Load address of msg
    INT 21h        ; Call DOS interrupt
    HLT            ; Halt execution

msg:
    DB "Hello, World!$"
`;

const Dashboard: React.FC = () => {
   const [cpu, dispatch] = useReducer(cpuReducer, createInitialState());
   const [sourceCode, setSourceCode] = useState(SAMPLE_PROGRAM);
   const [sourceMap, setSourceMap] = useState<Map<number, number>>(new Map());
   const [activeLine, setActiveLine] = useState<number | undefined>(undefined);

   const handleCompile = () => {
      try {
         const result = compile(sourceCode);
         if (result.errors.length > 0) {
            alert("Compilation Errors:\\n" + result.errors.join('\\n'));
            return;
         }
         setSourceMap(result.sourceMap);
         dispatch({
            type: 'LOAD_PROGRAM',
            payload: { code: result.machineCode, entry: result.startAddress, sourceMap: result.sourceMap }
         });
         console.log("Compiled. Source Map:", result.sourceMap);
      } catch (e: any) {
         alert("Assembler Error: " + e.message);
      }
   };

   const handleStep = () => {
      dispatch({ type: 'STEP' });
   };

   useEffect(() => {
      let interval: number;
      if (cpu.status === 'running') {
         interval = setInterval(() => {
            dispatch({ type: 'STEP' });
         }, 50);
      }
      return () => clearInterval(interval);
   }, [cpu.status]);

   useEffect(() => {
      if (sourceMap) {
         const line = sourceMap.get(cpu.registers.IP);
         setActiveLine(line);
      }
   }, [cpu.registers.IP, sourceMap]);

   return (
      <div className="h-screen w-screen bg-[#0f172a] text-white p-6 flex flex-col gap-6 overflow-hidden">
         {/* Top Bar */}
         <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <span className="font-bold text-xl">86</span>
               </div>
               <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Assembly Emulator
               </h1>
            </div>

            <div className="flex gap-3">
               <button onClick={handleCompile} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                  COMPILE
               </button>
               <div className="w-px bg-white/10 mx-2"></div>
               <button onClick={handleStep} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 border border-white/5">
                  STEP
               </button>
               <button onClick={() => dispatch({ type: 'RUN_START' })} className="px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 text-black">
                  RUN
               </button>
               <button onClick={() => dispatch({ type: 'RUN_STOP' })} className="px-6 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-sm shadow-lg shadow-rose-500/30 transition-all active:scale-95 border border-white/5">
                  STOP
               </button>
               <button onClick={() => dispatch({ type: 'RESET' })} className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-sm shadow-lg shadow-slate-500/30 transition-all active:scale-95 border border-white/5">
                  RESET
               </button>
            </div>

            <button onClick={() => setSourceCode(SAMPLE_PROGRAM)} className="text-xs text-slate-400 hover:text-white underline decoration-slate-600 hover:decoration-white underline-offset-4 transition-all">
               Load Sample
            </button>
         </div>

         <div className="flex-1 flex gap-6 min-h-0">
            {/* Left: Editor */}
            <div className="flex-[2] min-w-0 flex flex-col">
               <CodeEditor
                  code={sourceCode}
                  onChange={setSourceCode}
                  activeLine={activeLine}
               />
            </div>

            {/* Right: Debugger */}
            <div className="flex-1 flex flex-col gap-6 min-w-[350px]">
               <div className="h-[45%]">
                  <RegistersPanel registers={cpu.registers} flags={cpu.flags} />
               </div>

               <div className="h-[30%]">
                  <MemoryInspector memory={cpu.memory} />
               </div>

               {/* Console */}
               <div className="flex-1 glass-panel rounded-xl p-4 flex flex-col overflow-hidden">
                  <div className="uppercase text-xs text-slate-400 font-bold tracking-widest mb-2 border-b border-white/5 pb-2 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                     Terminal Output
                  </div>
                  <div className="flex-1 overflow-auto font-mono text-sm space-y-1">
                     {/* Prompt style */}
                     {cpu.logs.length === 0 && <div className="text-slate-600 italic">Ready...</div>}
                     {cpu.logs.map((log, i) => (
                        <div key={i} className="text-emerald-400 flex gap-2">
                           <span className="text-slate-600 select-none">❯</span>
                           {log}
                        </div>
                     ))}
                     {cpu.status === 'error' && (
                        <div className="text-rose-400 flex gap-2 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                           <span className="font-bold">ERROR:</span>
                           {cpu.error}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Dashboard;
