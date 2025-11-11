// lib/mongodb.ts

import mongoose from "mongoose";

const url = process.env.MONGOURL!;
if (!url) {
    throw new Error("MONGOURL topilmadi");
}

const connectToDatabase = async () => {
    try {
        await mongoose.connect(url);
        console.log('db connect')
    } catch (error) {
        console.log(error)
    }
}
export default connectToDatabase;