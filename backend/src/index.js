import 'dotenv/config'
import { createServer } from 'http';
import connectToMongo from './db/index.js'
import { app } from "./app.js"
import { initializeSocket } from './socket/index.js';

const port = process.env.PORT || 8000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Make io available to the app
app.set('io', io);

connectToMongo()
.then(() => {
  app.on("error", (error) => {
    console.log("ERROR", error);
  });
  
  server.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
    console.log(`WebSocket server initialized`);
  });
})
.catch((error) => {
  console.error("MongoDB connection failed", error);
})
