// workers/profile.worker.js

import { Worker } from "bullmq";

import redisConnection from "../config/redis.js";

import {
    syncBatchHandles
} from "../services/userprofile-service.js";

const profileWorker = new Worker(

    "profile-sync",

    async (job) => {
        const { handles, userId, handle } = job.data;

        if (handles) {
            console.log(`Processing batch of ${handles.length}`);
            return await syncBatchHandles(handles);
        } else if (handle) {
            console.log(`Processing single profile sync for ${handle}`);
            // syncBatchHandles can accept an array of one
            return await syncBatchHandles([handle]);
        }
        return null;
    },

    {
        connection: redisConnection,
        concurrency: 3
    }
);

export default profileWorker;