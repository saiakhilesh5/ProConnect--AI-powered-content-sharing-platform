import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"
const mongoURI = process.env.MONGO_URI;

const connectToMongo = async () => {
   try {
      const connectionInstance = await mongoose.connect(`${mongoURI}/${DB_NAME}`, {
        // ── Connection pool (handles traffic spikes without exhausting connections) ──
        maxPoolSize: 20,       // max concurrent connections in the pool
        minPoolSize: 5,        // keep alive 5 idle connections (warm pool)
        // ── Timeout tuning ────────────────────────────────────────────────────────
        serverSelectionTimeoutMS: 5000,   // fail fast if no server found
        socketTimeoutMS: 45000,           // close idle sockets after 45 s
        connectTimeoutMS: 10000,          // db connection timeout
        heartbeatFrequencyMS: 10000,      // check replica health every 10 s
        // ── Write reliability ─────────────────────────────────────────────────────
        retryWrites: true,
        retryReads: true,
      });
      console.log(`Connected to mongo !! HOST: ${connectionInstance.connection.host}`);
   } catch (error) {
      console.error("Error connecting with database", error);
      process.exit(1);
   }
}

export default connectToMongo
