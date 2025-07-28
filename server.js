import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { promises as fs } from "fs";
import { TwitterApi } from "twitter-api-v2";
import "dotenv/config";
import express from "express";

const server = new McpServer({
  name: "x-posting-server",
  version: "1.0.0",
});

const CACHE_FILE = "cached-tweets.json";

const app = express();

// Debug: Check if environment variables are loaded
console.log("Server: Environment variables check:");
console.log("- X_API_KEY:", process.env.X_API_KEY ? "✓ Present" : "✗ Missing");
console.log(
  "- X_API_SECRET:",
  process.env.X_API_SECRET ? "✓ Present" : "✗ Missing"
);
console.log(
  "- X_ACCESS_TOKEN:",
  process.env.X_ACCESS_TOKEN ? "✓ Present" : "✗ Missing"
);
console.log(
  "- X_ACCESS_TOKEN_SECRET:",
  process.env.X_ACCESS_TOKEN_SECRET ? "✓ Present" : "✗ Missing"
);
console.log(
  "- X_USERNAME:",
  process.env.X_USERNAME ? "✓ Present" : "✗ Missing"
);

// Initialize Twitter API client with error handling
let rwClient;
try {
  const twitterClient = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });
  rwClient = twitterClient.readWrite;
  console.log("Server: Twitter API client initialized successfully");
} catch (error) {
  console.error(
    "Server: Failed to initialize Twitter API client:",
    error.message
  );
  process.exit(1);
}

// 1. Tool: Fetch and cache tweets
server.tool(
  "fetchAndCacheTweets",
  {
    title: "Fetch and Cache X.com Posts",
    description: "Fetches the latest posts from X.com and saves them locally.",
    inputSchema: {},
  },
  async () => {
    console.log("Server: Tool 'fetchAndCacheTweets' called");

    try {
      // First, try to read existing cache
      try {
        const data = await fs.readFile(CACHE_FILE, "utf-8");
        const cachedTweets = JSON.parse(data);

        // If we have more than 20 cached tweets, return successfully
        if (cachedTweets.length > 0) {
          console.log(
            `Server: Cache has ${cachedTweets.length} tweets (>0), returning successfully without API call`
          );
          return {
            content: [
              {
                type: "text",
                text: `Cache validation successful. Found ${cachedTweets.length} cached tweets.`,
              },
            ],
          };
        } else {
          console.log(
            `Server: Cache has only ${cachedTweets.length} tweets (<= 20), fetching fresh tweets`
          );
        }
      } catch (cacheError) {
        console.log(
          "Server: No cache file found or invalid, fetching fresh tweets"
        );
      }

      // If we reach here, we need to fetch fresh tweets from Twitter API
      // Check if username is provided
      if (!process.env.X_USERNAME) {
        throw new Error("X_USERNAME not found in environment variables");
      }

      console.log(`Server: Attempting to find user: ${process.env.X_USERNAME}`);
      const user = await rwClient.v2.userByUsername(process.env.X_USERNAME);

      if (!user.data) {
        throw new Error(`User not found: ${process.env.X_USERNAME}`);
      }

      console.log(
        `Server: User found - ID: ${user.data.id}, Name: ${user.data.name}`
      );
      console.log("Server: Fetching user timeline...");

      const timeline = await rwClient.v2.userTimeline(user.data.id, {
        max_results: 20,
        "tweet.fields": ["id", "text", "created_at"],
      });

      console.log("Server: Timeline fetched successfully");

      if (!timeline.data || !timeline.data.data) {
        console.log("Server: No tweets found in timeline");
        return {
          content: [{ type: "text", text: "No tweets found for this user" }],
        };
      }

      const tweets = timeline.data.data.map((t) => ({
        id: t.id,
        text: t.text,
      }));

      console.log(`Server: Processing ${tweets.length} tweets`);
      await fs.writeFile(CACHE_FILE, JSON.stringify(tweets, null, 2));
      console.log(
        `Server: Successfully cached ${tweets.length} tweets to ${CACHE_FILE}`
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully fetched and cached ${tweets.length} tweets.`,
          },
        ],
      };
    } catch (err) {
      console.error("Server: Error in fetchAndCacheTweets:", err.message);
      console.error("Server: Full error:", err);
      return {
        content: [
          { type: "text", text: `Error fetching tweets: ${err.message}` },
        ],
      };
    }
  }
);

// 2. Resource: Recent posts
server.resource(
  "recent-posts",
  "x://user/recent-posts",
  {
    title: "Recent User Posts", // ✅ Correct title
    description: "Provides the 20 most recent posts from the local cache.", // ✅ Correct description
    mimeType: "application/json", // ✅ Resources use mimeType, not inputSchema
  },
  async (uri) => {
    console.log("Server: Resource 'recent-posts' requested");
    try {
      const data = await fs.readFile(CACHE_FILE, "utf-8");
      const all = JSON.parse(data);
      const recent = all.slice(0, 20);
      console.log(`Server: Returning ${recent.length} recent posts`);
      return { contents: [{ uri: uri.href, text: JSON.stringify(recent) }] };
    } catch (error) {
      console.log("Server: Cache file not found or invalid");
      return { contents: [] };
    }
  }
);

// 3. Prompt: Generate a new post
// 3. Prompt: Generate a new post - CORRECTED VERSION
server.registerPrompt(
  "generate-post",
  {
    title: "Generate X.com Post",
    description:
      "Generates a new post on a topic, using previous posts for style.",
    argsSchema: {
      topic: z.string().describe("Topic for the new post"),
    },
  },
  async ({ topic }) => {
    console.log(`Server: Prompt 'generate-post' called with topic: ${topic}`);
    let contextText = "No recent posts available.";
    try {
      const data = await fs.readFile(CACHE_FILE, "utf-8");
      const tweets = JSON.parse(data).slice(0, 5);
      contextText = tweets.map((t) => `- "${t.text}"`).join("\n");
      console.log(`Server: Using ${tweets.length} tweets for context`);
    } catch (e) {
      console.log("Server: No cached tweets found for context");
    }

    const systemPrompt = [
      "You are an expert social media manager.",
      "Write a short, engaging post for X.com (Twitter) in the user's style.",
      "Here are some of the user's recent posts to learn their style:",
      contextText,
      `Now write a new post on the topic: "${topic}".`,
      "Keep it under 280 characters and make it engaging.",
    ].join("\n\n");

    return {
      messages: [
        { role: "system", content: { type: "text", text: systemPrompt } },
        { role: "user", content: { type: "text", text: `Topic: ${topic}` } },
      ],
    };
  }
);

// 4. Tool: Post to X.com
server.tool(
  // ✅ Changed from server.resource to server.tool
  "postToX",
  {
    title: "Post to X.com",
    description: "Publishes the given text as a new post on X.com.",
    inputSchema: z.object({
      content: z.string().describe("Text to post"),
    }),
  },
  async ({ content }) => {
    console.log("Server: Tool 'postToX' called");
    console.log(`Server: Content to post: "${content}"`);
    try {
      const { data } = await rwClient.v2.tweet(content);
      console.log(`Server: Successfully posted tweet with ID: ${data.id}`);
      return {
        content: [
          { type: "text", text: `Successfully posted tweet ID: ${data.id}` },
        ],
      };
    } catch (err) {
      console.error("Server: Error posting tweet:", err.message);
      return {
        content: [
          { type: "text", text: `Error posting tweet: ${err.message}` },
        ],
      };
    }
  }
);

const transports = {};

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});

// // Start server
// const transport = new StdioServerTransport();
// await server.connect(transport);
// console.log(
//   "Server: X.com Posting Server is online and ready for connections."
// );
