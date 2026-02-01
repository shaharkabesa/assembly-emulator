import React from 'react';
import { Registers, Flags } from '../core/cpu';

interface RegistersPanelProps {
    registers: Registers;
    flags: Flags;
}

const toHex = (num: number, padding: number = 4) =>
    num.toString(16).toUpperCase().padStart(padding, '0');

const RegisterRow: React.FC<{ name: string; val: number }> = ({ name, val }) => {
    const high = (val >> 8) & 0xFF;
    const low = val & 0xFF;

    return (
        <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-black/20 border border-white/5 hover:bg-black/30 transition-colors group">
            <div className="text-blue-400 font-bold w-6 text-lg group-hover:text-blue-300 transition-colors">{name}</div>
            {/* High Byte */}
            <div className="flex flex-col items-center">
                <div className="glass-input text-white px-2 py-1 rounded font-mono w-10 text-center text-sm shadow-inner group-hover:border-blue-500/30 transition-colors border border-transparent">
                    {toHex(high, 2)}
                </div>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">High</span>
            </div>
            {/* Low Byte */}
            <div className="flex flex-col items-center">
                <div className="glass-input text-white px-2 py-1 rounded font-mono w-10 text-center text-sm shadow-inner group-hover:border-blue-500/30 transition-colors border border-transparent">
                    {toHex(low, 2)}
                </div>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Low</span>
            </div>
            {/* Combined Hex */}
            <div className="text-purple-300 font-mono text-sm ml-auto font-semibold">
                {toHex(val, 4)}h
            </div>
            {/* Decimal */}
            <div className="text-slate-500 font-mono text-xs w-12 text-right">
                {val}
            </div>
        </div>
    );
};

const SimpleReg: React.FC<{ name: string; val: number }> = ({ name, val }) => (
    <div className="flex justify-between items-center mb-1.5 text-sm p-1.5 rounded hover:bg-white/5 transition-colors">
        <span className="text-blue-400 font-bold">{name}</span>
        <span className="font-mono text-purple-200 bg-black/20 px-2 py-0.5 rounded border border-white/10 shadow-sm">
            {toHex(val, 4)}
        </span>
    </div>
);

const RegistersPanel: React.FC<RegistersPanelProps> = ({ registers, flags }) => {
    return (
        <div className="glass-panel p-4 rounded-xl h-full overflow-auto flex flex-col gap-4">
            <div>
                <h3 className="text-slate-400 font-bold mb-3 uppercase text-xs tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                    General Purpose
                </h3>
                <div className="grid grid-cols-1 gap-0">
                    <RegisterRow name="AX" val={registers.AX} />
                    <RegisterRow name="BX" val={registers.BX} />
                    <RegisterRow name="CX" val={registers.CX} />
                    <RegisterRow name="DX" val={registers.DX} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Pointers</h4>
                    <div className="flex flex-col gap-0.5">
                        <SimpleReg name="SP" val={registers.SP} />
                        <SimpleReg name="BP" val={registers.BP} />
                        <SimpleReg name="SI" val={registers.SI} />
                        <SimpleReg name="DI" val={registers.DI} />
                        <SimpleReg name="IP" val={registers.IP} />
                    </div>
                </div>
                <div>
                    <h4 className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Segments</h4>
                    <div className="flex flex-col gap-0.5">
                        <SimpleReg name="CS" val={registers.CS} />
                        <SimpleReg name="DS" val={registers.DS} />
                        <SimpleReg name="ES" val={registers.ES} />
                        <SimpleReg name="SS" val={registers.SS} />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-slate-400 font-bold mb-3 uppercase text-xs tracking-widest flex items-center gap-2 border-t border-white/5 pt-4">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span>
                    Flags
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(flags).map(([key, val]) => (
                        (key === 'ZF' || key === 'CF' || key === 'SF' || key === 'OF') ? (
                            <div key={key} className={`text-center text-xs font-bold border rounded p-1.5 transition-all duration-300 ${val ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/20 text-slate-600 border-white/5'}`}>
                                {key}
                            </div>
                        ) : null
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RegistersPanel;
