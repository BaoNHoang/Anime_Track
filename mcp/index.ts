import { loadMcpConfig } from "./config";
import { createBanimeHttpServer } from "./server";

const config = loadMcpConfig();
const server = createBanimeHttpServer(config);

server.listen(config.port, "0.0.0.0", () => {
  console.log(`Banime MCP listening on ${config.publicUrl}`);
});

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error("Could not stop Banime MCP cleanly", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
