require("dotenv").config();
const knex = require("knex");

const db = knex({
  client: process.env.DB_CLIENT,
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT)
  },
  pool: { min: 0, max: 10 }
});

db.raw("SELECT 1")
  .then(() => console.log("✅ MySQL connected to", process.env.DB_NAME))
  .catch(err => console.error("❌ MySQL error:", err.message));

module.exports = db;
