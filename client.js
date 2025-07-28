import { GoogleGenAI } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import "dotenv/config";

// Debug: Check if Gemini API key is loaded
console.log(
  "Client: Gemini API Key:",
  process.env.GEMINI_API_KEY ? "✓ Present" : "✗ Missing"
);

const geminiSampler = async (request) => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY not found in .env file.");
  }

  const MODEL_ID = "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;
  const maxRetries = 2;

  const contents = request.messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    parts: [{ text: msg.content.text }],
  }));

  const requestBody = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.8,
      topK: 40,
    },
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    console.log(
      `Client: Calling Gemini API - Attempt ${attempt + 1}/${maxRetries + 1}`
    );
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API call failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;

      console.log("Client: Got response from Gemini");
      return { content: { type: "text", text: responseText } };
    } catch (error) {
      console.error(`Client: Attempt ${attempt + 1} failed:`, error.message);
      if (attempt === maxRetries) {
        return {
          content: {
            type: "text",
            text: "Error: AI service failed after multiple retries.",
          },
        };
      }
    }
  }
};

async function main() {
  console.log("Client: Starting MCP X.com posting client...");

  const client = new Client({
    name: "x-posting-client",
    version: "1.0.0",
    sampler: geminiSampler,
  });

  try {
    console.log("Client: Connecting to server...");

    // Connect to MCP server
    const transport = new SSEClientTransport(
      new URL("http://localhost:3001/sse")
    );
    await client.connect(transport);
    console.log("Client: ✓ Connected to MCP server");

    // Get available tools from server
    const tools = await client.listTools();
    console.log("Client: ✓ Fetched available tools from server");

    // console.log(
    //   "Client: Available tools:",
    //   tools.map((t) => t.name).join(", ")
    // );

    console.log("\n=== STEP 1/3: Caching latest posts from X.com ===");
    const cacheResult = await client.callTool({
      name: "fetchAndCacheTweets",
      arguments: {},
    });
    console.log("Client: Cache result:", cacheResult.content[0].text);

    console.log("\n=== STEP 2/3: Generating a new post ===");
    const topic = "The importance of open standards in AI development";
    console.log(`Client: Topic: ${topic}`);

    const promptRequest = await client.getPrompt({
      name: "generate-post",
      arguments: { topic },
    });
    console.log("Client: Got prompt from server, calling Gemini...");

    const generatedResult = await client.createMessage(promptRequest);
    const newPostContent = generatedResult.content.text;
    console.log(`Client: Generated content:\n"${newPostContent}"`);

    console.log("\n=== STEP 3/3: Publishing the new post ===");
    const postResult = await client.callTool({
      name: "postToX",
      arguments: {
        content: newPostContent,
      },
    });
    console.log(`Client: Post result: ${postResult.content[0].text}`);

    await client.disconnect();
    console.log("\nClient: ✓ Workflow completed successfully!");
  } catch (error) {
    console.error("Client: Error during execution:", error.message);
    console.error("Client: Full error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
