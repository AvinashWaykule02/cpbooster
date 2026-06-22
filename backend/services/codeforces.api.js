import axios from "axios";
import cfRateLimiter from "../middlewares/cf-ratelimiter.js";

const BASE_URL = "https://codeforces.com/api";

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

const request = async (method, params = {}, { retry = true } = {}) => {
    return cfRateLimiter.enqueue(async () => {
        try {
            const { data } = await client.get(`/${method}`, { params });

            if (data.status !== "OK") {
                throw new Error(data.comment || "CF API error");
            }

            return data.result;

        } catch (err) {
            if (err.response?.data?.comment) {
                throw new Error(err.response.data.comment);
            }

            if (retry && !err.response) {
                await new Promise(r => setTimeout(r, 1000));
                return request(method, params, { retry: false });
            }

            throw err;
        }
    });
};

/* ==================== CF METHODS ==================== */

export const getUserInfo = (handles) =>
    request("user.info", {
        handles: Array.isArray(handles)
            ? handles.join(";")
            : handles,
        checkHistoricHandles: false,
    });

export const getUserRating = (handle) =>
    request("user.rating", { handle });

export const getUserStatus = (handle, from = 1, count = 10000) =>
    request("user.status", { handle, from, count });

export const getContestList = (gym = false) =>
    request("contest.list", { gym });

export const getContestStandings = (contestId, params = {}) =>
    request("contest.standings", { contestId, ...params });

export const getRatingChanges = (contestId) =>
    request("contest.ratingChanges", { contestId });

export const getRatedList = (activeOnly = true, includeRetired = false) =>
    request("user.ratedList", { activeOnly, includeRetired });

export const getSystemStatus = () =>
    request("system.status");