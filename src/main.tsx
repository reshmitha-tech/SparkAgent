import React, { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const promptChips = [
  { icon: "image", label: "Create an image", prompt: "Help me write a strong image prompt for a cinematic product shot." },
  { icon: "pen", label: "Write or edit", prompt: "Rewrite this paragraph to sound clearer and more natural: " },
  { icon: "globe", label: "Look something up", prompt: "What should I research before starting a small React AI agent project?" }
];

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasChat = messages.length > 0;

  const headerTitle = "SparkAgent";

  async function sendMessage(content = input.trim()) {
    if (!content || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content }))
        })
      });
      const data = await response.json();

      if (!response.ok) {
        const retryText = data.retryAfter ? ` Try again in about ${data.retryAfter} seconds.` : "";
        throw new Error(`${data.error || "The agent could not answer."}${retryText}`);
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong while contacting the agent."
        }
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendMessage();
  }

  return (
    <main className="shell">
      <aside className="rail" aria-label="Main navigation">
        <button className="rail-logo" aria-label="Home">
          <SparkIcon />
        </button>
        <nav className="rail-nav">
          <IconButton label="New chat">
            <ComposeIcon />
          </IconButton>
          <IconButton label="Search chats">
            <SearchIcon />
          </IconButton>
          <IconButton label="Pinned">
            <PinIcon />
          </IconButton>
          <IconButton label="Messages">
            <BubbleIcon />
          </IconButton>
        </nav>
        <button className="avatar" aria-label="Profile">RE</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="brand-switch">
            {headerTitle}
            <ChevronIcon />
          </button>
          <div className="top-actions">
            <button className="upgrade">
              <SparkleIcon />
              Upgrade
            </button>
            <button className="ghost-circle" aria-label="Status">
              <DottedCircleIcon />
            </button>
          </div>
        </header>

        <div className={hasChat ? "conversation active" : "conversation"}>
          {!hasChat && <h1>Where should we begin?</h1>}

          {hasChat && (
            <div className="thread" aria-live="polite">
              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-bubble">{message.content}</div>
                </article>
              ))}
              {isSending && (
                <article className="message assistant">
                  <div className="message-bubble typing">Thinking</div>
                </article>
              )}
            </div>
          )}

          <form className="composer" onSubmit={handleSubmit}>
            <button className="plus" type="button" aria-label="Attach">
              <PlusIcon />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask anything"
              aria-label="Ask anything"
              rows={1}
            />
            <button className="mic" type="button" aria-label="Voice input">
              <MicIcon />
            </button>
            <button className="voice" type="submit" aria-label="Send" disabled={!input.trim() || isSending}>
              <VoiceIcon />
            </button>
          </form>

          {!hasChat && (
            <div className="quick-actions">
              {promptChips.map((chip) => (
                <button
                  className="chip"
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setInput(chip.prompt);
                    inputRef.current?.focus();
                  }}
                >
                  <ChipIcon name={chip.icon} />
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button className="icon-button" aria-label={label} title={label}>
      {children}
    </button>
  );
}

function ChipIcon({ name }: { name: string }) {
  if (name === "image") return <ImageIcon />;
  if (name === "pen") return <PenIcon />;
  return <GlobeIcon />;
}

function SparkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 14.8 9l5.7 3-5.7 3L12 20.5 9.2 15l-5.7-3 5.7-3L12 3.5Z" /></svg>;
}

function ComposeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h14" /><path d="M6 15.5 16.8 4.7a2.1 2.1 0 0 1 3 3L9 18.5H6v-3Z" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 4 6 6-3 1-5 5v4l-2 2-3.5-3.5L3 15l2-2h4l5-5 1-4Z" /></svg>;
}

function BubbleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.5a8 8 0 1 1 3.2 2.2L4 21l1-2.5Z" /></svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>;
}

function SparkleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /><path d="m5.8 5.8 4.2 4.2M14 14l4.2 4.2M18.2 5.8 14 10M10 14l-4.2 4.2" /></svg>;
}

function DottedCircleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 1 9 9" /><path d="M12 21a9 9 0 0 1-9-9" /><path d="M4.6 6.8a9 9 0 0 1 2.2-2.2" /><path d="M17.2 19.4a9 9 0 0 1-2.6 1.2" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function MicIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>;
}

function VoiceIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9v6M10 5v14M14 8v8M18 10v4" /></svg>;
}

function ImageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="3" /><path d="m7 16 4-4 3 3 2-2 2 3" /><circle cx="9" cy="9" r="1.5" /></svg>;
}

function PenIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h4L19.4 8.6a2.5 2.5 0 0 0-4-4L5 15v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
}

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></svg>;
}

createRoot(document.getElementById("root")!).render(<App />);
