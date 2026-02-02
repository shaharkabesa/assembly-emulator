# 8086 Assembly Emulator

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19-cyan)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)

A modern, high-performance web-based emulator for the **8086 microprocessor architecture**. Built with **React** and **TypeScript**, this application provides a robust environment for writing, assembling, and debugging assembly code directly in the browser. It features a custom-built two-pass assembler and a comprehensive CPU state machine.

![Emulator Screenshot](public/screenshot_placeholder.png)

## 🚀 Key Features

### 🖥️ Core Emulation
- **Custom Assembler**: Built-in two-pass assembler supporting labels, variables (`DB`, `DW`), constants (`EQU`), and forward references.
- **Instruction Set**: Supports key x86 instructions including `MOV`, `ADD`, `SUB`, `CMP`, `INC`, `DEC`, `MUL`, `DIV`, logic gates (`AND`, `OR`, `XOR`, `NOT`), stack operations, and flow control (`JMP`, `JE`, `JNE`, `JA`, `JB`, `LOOP`, `INT`).
- **Memory & Registers**: Real-time visualization of 16-bit registers (AX, BX, CX, DX, SI, DI, SP, BP), specific 8-bit registers (AH, AL, etc.), and Flags (ZF, CF, SF, OF). Interactive memory inspector.

### ✨ AI-Powered Assistant (Gemini Integration)
- **Code Generation**: Integrated with **Google Gemini 1.5 Flash/Pro** to generate assembly code from natural language prompts.
- **Image-to-Code**: Upload images of handwritten notes or textbook problems, and the AI will transcribe and solve them in assembly.
- **Bring Your Own Key**: Secure client-side API key management (stored locally).

### 🛠️ Developer Experience
- **Step-by-Step Debugging**: Execute code instruction-by-instruction to inspect CPU state changes.
- **Syntax Highlighting**: Custom syntax highlighter for assembly mnemonics, directives, and comments.
- **Import / Export**: Save your code as `.asm` files or load existing projects from your local machine.
- **Modern UI**: Sleek, dark-mode interface designed with **TailwindCSS** for focus and readability.

## 📦 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS (v4), PostCSS
- **AI Integration**: Google Generative AI SDK (`@google/generative-ai`)
- **State Management**: React `useReducer` for deterministic CPU state transitions.

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shaharkabesa/assembly-emulator.git
   cd assembly-emulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify the build** (Optional)
   ```bash
   npm run build
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## 🧩 Usage Guide

1. **Writing Code**: Type Assembly code in the left editor pane.
   - Example `MOV AX, 5`
2. **AI Assistance**: Click the `✨ AI ASSISTANT` button.
   - Enter your Gemini API Key.
   - Type a prompt like "Write a program to find the factorial of 5".
3. **Compilation**: Click `COMPILE`. Any syntax errors will appear in the toast notification.
4. **Execution**:
   - `STEP`: Execute one instruction.
   - `RUN`: Auto-execute the program (halt with `HLT`).
   - `RESET`: Clear registers and memory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Created by Shahar Kabesa © 2026**
*Experimental Technology powered by Google Anti-Gravity*
