import axios from "axios";

const API_URL = "http://localhost:3000/api";

let cookies = "";
const getHeaders = () => ({
    headers: {
        "Cookie": cookies
    }
});

const updateCookies = (res) => {
    if (res.headers["set-cookie"]) {
        const parsedCookies = res.headers["set-cookie"].map(c => c.split(';')[0]);
        cookies = parsedCookies.join('; ');
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const waitForLeaderboardSync = async ({ expectedSize, timeoutMs = 120000, intervalMs = 5000 }) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const res = await axios.get(`${API_URL}/leaderboard`, getHeaders());
        const leaderboard = res.data.data;
        const syncingUsers = leaderboard.filter(u => u.syncing);

        if (leaderboard.length === expectedSize && syncingUsers.length === 0) {
            return leaderboard;
        }

        const syncingHandles = syncingUsers.map(u => u.handle).join(", ") || "waiting for entries";
        console.log(`⏳ Leaderboard still syncing (${syncingHandles})...`);
        await sleep(intervalMs);
    }

    throw new Error(`Leaderboard did not finish syncing within ${timeoutMs / 1000}s`);
};

const uniqueId = Date.now();
const testUser = {
    name: "Leaderboard Tester",
    email: `lb_tester_${uniqueId}@example.com`,
    password: "password123",
    codeforcesHandle: `lb_tester_${uniqueId}`
};

const runLeaderboardTests = async () => {
    console.log("=== STARTING LEADERBOARD TESTS ===\n");

    try {
        // 1. Signup
        console.log("1. Creating test user...");
        let res = await axios.post(`${API_URL}/auth/signup`, testUser);
        console.log(`✅ Signup successful!`);
        updateCookies(res);
    } catch (err) {
        console.error("❌ Signup failed:", err.response?.data || err.message);
        return;
    }

    try {
        // 2. Add friends
        const handlesToAdd = ["tourist", "Radewoosh", "Petr"];
        for (const handle of handlesToAdd) {
            console.log(`2. Adding friend: ${handle}...`);
            let res = await axios.post(`${API_URL}/leaderboard/friends`, { handle }, getHeaders());
            console.log(`✅ Friend ${handle} added! Status: ${res.status}`);
        }
    } catch (err) {
        console.error("❌ Add friend failed:", err.response?.data || err.message);
    }

    try {
        // 3. List friends
        console.log("\n3. Testing GET /api/leaderboard/friends...");
        let res = await axios.get(`${API_URL}/leaderboard/friends`, getHeaders());
        console.log(`✅ List friends successful! Found ${res.data.data.length} friends.`);
        console.log(res.data.data);
    } catch (err) {
        console.error("❌ List friends failed:", err.response?.data || err.message);
    }

    try {
        // 4. Get Leaderboard
        console.log("\n4. Testing GET /api/leaderboard...");
        console.log("⏳ Waiting for background workers to sync Codeforces stats...");
        const leaderboard = await waitForLeaderboardSync({ expectedSize: 3 });
        console.log(`✅ Leaderboard fetched and fully synced! Size: ${leaderboard.length}`);
        console.table(leaderboard.map(u => ({ rank: u.rank, handle: u.handle, score: u.score, ratingGain: u.ratingGain, syncing: u.syncing })));
    } catch (err) {
        console.error("❌ Get leaderboard failed:", err.response?.data || err.message);
    }

    try {
        // 5. Remove a friend
        console.log("\n5. Testing DELETE /api/leaderboard/friends/Petr...");
        let res = await axios.delete(`${API_URL}/leaderboard/friends/Petr`, getHeaders());
        console.log(`✅ Friend Petr removed! Status: ${res.status}`);
    } catch (err) {
        console.error("❌ Remove friend failed:", err.response?.data || err.message);
    }

    try {
        // 6. Get Leaderboard Again
        console.log("\n6. Testing GET /api/leaderboard (after removal)...");
        let res = await axios.get(`${API_URL}/leaderboard`, getHeaders());
        console.log(`✅ Leaderboard fetched! Size: ${res.data.data.length}`);
        console.table(res.data.data.map(u => ({ rank: u.rank, handle: u.handle, score: u.score })));
    } catch (err) {
        console.error("❌ Get leaderboard failed:", err.response?.data || err.message);
    }

    console.log("\n=== LEADERBOARD TESTS COMPLETED ===");
};

runLeaderboardTests();
