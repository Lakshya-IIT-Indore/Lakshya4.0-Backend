import postgres from 'postgres'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

// Initialize the connection outside the handler for connection pooling
const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  prepare: false, // ✅ REQUIRED for pooler
  max: 1,
})

export { sql }