import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

// Store cookies for authenticated requests
let cookies = "";
const getHeaders = () => {
    return {
        headers: {
            "Cookie": cookies
        }
    }
};

const updateCookies = (res) => {
    if (res.headers["set-cookie"]) {
        const parsedCookies = res.headers["set-cookie"].map(cookieStr => cookieStr.split(';')[0]);
        cookies = parsedCookies.join('; ');
    }
}

// Ensure unique email and codeforces handle for each test run to avoid conflict
const uniqueId = Date.now();
const testUser = {
    name: "Test User",
    email: `testuser_${uniqueId}@example.com`,
    password: "password123",
    codeforcesHandle: "Benq" // real handle for syncing profile
};

const runTests = async () => {
    console.log("=== STARTING API TESTS ===\n");

    try {
        // 1. Signup
        console.log("1. Testing POST /signup...");
        let res = await axios.post(`${API_URL}/signup`, testUser);
        console.log(`✅ Signup successful! Status: ${res.status}`);
        console.log(`User: ${JSON.stringify(res.data.user)}`);
        updateCookies(res);
        console.log(`Cookies set: ${cookies !== ""}\n`);
    } catch (err) {
        console.error("❌ Signup failed:", err.response?.data || err.message);
        return;
    }

    try {
        // 2. Logout (so we can test login properly)
        console.log("2. Testing POST /logout...");
        let res = await axios.post(`${API_URL}/logout`, {}, getHeaders());
        console.log(`✅ Logout successful! Status: ${res.status}\n`);
        cookies = ""; // Clear cookies on client side
    } catch (err) {
        console.error("❌ Logout failed:", err.response?.data || err.message);
    }

    try {
        // 3. Login
        console.log("3. Testing POST /login...");
        let res = await axios.post(`${API_URL}/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log(`✅ Login successful! Status: ${res.status}`);
        updateCookies(res);
        console.log(`Cookies set: ${cookies !== ""}\n`);
    } catch (err) {
        console.error("❌ Login failed:", err.response?.data || err.message);
        return;
    }

    try {
        // Wait a few seconds to let BullMQ sync the profile in the background
        console.log("⏳ Waiting 3 seconds for BullMQ worker to sync profile...");
        await new Promise(r => setTimeout(r, 3000));

        // 4. Get User Profile
        console.log("4. Testing GET /profile...");
        let res = await axios.get(`${API_URL}/profile`, getHeaders());
        console.log(`✅ Get Profile successful! Status: ${res.status}`);
        console.log(`Profile synced handle: ${res.data.user.profileData?.handle || "No Data"}`);
        console.log(`Rating: ${res.data.user.profileData?.rating || "N/A"}\n`);
    } catch (err) {
        console.error("❌ Get Profile failed:", err.response?.data || err.message);
    }

    try {
        // 5. Search Handles
        console.log("5. Testing GET /search-handles...");
        let res = await axios.get(`${API_URL}/search-handles?handle=Benq`, getHeaders());
        console.log(`✅ Search Handles successful! Status: ${res.status}`);
        console.log(`Found ${res.data.results.length} results.\n`);
    } catch (err) {
        console.error("❌ Search Handles failed:", err.response?.data || err.message);
    }



    console.log("=== ALL TESTS COMPLETED ===");
};

runTests();
