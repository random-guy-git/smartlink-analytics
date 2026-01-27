const express = require('express');
const cors = require('cors');
const useragent = require('express-useragent');
const geoip = require('geoip-lite');
// Ensure you have firebase-admin v10+ installed
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(useragent.express());

// --- DATABASE CONNECT ---
// 1. SAFELY LOAD THE KEY
let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
    console.error("❌ ERROR: Could not find 'serviceAccountKey.json'.");
    console.error("-> Please ensure this file is in the SAME folder as index.js");
    process.exit(1); // Stop the app if no database key
}

// 2. INITIALIZE FIREBASE
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
console.log("✅ Main Analytics Engine Linked to Team Database!");

// --- 1. THE TRACKER ---
app.post('/track', async (req, res) => {
    try {
        const { linkId, hubId, category } = req.body; 

        // Validation: Don't crash if data is missing
        if (!linkId || !hubId) {
            return res.status(400).json({ error: "Missing linkId or hubId" });
        }
        
        // Device Detection
        const isMobile = req.useragent ? req.useragent.isMobile : false;
        const autoDevice = isMobile ? "Mobile" : "Desktop";
        const deviceType = req.body.deviceType || autoDevice;

        // IP Detection (Robust)
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        if (typeof ip === 'string' && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        // Geo Lookup (Handle Localhost)
        const geo = geoip.lookup(ip);
        const country = geo ? geo.country : "Unknown";

        const clickData = {
            linkId: linkId,
            hubId: hubId,
            category: category || "Others",
            timestamp: new Date().toISOString(),
            meta: { device: deviceType, country: country, ip: ip }
        };

        // Write to Firestore
        await db.collection('analytics_logs').add(clickData);
        
        console.log(`✅ Tracked: ${hubId} -> ${linkId} [${country}]`);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error("❌ Tracking Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- HELPER: RICH INSIGHT ENGINE ---
function generateDeepInsights(stats, periodName) {
    const suggestions = [];
    const total = stats.total;

    // 1. 🚀 Reach & Velocity (Marketing)
    if (total === 0) {
        suggestions.push("⚠️ No traffic in this period. Share your link on social media to kickstart visibility!");
    } else if (stats.trend === 'up') {
        suggestions.push(`🔥 You are trending UP! Your traffic increased compared to the previous ${periodName}. Keep posting!`);
    } else if (stats.trend === 'down') {
        suggestions.push(`📉 Traffic dropped this ${periodName}. Try reposting your top-performing link from last month.`);
    }

    // 2. ⏰ Peak Timing (Optimization)
    if (total > 5) {
        // Find peak hour
        const peakHour = Object.keys(stats.byHour).reduce((a, b) => stats.byHour[a] > stats.byHour[b] ? a : b);
        const hourInt = parseInt(peakHour);
        const timeStr = hourInt > 12 ? `${hourInt-12} PM` : `${hourInt} AM`;
        suggestions.push(`⏰ Peak Audience Time: ${timeStr}. Schedule your Instagram Stories or Tweets around this time for max reach.`);
    }

    // 3. 🎯 Category Strategy (Content)
    const soc = stats.categories['Social'] || 0;
    const aff = stats.categories['Affiliate/Product'] || 0;
    if (soc > 0 && aff === 0) {
        suggestions.push("💰 You have high Social traffic but 0 Affiliate clicks. Add a 'My Gear' or 'Recommended Tools' link to monetize this attention.");
    }

    // 4. 📱 Platform Optimization (Tech)
    const mobile = stats.devices['Mobile'] || 0;
    if (mobile > total * 0.7) {
        suggestions.push("📱 70%+ of your users are on Mobile. Ensure your links have short titles and clear emojis for better tapping.");
    }

    return suggestions;
}

// --- 2. THE DYNAMIC DASHBOARD API ---
app.get('/dashboard/:hubId', async (req, res) => {
    try {
        const hubId = req.params.hubId;
        const range = req.query.range || 'all'; // Default to All Time

        // 1. Calculate Date Range
        const now = new Date();
        let startDate = new Date(0); // Default: Beginning of time
        let periodName = "All Time";

        if (range === 'today') {
            startDate = new Date();
            startDate.setHours(0,0,0,0);
            periodName = "Today";
        } else if (range === 'yesterday') {
            startDate = new Date();
            startDate.setDate(now.getDate() - 1);
            startDate.setHours(0,0,0,0);
            // End date needed for yesterday, but for simplicity we treat "after yesterday start"
            // In prod, you'd restrict the end date too.
            periodName = "Yesterday";
        } else if (range === '7d') {
            startDate.setDate(now.getDate() - 7);
            periodName = "Last 7 Days";
        } else if (range === '30d') {
            startDate.setDate(now.getDate() - 30);
            periodName = "Last 30 Days";
        } else if (range === '90d') {
            startDate.setDate(now.getDate() - 90);
            periodName = "Last 3 Months";
        } else if (range === '1y') {
            startDate.setFullYear(now.getFullYear() - 1);
            periodName = "Last Year";
        }

        // 2. Fetch Logs (In production, use Firestore Query Filters for speed)
        const snapshot = await db.collection('analytics_logs')
                                 .where('hubId', '==', hubId)
                                 .get();

        if (snapshot.empty) return res.json({ totalVisits: 0, suggestions: [] });

        // 3. Process Data
        let stats = {
            total: 0,
            trend: 'stable', // placeholder logic
            byHour: {},
            categories: { "Social": 0, "Affiliate/Product": 0, "Brand Collab": 0, "Communities": 0, "Portfolio": 0, "Others": 0 },
            links: {},
            devices: {},
            countries: {}
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            const clickTime = new Date(data.timestamp);

            // FILTER: Only count if within range
            if (clickTime >= startDate) {
                stats.total++;

                // Hour (for Peak Time)
                const h = clickTime.getHours();
                stats.byHour[h] = (stats.byHour[h] || 0) + 1;

                // Category
                let cat = data.category || "Others";
                if (cat.includes("Social")) cat = "Social";
                else if (cat.includes("Affiliate") || cat.includes("Product")) cat = "Affiliate/Product";
                else if (cat.includes("Brand")) cat = "Brand Collab";
                else if (cat.includes("Community")) cat = "Communities";
                else if (cat.includes("Portfolio")) cat = "Portfolio";
                else cat = "Others";
                stats.categories[cat]++;

                // Links
                stats.links[data.linkId] = (stats.links[data.linkId] || 0) + 1;
                
                // Meta
                stats.devices[data.meta.device || "Unknown"] = (stats.devices[data.meta.device] || 0) + 1;
                stats.countries[data.meta.country || "Unknown"] = (stats.countries[data.meta.country] || 0) + 1;
            }
        });

        // 4. Calculate Derived Stats
        const topLink = Object.entries(stats.links).sort((a,b) => b[1] - a[1])[0] || ["None", 0];
        
        // 5. Generate Smart Insights
        const deepInsights = generateDeepInsights(stats, periodName);

        res.json({
            hubId,
            period: periodName,
            totalVisits: stats.total,
            topPerformingLink: { id: topLink[0], clicks: topLink[1] },
            categoryBreakdown: stats.categories,
            deviceBreakdown: stats.devices,
            countryBreakdown: stats.countries,
            detailedLinkStats: stats.links,
            suggestions: deepInsights
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("Server Error");
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Analytics Engine Running on Port ${PORT}`);
});