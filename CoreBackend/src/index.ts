import { app } from "./app";
import { config } from "./config/env";
import { logger } from "./utils/logger";

const port = config.PORT;

app.listen(port, () => {
  logger.info(`CoreBackend running on port ${port}`);
});
