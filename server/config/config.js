require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL;
const databaseConfig = {
  username: process.env.DB_USERNAME || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  port: process.env.DB_PORT || process.env.MYSQLPORT,
  dialect: process.env.DB_DIALECT || "mysql",
};

module.exports = {
  development: {
    ...databaseConfig,
    ...(databaseUrl ? { use_env_variable: "DATABASE_URL" } : {}),
  },
  test: {
    ...databaseConfig,
    database: databaseConfig.database ? databaseConfig.database + "_test" : undefined,
  },
  production: {
    ...databaseConfig,
    ...(databaseUrl ? { use_env_variable: "DATABASE_URL" } : {}),
  },
};
