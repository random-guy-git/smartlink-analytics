const express = require('express');
const cors = require('cors');
const useragent = require('express-useragent');
const geoip = require('geoip-lite');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const app = express();
app.use(cors());
app.use(express.json());
app.use(useragent.express());

// --- DATABASE CONNECT ---
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
console.log("✅ Main Analytics Engine Linked to Team Database!");

// --- 1. THE TRACKER (Updated for Hubs) ---
// We now require 'hubId' so we can track "Total visits to the link hub" 
app.post('/track', async (req, res) => {
    try {
        // We need BOTH IDs now
        const { linkId, hubId } = req.body; 
        
        // Manual override for testing (Postman)
        const isMobile = req.useragent.isMobile;
        const autoDevice = isMobile ? "Mobile" : "Desktop";
        const deviceType = req.body.deviceType || autoDevice;

        // Auto-detect Location
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const geo = geoip.lookup(ip);
        const country = geo ? geo.country : "Unknown";

        const clickData = {
            linkId: linkId,
            hubId: hubId, // CRITICAL: Links this click to a specific user profile
            timestamp: FieldValue.serverTimestamp(),
            meta: { device: deviceType, country: country, ip: ip }
        };

        // Save to Shared Database
        await db.collection('analytics_logs').add(clickData);
        console.log(`✅ Tracked Click: Hub ${hubId} -> Link ${linkId} (${deviceType})`);
        res.status(200).send({ success: true });

    } catch (error) {
        console.error("Tracking Error:", error);
        res.status(500).send("Error tracking click");
    }
});

// --- 2. THE MASTER DASHBOARD (The "Main Work") ---
// This calculates "Top Performing Links" and "Total Visits" [cite: 141, 143]
app.get('/dashboard/:hubId', async (req, res) => {
    try {
        const hubId = req.params.hubId;

        // Fetch ALL clicks for this user's profile
        const snapshot = await db.collection('analytics_logs')
                                 .where('hubId', '==', hubId)
                                 .get();

        if (snapshot.empty) {
            return res.json({ totalVisits: 0, topLink: "None" });
        }

        // --- INTELLIGENCE CALCULATION ---
        let totalVisits = 0;
        let linkCounts = {}; // Stores counts like { "insta": 5, "github": 10 }
        let deviceStats = { Mobile: 0, Desktop: 0 };

        snapshot.forEach(doc => {
            const data = doc.data();
            totalVisits++;

            // 1. Count per Link (To find the Winner)
            const link = data.linkId;
            linkCounts[link] = (linkCounts[link] || 0) + 1;

            // 2. Count Devices (To prove Rules work)
            const device = data.meta.device || "Unknown";
            deviceStats[device] = (deviceStats[device] || 0) + 1;
        });

        // 3. Find Top Performing Link 
        let topLink = "";
        let maxClicks = 0;
        for (const [link, count] of Object.entries(linkCounts)) {
            if (count > maxClicks) {
                maxClicks = count;
                topLink = link;
            }
        }

        // Send the "Structured Data Output" [cite: 144]
        res.json({
            hubId: hubId,
            totalVisits: totalVisits,
            topPerformingLink: {
                id: topLink,
                clicks: maxClicks
            },
            deviceBreakdown: deviceStats,
            detailedLinkStats: linkCounts
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("Could not generate dashboard");
    }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Main Work Started on Port ${PORT}`);
});