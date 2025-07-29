# MCP X.com Post Generator

A complete Model Context Protocol (MCP) implementation that demonstrates AI-powered social media content generation with personalized writing style matching.

## What it does

This MCP client-server system fetches your existing X.com posts, analyzes your writing style, and generates new posts on any topic that sound authentically like you wrote them.

## MCP Architecture Demo

This project showcases all four core MCP concepts:

- **Tools**: `fetchAndCacheTweets`, `postToX`
- **Resources**: `recent-posts` 
- **Prompts**: `generate-post`
- **Sampling**: Gemini AI integration

## Features

- **Style-Aware Generation**: AI analyzes your tweet history to match your writing style
- **Real-time Posting**: Direct integration with X.com API v2
- **Caching System**: Local storage of your tweets for context
- **MCP Compliant**: Full implementation of MCP protocol specifications
- **SSE Transport**: Real-time client-server communication

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Protocol**: Model Context Protocol (MCP) SDK
- **AI Model**: Google Gemini 1.5 Flash
- **Social API**: X.com API v2 (Basic tier required)
- **Validation**: Zod schemas
- **Transport**: Server-Sent Events (SSE)
- **Web Framework**: Express.js

## Prerequisites

- Node.js 18+
- X.com API Basic tier access (for posting)
- Google Gemini API key
- X.com API credentials (API key, secret, access tokens)

## Environment Setup

Create a `.env` file in your project root with the following variables:

- X_API_KEY=your_x_api_key
- X_API_SECRET=your_x_api_secret
- X_ACCESS_TOKEN=your_x_access_token
- X_ACCESS_TOKEN_SECRET=your_x_access_token_secret
- X_USERNAME=your_x_username_without_@


### Getting API Keys

**Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

**X.com API Credentials:**
1. Visit [X Developer Portal](https://developer.twitter.com/)
2. Create a new project/app
3. Set app permissions to "Read and Write"
4. Generate API keys and access tokens
5. **Important**: Upgrade to Basic tier ($100/month) for posting capabilities
6. Add your X.com username (without the @ symbol)

## Workflow

1. **Cache Phase**: Fetch and store your recent tweets locally
2. **Analysis Phase**: AI analyzes your writing patterns and style
3. **Generation Phase**: Create new content matching your voice on any topic
4. **Publishing Phase**: Post directly to X.com

## Important Notes

- X.com posting requires **paid Basic tier** API access
- Free tier only supports reading tweets
- Generated content respects 280-character limit
- Implements proper error handling and retry logic


## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create and configure your `.env` file (see Environment Setup above)
4. Start the server: `npm run server`
5. In another terminal, run the client: `npm start`

## Contributing

This is a complete MCP reference implementation. Feel free to fork and adapt for other social platforms or AI models!

## License

MIT License - See LICENSE file for details

---

*Built as a demonstration of MCP protocol capabilities and AI-powered content generation*
