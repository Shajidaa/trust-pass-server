import { Server } from "http";
import app from "./app";
import config from "./app/config";

const main = async () => {
  try {
    const PORT = config.port || 5000;
    app.listen(PORT, () => {
      console.log(` Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(" Error starting the server:", error);
    // process.exit(1);
  }
};

main();
