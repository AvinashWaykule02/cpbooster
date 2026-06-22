import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";

const profileQueue = new Queue("profile-sync", {
    connection: redisConnection
});

const addProfileSyncJob = async (userId, handle) => {
    await profileQueue.add(
        "profile-sync-job",
        {
            userId,
            handle
        },
        {
            attempts: 3,
            removeOnComplete: 50,
            removeOnFail: 20
        }
    );
};

const addProfileBatchJob = async (handles) => {
    await profileQueue.add(
        "profile-sync-batch-job",
        {
            handles
        },
        {
            attempts: 3,
            removeOnComplete: 50,
            removeOnFail: 20
        }
    );
};

export {
    profileQueue,
    addProfileSyncJob,
    addProfileBatchJob
};