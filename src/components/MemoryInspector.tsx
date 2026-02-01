import React, { useState } from 'react';

interface MemoryInspectorProps {
    memory: Uint8Array;
}

const MemoryInspector: React.FC<MemoryInspectorProps> = ({ memory }) => {
    const [startAddr, setStartAddr] = useState(0x0700);

    const rows = 16;
    const cols = 16;

    const renderGrid = () => {
        const lines = [];
        for (let i = 0; i < rows; i++) {
            const addr = startAddr + i * cols;
            const bytes = [];
            const chars = [];

            for (let j = 0; j < cols; j++) {
                const currentAddr = addr + j;
                if (currentAddr >= memory.length) break;
                const val = memory[currentAddr];
                const hex = val.toString(16).toUpperCase().padStart(2, '0');
                bytes.push(
                    <span key={j} className={`inline-block w-6 text-center text-xs ${val === 0 ? 'text-slate-700' : 'text-blue-300 font-bold'}`}>
                        {hex}
                    </span>
                );

                const char = (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
                chars.push(char);
            }

            lines.push(
                <div key={addr} className="flex font-mono text-sm hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
                    <span className="text-purple-400 mr-4 select-none opacity-50 group-hover:opacity-100 transition-opacity text-xs">{addr.toString(16).toUpperCase().padStart(4, '0')}:</span>
                    <div className="flex gap-1 mr-4">{bytes}</div>
                    <div className="text-slate-500 tracking-widest text-xs opacity-50 group-hover:opacity-100">{chars.join('')}</div>
                </div>
            );
        }
        return lines;
    };

    return (
        <div className="glass-panel p-4 rounded-xl h-full flex flex-col">
            <div className="flex justify-between mb-3 items-center border-b border-white/5 pb-2">
                <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                    Memory
                </h3>
                <div className="flex items-center gap-2 glass-input rounded-lg px-2 py-1">
                    <span className="text-slate-500 text-xs uppercase font-bold">Addr:</span>
                    <input
                        className="bg-transparent text-white border-none outline-none text-xs font-mono w-16 text-right"
                        value={startAddr.toString(16).toUpperCase()}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 16);
                            if (!isNaN(val)) setStartAddr(val);
                        }}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar font-mono bg-black/20 rounded-lg p-2 border border-white/5 shadow-inner">
                {renderGrid()}
            </div>
        </div>
    );
};

export default MemoryInspector;
