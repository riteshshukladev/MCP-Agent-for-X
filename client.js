import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import "dotenv/config";

const geminiSampler = async (request) => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("GEMINI_API_KEY not found in .env file.");

  const MODEL_ID = "gemini-2.5-flash-preview-05-20";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;
  const maxRetries = 2;

  const contents = request.messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    parts: [{ text: msg.content.text }],
  }));

  const requestBody = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.8,
      topK: 40,
    },
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Client: Calling Gemini API (try ${attempt + 1})`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${body}`);
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      console.log("Client: ✓ Gemini responded");
      return { content: { type: "text", text } };
    } catch (err) {
      console.error(
        `Client: Gemini attempt ${attempt + 1} failed:`,
        err.message
      );
      if (attempt === maxRetries) {
        return {
          content: { type: "text", text: "Gemini error after retries." },
        };
      }
    }
  }
};
// --------------------------------------------------

async function main() {
  console.log("Client: Starting MCP X.com posting client…");

  const client = new Client({
    name: "x-posting-client",
    version: "1.0.0",
    sampler: geminiSampler,
  });

  try {
    const transport = new SSEClientTransport(
      new URL("http://localhost:3001/sse")
    );
    await client.connect(transport);
    console.log("Client: ✓ Connected to MCP server");

    await client.listTools();

    const cacheRes = await client.callTool({
      name: "fetchAndCacheTweets",
      arguments: {},
    });
    console.log("Client:", cacheRes.content[0].text);

    const topic = "The importance of open standards in AI development";
    console.log(`\n=== Generating post on: "${topic}" ===`);
    const promptRequest = await client.getPrompt({
      name: "generate-post",
      arguments: { topic },
    });

    const generated = await geminiSampler(promptRequest);
    const newPostContent = generated.content.text.trim();
    console.log(`Client: Generated tweet:\n"${newPostContent}"`);

    const postRes = await client.callTool({
      name: "postToX",
      arguments: { content: newPostContent },
    });
    console.log("Client:", postRes.content[0].text);

    await client.disconnect();
    console.log("\nClient: ✓ Workflow completed successfully!");
  } catch (err) {
    console.error("Client: Error:", err.message);
    process.exit(1);
  }
}

main().catch(console.error);
