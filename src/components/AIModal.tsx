import React, { useState, useEffect } from 'react';
import { generateAssemblyCode } from '../services/ai';

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCodeGenerated: (code: string) => void;
}

const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onCodeGenerated }) => {
    const [apiKey, setApiKey] = useState('');
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [model, setModel] = useState('gemini-1.5-flash');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) setApiKey(storedKey);
    }, []);

    const handleGenerate = async () => {
        if (!apiKey) {
            setError("Please provide a valid Gemini API Key.");
            return;
        }
        if (!prompt && !image) {
            setError("Please provide a prompt or an image.");
            return;
        }

        setLoading(true);
        setError(null);
        localStorage.setItem('gemini_api_key', apiKey); // Save for convenience

        try {
            const code = await generateAssemblyCode(apiKey, prompt || "Convert this image to assembly code.", image || undefined, model);
            onCodeGenerated(code);
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => setImage(evt.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex justify-between items-center">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <span>✨</span> AI Assistant (Gemini)
                    </h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* API Key */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gemini API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Paste your key here..."
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none transition-colors"
                        />
                        <div className="text-[10px] text-slate-500 mt-1">
                            Key is stored in your browser's Local Storage.
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline ml-1">Get a Key</a>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Model</label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none transition-colors"
                        >
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                            <option value="gemini-1.5-flash-001">Gemini 1.5 Flash-001</option>
                            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8b</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Image (Optional)</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="ai-image-upload"
                            />
                            <label htmlFor="ai-image-upload" className="flex items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-purple-500/50 hover:bg-white/5 transition-all">
                                {image ? (
                                    <img src={image} alt="Preview" className="h-full object-contain" />
                                ) : (
                                    <span className="text-slate-500 text-sm">Click to upload image...</span>
                                )}
                            </label>
                            {image && <button onClick={() => setImage(null)} className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-xs text-white hover:bg-rose-500">✕</button>}
                        </div>
                    </div>

                    {/* Prompt */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe what you want (e.g., 'Sum first 5 numbers')..."
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none transition-colors resize-none h-24"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-rose-500/20 text-rose-300 text-xs p-3 rounded-lg border border-rose-500/30">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-sm font-bold transition-colors">Cancel</button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {loading ? "Generating..." : "Generate Code"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIModal;
