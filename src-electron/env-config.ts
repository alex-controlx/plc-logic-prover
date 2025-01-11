import * as dotenv from "dotenv";

if (process.env.NODE_ENV === "development")
    dotenv.config({ path: `${__dirname}/../../.env.development` });
