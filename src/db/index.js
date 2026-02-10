import postgres from 'postgres'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

// Initialize the connection outside the handler for connection pooling
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  prepare: false, // MANDATORY for the Supabase Pooler
  idle_timeout: 20, // Closes connection after 20 seconds of inactivity
  max_lifetime: 60 * 30, // Max connection age is 30 minutes
})

export { sql }