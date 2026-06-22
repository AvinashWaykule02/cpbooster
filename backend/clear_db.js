import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    try {
        await mongoose.connection.db.collection("profiles").dropIndex("user_1");
        console.log("Dropped user_1 index");
    } catch(e) {
        console.error("Index drop failed", e.message);
    }
    // Also drop users to test signup fresh
    await mongoose.connection.db.collection("users").deleteMany({});
    await mongoose.connection.db.collection("profiles").deleteMany({});
    console.log("Cleared users and profiles");
    process.exit(0);
};
run();
