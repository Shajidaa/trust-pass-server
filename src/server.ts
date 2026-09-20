import { Server } from "http";
import app from "./app";
import config from "./app/config";

let server: Server;

const main = async () => {
  try {
    const PORT = config.port || 5000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error starting the server:", error);
    process.exit(1);
  }
};

main();

process.on("unhandledRejection", (err) => {
  console.error("⚠️ Unhandled Rejection detected, shutting down gracefully...", err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception detected, shutting down...", err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  if (server) {
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  }
});
