// Script to make a user admin
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pixora';

async function makeAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // First, list all users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('Total users:', users.length);
    if (users.length > 0) {
      console.log('Users:', users.map(u => ({ username: u.username, email: u.email, isAdmin: u.isAdmin })));
    }
    
    // Make the first user an admin
    if (users.length > 0) {
      const result = await mongoose.connection.db.collection('users').updateOne(
        { _id: users[0]._id },
        { $set: { isAdmin: true } }
      );
      console.log('Updated:', result.modifiedCount, 'user(s) to admin');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeAdmin();
