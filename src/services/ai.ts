import { GoogleGenerativeAI } from "@google/generative-ai";

export const listModels = async (apiKey: string): Promise<string[]> => {
    if (!apiKey) throw new Error("API Key is required");

    // We use fetch directly because the SDK's listModels might vary by version or be server-side only in some contexts.
    // The REST endpoint is reliable: https://ai.google.dev/gemini-api/docs/models/gemini
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Failed to list models");
        }
        const data = await response.json();
        const models = data.models || [];

        // Filter for models that support generateContent
        return models
            .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m: any) => m.name.replace("models/", "")); // Strip 'models/' prefix
    } catch (e: any) {
        console.error("Failed to list models:", e);
        throw e;
    }
};

export const generateAssemblyCode = async (apiKey: string, prompt: string, imageBase64?: string, modelName: string = "gemini-1.5-flash"): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemPrompt = `You are an expert 8086 Assembly programmer. 
Your task is to write working 8086 assembly code based on the user's request or image.
RULES:
1. Output ONLY valid 8086 assembly code. Do NOT output Markdown code blocks (like \`\`\`assembly). Just the raw text.
2. If the user provides an image of text/code, transcribe and solve/implement it.
3. Assume a simple emulator environment:
   - Start with 'ORG 100h'
   - Use standard registers (AX, BX, CX, DX, SI, DI, SP, BP)
   - Support MOV, ADD, SUB, INC, DEC, MUL, DIV, AND, OR, XOR, NOT, CMP, JMP, JE, JNE, JL, JG, LOOP, INT, HLT.
   - For 'print', use 'MOV AH, 09h' / 'INT 21h' with '$' terminated strings.
4. Add comments explaining complex logic.
5. Do not include conversational text before or after the code.`;

    try {
        let result;
        if (imageBase64) {
            // Check if it has the prefix
            const match = imageBase64.match(/^data:(image\/[a-z]+);base64,(.+)$/);
            const mimeType = match ? match[1] : "image/jpeg";
            const data = match ? match[2] : imageBase64;

            const imagePart = {
                inlineData: {
                    data: data,
                    mimeType: mimeType
                }
            };
            result = await model.generateContent([systemPrompt + "\nUser Request: " + prompt, imagePart]);
        } else {
            result = await model.generateContent(systemPrompt + "\nUser Request: " + prompt);
        }

        const response = await result.response;
        let text = response.text();
        // Cleanup just in case
        text = text.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
        return text;
    } catch (e: any) {
        console.error("Gemini API Error:", e);
        throw new Error("Failed to generate code: " + (e.message || "Unknown error"));
    }
};
