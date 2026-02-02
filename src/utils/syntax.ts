export const highlightSyntax = (code: string): string => {
    const escapeHtml = (text: string) => {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    };

    return code.split('\n').map(line => {
        // 1. Separate Comment
        const commentMatch = line.indexOf(';');
        let codePart = commentMatch !== -1 ? line.substring(0, commentMatch) : line;
        const commentPart = commentMatch !== -1 ? line.substring(commentMatch) : '';

        // 2. Tokenize and Highlight safely (One pass to avoid regex collision artifacts)
        let output = '';
        let lastIndex = 0;

        // Combined Regex for all tokens
        // Group 1: Label (ends with :)
        // Group 2: Instruction (MOV, ADD, etc)
        // Group 3: Directive (ORG, DB, etc)
        // Group 4: Register (AX, BX, etc)
        // Group 5: Number (Hex or Dec)
        // Combined Regex for all tokens - ORDER MATTERS for collisions (e.g. ORG vs OR)
        // 1. Label
        // 2. Directive (DIRECTIVES must be checked BEFORE instructions if collisions exist, though ORG vs OR is main one)
        // 3. Instruction
        // 4. Register
        // 5. Number
        const tokenRegex = /([a-z0-9_]+:)|(ORG|DB|DW|EQU)|(MOV|ADD|SUB|INC|DEC|MUL|DIV|AND|OR|XOR|NOT|INT|CMP|JMP|JE|JZ|JNE|JNZ|JL|JLE|JG|JGE|JB|JBE|JA|JAE|JC|JNC|LOOP|HLT|RET|NOP)|(AX|BX|CX|DX|SP|BP|SI|DI|CS|DS|ES|SS|AH|AL|BH|BL|CH|CL|DH|DL)|(0x[0-9a-fA-F]+|[0-9a-fA-F]+h|\d+)/gi;

        let match;
        while ((match = tokenRegex.exec(codePart)) !== null) {
            const [fullMatch, label, dir, inst, reg, num] = match;

            // Append text before the match (whitespace, commas, etc.) escaped
            output += escapeHtml(codePart.substring(lastIndex, match.index));

            if (label) {
                output += `<span class="font-bold text-white">${escapeHtml(label)}</span>`;
            } else if (inst) {
                // User requested Bold Green for instructions
                output += `<span class="font-bold text-green-400">${escapeHtml(inst)}</span>`;
            } else if (dir) {
                output += `<span class="font-bold text-purple-400">${escapeHtml(dir)}</span>`;
            } else if (reg) {
                output += `<span class="font-bold text-yellow-400">${escapeHtml(reg)}</span>`;
            } else if (num) {
                output += `<span class="text-red-400">${escapeHtml(num)}</span>`;
            }

            lastIndex = tokenRegex.lastIndex;
        }

        // Append remaining text after last match
        output += escapeHtml(codePart.substring(lastIndex));

        // Reattach comment (Gray/Slate to differentiate from Green instructions)
        if (commentPart) {
            output += `<span class="text-slate-500">${escapeHtml(commentPart)}</span>`;
        }

        return `<div class="h-6 whitespace-pre">${output || ' '}</div>`;
    }).join('');
};
