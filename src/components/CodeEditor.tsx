import React, { useRef, useState, useEffect } from 'react';
import { highlightSyntax } from '../utils/syntax';

interface CodeEditorProps {
    code: string;
    onChange: (val: string) => void;
    activeLine?: number;
    breakpoints?: number[];
    onToggleBreakpoint?: (line: number) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, activeLine }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    const handleScroll = () => {
        if (textareaRef.current && preRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const [lineCount, setLineCount] = useState(1);

    useEffect(() => {
        setLineCount(code.split('\n').length);
    }, [code]);

    return (
        <div className="flex h-full font-mono text-sm glass-panel rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Gutter */}
            <div className="w-12 bg-black/40 border-r border-white/10 text-slate-500 text-right py-4 select-none flex-shrink-0 flex flex-col">
                {Array.from({ length: lineCount }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-6 pr-3 leading-6 text-xs transition-colors duration-200 ${activeLine === i ? 'bg-yellow-500/20 text-yellow-400 font-bold border-r-2 border-yellow-500' : ''}`}
                    >
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Editor Area */}
            <div className="relative flex-1 h-full overflow-hidden text-lg">
                {/* Overlay (Colors) */}
                <pre
                    ref={preRef}
                    aria-hidden="true"
                    className="absolute inset-0 m-0 p-4 pointer-events-none whitespace-pre overflow-auto font-mono leading-6"
                    dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }}
                    style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
                />

                {/* Active Line Highlighter (Background) */}
                {activeLine !== undefined && activeLine >= 0 && (
                    <div
                        className="absolute left-0 right-0 bg-yellow-400/10 pointer-events-none transition-all duration-100 border-l-2 border-yellow-500"
                        style={{
                            top: `${(activeLine * 1.5) + 1}rem`,
                            height: '1.5rem',
                        }}
                    />
                )}

                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    spellCheck={false}
                    className="absolute inset-0 w-full h-full p-4 m-0 bg-transparent text-transparent caret-blue-400 resize-none outline-none font-mono leading-6 whitespace-pre overflow-auto z-10 selection:bg-blue-500/30"
                    style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
                />
            </div>
        </div>
    );
};

export default CodeEditor;
