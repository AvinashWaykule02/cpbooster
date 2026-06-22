// cron/profile.cron.js

import cron from "node-cron";
import User from "../models/user.js";
import { addProfileBatchJob } from "../job-queues/profile-queue.js";

const BATCH_SIZE = 100;

const startProfileSyncCron = () => {

    cron.schedule("0 */6 * * *", async () => {

        try {

            const users =
                await User.find(
                    {},
                    "codeforcesHandle"
                );

            const handles =
                users.map(
                    user => user.codeforcesHandle
                );

            for (
                let i = 0;
                i < handles.length;
                i += BATCH_SIZE
            ) {

                const batch =
                    handles.slice(
                        i,
                        i + BATCH_SIZE
                    );

                await addProfileBatchJob(batch);
            }

            console.log(
                `${Math.ceil(handles.length / BATCH_SIZE)} batch jobs added`
            );

        } catch (error) {

            console.error(error);
        }
    });
};

export {
    startProfileSyncCron
};