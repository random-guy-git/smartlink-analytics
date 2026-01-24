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

// --- DATABASE SETUP ---
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();
console.log("✅ Smart Link Analytics Engine Ready!");

// --- 1. THE TRACKER (WRITING DATA) ---
app.post('/track', async (req, res) => {
    try {
        const { linkId } = req.body;
        if (!linkId) return res.status(400).send("Error: Link ID is missing");

        // Auto-detect Intelligence
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const geo = geoip.lookup(ip);
        const country = geo ? geo.country : "Unknown";
        
        const isMobile = req.useragent.isMobile;
        const autoDetectedType = isMobile ? "Mobile" : "Desktop";
        
        // This '||' means: Use req.body.deviceType IF it exists, OR use autoDetectedType
        const deviceType = req.body.deviceType || autoDetectedType;

        const clickData = {
            linkId: linkId,
            timestamp: FieldValue.serverTimestamp(),
            meta: { device: deviceType, country: country, browser: browser, ip: ip }
        };

        await db.collection('analytics_logs').add(clickData);
        console.log(`✅ Tracked: ${linkId} | ${deviceType} | ${country}`);
        res.status(200).send({ success: true });

    } catch (error) {
        console.error("Tracking Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// --- 2. THE DASHBOARD API (READING DATA) ---
// This enables the "Visualization" and "Performance Monitoring" 
app.get('/analytics/:linkId', async (req, res) => {
    try {
        const targetLinkId = req.params.linkId;

        // A. FETCH RAW DATA FROM FIREBASE
        // "Give me all logs where linkId matches the one requested"
        const snapshot = await db.collection('analytics_logs')
                                 .where('linkId', '==', targetLinkId)
                                 .get();

        if (snapshot.empty) {
            return res.json({ message: "No clicks found yet", totalClicks: 0 });
        }

        // B. CALCULATE THE BREAKDOWNS (The Intelligence Part)
        let totalClicks = 0;
        let deviceStats = { Mobile: 0, Desktop: 0 };
        let countryStats = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            totalClicks++;

            // 1. Count Devices (For Device Rules)
            const device = data.meta.device || "Unknown";
            if (deviceStats[device] !== undefined) {
                deviceStats[device]++;
            } else {
                deviceStats[device] = 1; // Handle unexpected devices
            }

            // 2. Count Countries (For Location Rules)
            const country = data.meta.country || "Unknown";
            // If country exists in our list, add 1. If not, start at 1.
            countryStats[country] = (countryStats[country] || 0) + 1;
        });

        // C. SEND THE REPORT CARD
        res.json({
            linkId: targetLinkId,
            totalClicks: totalClicks, // "Track individual link click counts" [cite: 142]
            insights: {
                deviceBreakdown: deviceStats,
                countryBreakdown: countryStats
            }
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).send("Could not fetch analytics");
    }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});