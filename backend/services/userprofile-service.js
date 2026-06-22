import Profile from "../models/userprofile.js";
import { getUserInfo } from "./codeforces.api.js";

/* ==================== MAPPER ==================== */

const mapUser = (u) => ({
    firstName: u.firstName,
    lastName: u.lastName,
    country: u.country,
    city: u.city,
    organization: u.organization,
    avatar: u.avatar,
    titlePhoto: u.titlePhoto,
    rating: u.rating ?? 0,
    maxRating: u.maxRating ?? 0,
    rank: u.rank,
    maxRank: u.maxRank,
    contribution: u.contribution ?? 0,
    friendOfCount: u.friendOfCount ?? 0,
    lastOnlineTimeSeconds: u.lastOnlineTimeSeconds,
    registrationTimeSeconds: u.registrationTimeSeconds,
    lastSyncAt: new Date(),
});

/* ==================== SYNC PROFILE ==================== */

export const syncUserProfile = async (handle, userId = null) => {
    if (!handle?.trim()) {
        throw new Error("Handle is required");
    }

    const [cfUser] = await getUserInfo([handle.trim()]);

    if (!cfUser) {
        throw new Error(`Handle not found: ${handle}`);
    }

    const data = mapUser(cfUser);

    return Profile.findOneAndUpdate(
        { handle: cfUser.handle },
        {
            $set: {
                handle: cfUser.handle,
                ...data,
            },
            ...(userId ? { user: userId } : {}),
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
};

/* ==================== LIVE LOOKUP ==================== */

export const getLiveProfile = async (handle) => {
    if (!handle?.trim()) {
        throw new Error("Handle is required");
    }

    const [cfUser] = await getUserInfo([handle.trim()]);

    if (!cfUser) return null;

    return {
        handle: cfUser.handle,
        ...mapUser(cfUser),
    };
};

/* ==================== BATCH SYNC ==================== */

export const syncBatchHandles = async (handles) => {
    if (!handles || handles.length === 0) return [];

    const cfUsers = await getUserInfo(handles);
    
    if (!cfUsers || cfUsers.length === 0) return [];

    const operations = cfUsers.map(cfUser => ({
        updateOne: {
            filter: { handle: cfUser.handle },
            update: {
                $set: {
                    handle: cfUser.handle,
                    ...mapUser(cfUser)
                }
            },
            upsert: true
        }
    }));

    await Profile.bulkWrite(operations);
    return cfUsers.length;
};

/* ==================== CONTROLLER HELPERS ==================== */

export const getCodeforcesProfile = async (handle) => {
    let profile = await Profile.findOne({ handle });
    if (!profile) {
        profile = await syncUserProfile(handle);
    }
    return profile;
};

export const searchCodeforcesHandles = async (query) => {
    return Profile.find({
        handle: { $regex: query, $options: "i" }
    }).limit(10).select("handle avatar rating rank");
};