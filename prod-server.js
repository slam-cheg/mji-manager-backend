import "dotenv/config";
import { app } from "./server.js";
import { ServerConfig } from "./config.js";

const { ip, port } = ServerConfig.address.production;

app.listen(port, ip, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Production server listening on http://${ip}:${port}`);
});