# ⚡ SparkAgent

SparkAgent is an AI-powered agent built using **React**, **TypeScript**, **Google Gemini 2.5 Flash**, and **LangChain**. It features a modern conversational interface, intelligent tool calling, and agent-based reasoning capabilities.

The goal of this project is to explore how Large Language Models, agent frameworks, and external tools can be combined to create intelligent assistants capable of performing tasks beyond traditional chatbots.

---

## ✨ Features

- Modern ChatGPT-style interface
- React + TypeScript architecture
- Google Gemini 2.5 Flash integration
- LangChain-powered AI Agent
- Intelligent tool calling
- Real-time conversations
- Markdown support
- Syntax-highlighted code blocks
- Conversation history
- Responsive design
- Clean and scalable code structure

---

## 🛠 Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion

### AI & Agent Framework
- Google Gemini 2.5 Flash
- LangChain
- LangGraph

### Additional Libraries
- React Markdown
- React Syntax Highlighter
- Lucide React

---

## 📂 Project Structure

```text
src/
│
├── components/
│   ├── Chat/
│   ├── Sidebar/
│   ├── Message/
│   ├── InputBox/
│   └── UI/
│
├── services/
│   ├── gemini.ts
│   ├── agent.ts
│   └── tools.ts
│
├── hooks/
├── context/
├── types/
├── utils/
│
├── App.tsx
└── main.tsx
```

---

## 🧠 Agent Workflow

```text
User Input
    ↓
React Interface
    ↓
LangChain Agent
    ↓
Gemini 2.5 Flash
    ↓
Tool Selection
    ↓
Tool Execution
    ↓
Agent Reasoning
    ↓
Final Response
```

---

## 🔧 Tools

SparkAgent can be extended with custom tools.

Current tools include:

- Calculator Tool
- Current Time Tool
- Web Search Tool
- Weather Tool

The architecture allows additional tools to be added with minimal changes.

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/reshmitha-tech/sparkagent.git

cd sparkagent
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### Start Development Server

```bash
npm run dev
```

The application will start on your local development server.

---

## 📖 What I Learned

During the development of SparkAgent, I explored:

- Building AI-powered applications with React
- Integrating Google Gemini APIs
- Creating AI agents with LangChain
- Tool calling and function execution
- Managing conversational state
- Designing modern chat interfaces
- Structuring scalable TypeScript projects

---

## 🎯 Project Goals

This project demonstrates:

- AI Agent Development
- LLM Integration
- Agent Reasoning
- Tool Usage
- Modern Frontend Development
- Scalable Application Architecture

---

## 🔮 Future Improvements

- Voice Input
- Voice Responses
- File Upload Support
- PDF Analysis
- Image Understanding
- Memory System
- Retrieval-Augmented Generation (RAG)
- Multi-Agent Collaboration
- Authentication
- Persistent Chat History

---

## 📸 Screenshots

Add screenshots of the application here.

```md
![SparkAgent](./screenshots/sparkagent.png)
```

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to GitHub
5. Open a Pull Request

---


> SparkAgent — An intelligent AI Agent powered by Gemini and LangChain.
