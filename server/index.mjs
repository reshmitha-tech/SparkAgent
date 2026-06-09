import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ChatGoogle } from "@langchain/google";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

loadLocalEnv();

const port = Number(process.env.PORT ?? 8787);
const modelName = "gemini-2.5-flash";
const fallbackModelName = process.env.FALLBACK_MODEL ?? "gemini-2.5-flash-lite";

const calculatorTool = tool(
  async ({ expression }) => {
    if (!/^[\d\s+\-*/().,%]+$/.test(expression)) {
      return "Only arithmetic expressions are allowed.";
    }

    const normalized = expression.replaceAll("%", "/100");
    const value = Function(`"use strict"; return (${normalized})`)();
    return Number.isFinite(value) ? String(value) : "The expression did not produce a finite number.";
  },
  {
    name: "calculator",
    description: "Evaluate simple arithmetic expressions. Use this for math.",
    schema: z.object({
      expression: z.string().describe("A simple arithmetic expression, for example: (24 * 7) / 3")
    })
  }
);

const dateTimeTool = tool(
  async ({ timezone }) => {
    const now = new Date();
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: timezone || "Asia/Kolkata"
    }).format(now);
  },
  {
    name: "current_datetime",
    description: "Get the current date and time for a timezone.",
    schema: z.object({
      timezone: z.string().default("Asia/Kolkata").describe("IANA timezone, such as Asia/Kolkata or America/New_York")
    })
  }
);

const noteTool = tool(
  async ({ topic, details }) => {
    return `Working note saved for "${topic}": ${details}`;
  },
  {
    name: "working_note",
    description: "Create a short working note that can be echoed back to the user during this chat turn.",
    schema: z.object({
      topic: z.string(),
      details: z.string()
    })
  }
);

const realtimeSearchTool = tool(
  async ({ query }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey.includes("add-your")) {
      return "Real-time search is unavailable because GOOGLE_API_KEY is missing.";
    }

    try {
      return await runGroundedSearch(query, modelName, apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!shouldTryFallback(message)) throw error;
      return runGroundedSearch(query, fallbackModelName, apiKey);
    }
  },
  {
    name: "realtime_google_search",
    description:
      "Get current, real-time web information using Gemini Google Search grounding. Use this for news, prices, current events, latest versions, schedules, weather-like current facts, and anything that may have changed recently.",
    schema: z.object({
      query: z.string().describe("The current-information question to verify with Google Search.")
    })
  }
);

async function runGroundedSearch(query, selectedModel, apiKey) {
    const groundedModel = new ChatGoogle({
      model: selectedModel,
      apiKey,
      temperature: 0.1,
      tools: [
        {
          googleSearch: {
            searchTypes: {
              webSearch: {}
            }
          }
        }
      ],
      toolConfig: {
        includeServerSideToolInvocations: true
      }
    });

    const response = await groundedModel.invoke([
      new SystemMessage(
        [
          "Answer using current Google Search-grounded information.",
          "If search results are insufficient, say that clearly.",
          "Keep the answer concise and include dates, prices, versions, or source names when relevant."
        ].join(" ")
      ),
      new HumanMessage(query)
    ]);

    const answer = messageContentToText(response.content);
    const sources = extractGroundingSources(response);

    if (!sources.length) {
      return answer || "No grounded search answer was returned.";
    }

    return `${answer}\n\nSources:\n${sources.map((source, index) => `${index + 1}. ${source}`).join("\n")}`;
}

function createAgent() {
  return createAgentForModel(modelName);
}

function createFallbackAgent() {
  return createAgentForModel(fallbackModelName);
}

function createAgentForModel(selectedModel) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey.includes("add-your")) {
    throw new Error("Missing GOOGLE_API_KEY. Add it to a .env file, then restart `npm run server`.");
  }

  const llm = new ChatGoogle({
    model: selectedModel,
    apiKey,
    temperature: 0.2
  });

  return createReactAgent({
    llm,
    tools: [calculatorTool, dateTimeTool, realtimeSearchTool, noteTool],
    prompt: new SystemMessage(
      [
        "You are SparkAgent, a careful AI agent.",
        "Accuracy is more important than sounding confident.",
        "Do not invent facts, links, citations, prices, current events, private data, or tool results.",
        "Use realtime_google_search for current facts, news, prices, latest versions, public schedules, or anything likely to have changed recently.",
        "If realtime_google_search fails or does not provide enough evidence, say what you could not verify.",
        "Use the calculator tool for arithmetic and the current_datetime tool for dates or times.",
        "When you use realtime_google_search, mention that the answer is based on current search results and include any source links returned by the tool.",
        "Keep replies clear, direct, and concise."
      ].join(" ")
    )
  });
}

let agent;
let fallbackAgent;

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      model: modelName,
      fallbackModel: fallbackModelName,
      hasApiKey: Boolean(process.env.GOOGLE_API_KEY)
    });
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const input = messages
        .filter((message) => message && typeof message.content === "string")
        .map((message) => (message.role === "assistant" ? new AIMessage(message.content) : new HumanMessage(message.content)));

      if (!input.length) {
        sendJson(res, 400, { error: "Send at least one user message." });
        return;
      }

      agent ??= createAgent();
      const result = await invokeAgentWithFallback(input);
      const finalMessage = result.messages.at(-1);

      sendJson(res, 200, {
        reply: finalMessage?.content?.toString() ?? "I finished, but no text response was returned."
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      const retryAfter = getRetryAfterSeconds(message);
      const quotaError = isQuotaError(message);
      sendJson(res, quotaError ? 429 : 500, {
        error: getUserFacingError(message),
        retryAfter
      });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Gemini agent API listening on http://127.0.0.1:${port}`);
});

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        rejectBody(new Error("Request body is too large."));
      }
    });
    req.on("end", () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        rejectBody(new Error("Invalid JSON body."));
      }
    });
    req.on("error", rejectBody);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function invokeAgentWithFallback(input) {
  try {
    return await agent.invoke({ messages: input });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!shouldTryFallback(message)) throw error;

    fallbackAgent ??= createFallbackAgent();
    return fallbackAgent.invoke({ messages: input });
  }
}

function shouldTryFallback(message) {
  return message.includes("high demand") || isQuotaError(message);
}

function isQuotaError(message) {
  return /quota|rate[- ]?limit|free_tier_requests|retry in/i.test(message);
}

function getRetryAfterSeconds(message) {
  const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
  if (!retryMatch) return undefined;
  return Math.ceil(Number(retryMatch[1]));
}

function getUserFacingError(message) {
  if (message.includes("high demand")) {
    return "Gemini is temporarily overloaded. I tried the fallback model too; please try again in a moment.";
  }

  if (isQuotaError(message)) {
    const retryAfter = getRetryAfterSeconds(message);
    return retryAfter
      ? `Google Gemini free-tier quota is cooling down. Please retry in about ${retryAfter} seconds.`
      : "Google Gemini quota is exceeded for now. Please wait a bit or use a billed Gemini API plan.";
  }

  return message;
}

function messageContentToText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractGroundingSources(response) {
  const metadata = response.response_metadata ?? response.additional_kwargs ?? {};
  const groundingMetadata =
    metadata.groundingMetadata ??
    metadata.grounding_metadata ??
    metadata.candidate?.groundingMetadata ??
    metadata.candidate?.grounding_metadata;

  const chunks = groundingMetadata?.groundingChunks ?? groundingMetadata?.grounding_chunks ?? [];
  const sources = chunks
    .map((chunk) => chunk.web?.uri ?? chunk.web?.url ?? chunk.retrievedContext?.uri ?? chunk.retrieved_context?.uri)
    .filter(Boolean);

  return [...new Set(sources)];
}

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!key || process.env[key]) continue;
    process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}
