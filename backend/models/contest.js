import mongoose from "mongoose";

const contestSchema = new mongoose.Schema({
    contestId: { type: Number, unique: true },

    name: String,
    link: String,
    startTime: Date,
    duration: Number, 

    status: {
        type: String,
        enum: ["BEFORE",  "FINISHED"],
        default: "BEFORE"
    },

    isReminderSent : {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
// Indexing for performance
contestSchema.index({ startTime: 1 });
contestSchema.index({ status: 1 });


const Contest = mongoose.model("Contest", contestSchema);
export default Contest;