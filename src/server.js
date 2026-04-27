require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

async function start() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("Supabase env is incomplete. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    app.listen(PORT, HOST, () => {
      console.log(`Server listening on ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
