import { startServer } from "./server.js"

startServer().catch((error) => {
  console.error("Failed to start realtime service:", error)
  process.exit(1)
})
