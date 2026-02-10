import postgres from 'postgres'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

// Initialize the connection outside the handler for connection pooling
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1, // ✅ Vercel serverless: 1 connection per instance
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Timeout after 10s if can't connect
  prepare: false, // ✅ REQUIRED for transaction pooler
})


export { sql }