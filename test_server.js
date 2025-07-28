import { spawn } from "child_process";

console.log("Testing server subprocess...");

const serverProcess = spawn("node", ["server.js"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
});

let serverOutput = "";
let serverError = "";

serverProcess.stdout.on("data", (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log("SERVER STDOUT:", output.trim());
});

serverProcess.stderr.on("data", (data) => {
  const error = data.toString();
  serverError += error;
  console.log("SERVER STDERR:", error.trim());
});

serverProcess.on("close", (code) => {
  console.log(`Server process exited with code ${code}`);
  if (code !== 0) {
    console.log("Server had errors:");
    console.log("STDOUT:", serverOutput);
    console.log("STDERR:", serverError);
  }
});

serverProcess.on("error", (error) => {
  console.error("Failed to start server process:", error);
});

// Send a simple test after a delay
setTimeout(() => {
  console.log("Sending test input to server...");
  serverProcess.stdin.write('{"jsonrpc": "2.0", "method": "ping", "id": 1}\n');
}, 2000);

// Kill after 10 seconds
setTimeout(() => {
  console.log("Killing server process...");
  serverProcess.kill();
}, 10000);
