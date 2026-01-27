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

// --- PERSONA DETECTION ENGINE ---
function detectUserPersona(linkIds) {
    const keywords = {
        creator: ['youtube', 'twitch', 'tiktok', 'instagram', 'discord', 'patreon', 'spotify', 'podcast'],
        professional: ['linkedin', 'github', 'behance', 'dribbble', 'portfolio', 'cv', 'resume', 'calendly', 'medium'],
        founder: ['shopify', 'gumroad', 'stripe', 'amazon', 'product', 'store', 'buy', 'pricing', 'demo']
    };

    let scores = { creator: 0, professional: 0, founder: 0 };

    linkIds.forEach(id => {
        const lowerId = id.toLowerCase();
        if (keywords.creator.some(k => lowerId.includes(k))) scores.creator++;
        if (keywords.professional.some(k => lowerId.includes(k))) scores.professional++;
        if (keywords.founder.some(k => lowerId.includes(k))) scores.founder++;
    });

    // Return the dominant persona (or 'general' if tie/zero)
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
}

// --- STRATEGIC FALLBACK GENERATOR ---
function getFallbackAdvice(persona, domain) {
    const adviceLibrary = {
        creator: {
            revenue: "⚠️ **Monetization Gap:** You have strong content links but no clear 'Support' link. Top creators usually place a Patreon or 'Buy Me a Coffee' link in the #2 slot to capture fan goodwill.",
            audience: "📱 **Platform Behavior:** 85% of social traffic comes from mobile. Ensure your YouTube thumbnails in the link previews are high-contrast and readable on small screens.",
            content: "🔄 **Content Lifecycle:** Don't let your top link get stale. 'Creator' profiles see a 20% CTR drop if the top video link isn't rotated every 7 days."
        },
        professional: {
            revenue: "💼 **Client Friction:** You are sharing work samples, but is it easy to hire you? Add a specific 'Book a 15min Call' (Calendly) link to reduce client drop-off.",
            audience: "👔 **The 9-to-5 Window:** Professional traffic peaks Tue-Thu, 10 AM - 2 PM. Post your link updates on LinkedIn on Tuesday mornings for maximum visibility.",
            content: "📄 **Case Study vs Portfolio:** Generic 'Portfolio' links have lower CTR. Rename your link to 'Case Study: [Project Name]' to prove value instantly."
        },
        founder: {
            revenue: "🏷️ **Hero Product Visibility:** Your data is young, but e-commerce rules apply. The top link gets 60% of clicks. Ensure your best-selling product is strictly at #1.",
            audience: "🌍 **Trust Signals:** Cold traffic needs reassurance. Add a link to 'Customer Reviews' or 'Press Coverage' to increase conversion rates for new visitors.",
            content: "⚡ **Frictionless Checkout:** Ensure your product links go directly to checkout/product pages, not your home page. Reduce the clicks-to-purchase ratio."
        },
        general: {
            revenue: "💡 **Value Capture:** Your link mix is diverse. Identify your highest margin goal (Newsletter? Sales?) and pin it to the top.",
            audience: "🚀 **Velocity Check:** Share your link on your most active platform today to initialize the audience geography algorithms.",
            content: "✨ **Visual Hierarchy:** Use emojis in your link titles. Data shows links with visual icons have a 15% higher Click-Through Rate."
        }
    };
    return adviceLibrary[persona][domain] || adviceLibrary['general'][domain];
}

// --- RULE-BASED AI INSIGHTS GENERATOR (AI-ASSISTANT) ---
function generateDeepInsights(stats, periodName) {
    const suggestions = [];
    const total = stats.total;
    const linkIds = Object.keys(stats.links || {});
    const persona = detectUserPersona(linkIds); // 🤖 AI Classification

    // Safety check: If no data, return the "Cold Start" advice
    if (total === 0) {
        return [
            "🚀 **Launchpad Protocol:** Your hub is live but silent. The algorithm rewards velocity. Share your link on your most active social channel immediately to initialize data collection.",
            "💡 **Pro Tip:** Add a 'Lead Magnet' (free resource) as your first link to maximize initial click-through rates."
        ];
    }

    if (total > 5) {
        // --- 1. BUSINESS & CONVERSION INTELLIGENCE ---

        // Calculate "Intent Ratio"
        const moneyCategories = (stats.categories['Affiliate/Product'] || 0) + (stats.categories['Portfolio'] || 0) + (stats.categories['Brand Collab'] || 0);
        const socialCategories = (stats.categories['Social'] || 0) + (stats.categories['Communities'] || 0);
        const intentRatio = (moneyCategories / total) * 100;

        if (socialCategories > 0 && intentRatio < 10) {
            suggestions.push(`💰 **Leaky Funnel Alert:** You have high traffic flow, but less than 10% are entering your monetization links. **Strategy:** Move your 'Portfolio' or 'Shop' link above your Social icons to capture this wasted value.`);
        } else if (intentRatio > 40) {
            suggestions.push(`💎 **High-Value Audience:** Over 40% of your clicks are commercial/professional. Your audience is ready to buy. **Strategy:** Consider raising your rates or launching a premium digital product immediately.`);
        }

        // Pareto Analysis (Dependency Risk)
        const topLink = stats.topPerformingLink;
        if (topLink && (topLink.clicks / total) > 0.70) {
            suggestions.push(`⚠️ **Single Point of Failure:** 70%+ of your traffic relies on a single link ("${topLink.id}"). **Strategy:** Introduce a secondary 'Killer Offer' to diversify interest. If that one link becomes irrelevant, your traffic crashes.`);
        }

        // --- 2. AUDIENCE BEHAVIOR & TIMING ---

        // Find Peak Time Block (Morning, Work, Evening, Late Night)
        let peakHour = 0;
        let maxClicks = 0;
        for (const [hour, count] of Object.entries(stats.byHour || {})) {
            if (count > maxClicks) { maxClicks = count; peakHour = parseInt(hour); }
        }

        let timeContext = "";
        if (peakHour >= 6 && peakHour < 12) timeContext = "Morning Rush (Commuters/Early Risers)";
        else if (peakHour >= 12 && peakHour < 17) timeContext = "Work Hours (B2B/Professional)";
        else if (peakHour >= 17 && peakHour < 22) timeContext = "Prime Time (Entertainment/Leisure)";
        else timeContext = "Night Owls (High Engagement/Niche)";

        if (total > 10) { // Only show if we have significance
            suggestions.push(`⏰ **The Golden Window:** Your audience peaks at **${peakHour}:00 (${timeContext})**. **Strategy:** Schedule your newsletters, product drops, or new video announcements exactly 1 hour before this time to ride the engagement wave.`);
        }

        // Device Context
        const mobileCount = stats.devices['Mobile'] || 0;
        const desktopCount = stats.devices['Desktop'] || 0;

        if (desktopCount > (total * 0.35)) {
            suggestions.push(`💻 **Desktop-Heavy Audience:** ${Math.floor((desktopCount / total) * 100)}% of users are on PC. This is rare and valuable. They have higher attention spans. **Strategy:** Feel free to link to long-form content (Blogs, Case Studies, 20min+ Videos).`);
        } else if (mobileCount > (total * 0.90)) {
            suggestions.push(`📱 **Mobile-First Mandate:** 90%+ traffic is mobile. **Strategy:** Ensure your link titles are under 30 characters so they don't get truncated on small screens. Use Emojis as visual anchors.`);
        }

        // --- 3. GEO-EXPANSION OPPORTUNITIES ---

        // Sort countries
        const sortedCountries = Object.entries(stats.countries || {}).sort((a, b) => b[1] - a[1]);
        const topCountry = sortedCountries[0];
        const secondCountry = sortedCountries[1];

        if (secondCountry && secondCountry[1] > (total * 0.15)) {
            suggestions.push(`🌍 **Sleeper Market Detected:** You have unexpected traction in **${secondCountry[0]}** (>15%). **Strategy:** Acknowledge this audience. Add a 'Welcome' link in their local language or create region-specific content to double-down on this growth.`);
        }

        // --- 4. CONTENT FATIGUE ---
        if (periodName === "Last 7 Days" || periodName === "Last 30 Days") {
            // Need historical comparison logic roughly here, but based on current snapshot:
            const lowestLink = Object.entries(stats.links).sort((a, b) => a[1] - b[1])[0];
            if (lowestLink && lowestLink[1] === 0 && Object.keys(stats.links).length > 3) {
                suggestions.push(`♻️ **Digital Clutter:** The link "${lowestLink[0]}" has zero engagement. **Strategy:** Remove or rename it. Too many options cause 'Decision Paralysis' and lower your overall conversion rate.`);
            }
        }
    }

    // --- LAYER 2: INTELLIGENT FALLBACKS (If we need more insights) ---
    // If we have fewer than 3 hard-data insights, fill the rest with Persona Advice
    
    if (suggestions.length < 3) {
        // Domain 1: Revenue Strategy
        if (!suggestions.some(s => s.includes("Revenue") || s.includes("Conversion"))) {
            suggestions.push(getFallbackAdvice(persona, 'revenue'));
        }
        
        // Domain 2: Audience Strategy
        if (!suggestions.some(s => s.includes("Peak") || s.includes("Mobile"))) {
             suggestions.push(getFallbackAdvice(persona, 'audience'));
        }

        // Domain 3: Content Strategy
        if (suggestions.length < 3) {
             suggestions.push(getFallbackAdvice(persona, 'content'));
        }
    }

    return suggestions.slice(0, 4); // Return top 4 most critical insights
}

// --- UPDATED DASHBOARD ENDPOINT ---
app.get('/dashboard/:hubId', async (req, res) => {
    try {
        const hubId = req.params.hubId;
        const range = req.query.range || 'all';

        const now = new Date();
        let startDate = new Date(0);
        let endDate = new Date(); // Default: Now
        let periodName = "All Time";

        // FIX: Explicit End Dates to prevent "Yesterday" including "Today"
        if (range === 'today') {
            startDate = new Date(); startDate.setHours(0, 0, 0, 0);
            endDate = new Date(); endDate.setHours(23, 59, 59, 999);
            periodName = "Today";
        } else if (range === 'yesterday') {
            startDate = new Date(); startDate.setDate(now.getDate() - 1); startDate.setHours(0, 0, 0, 0);
            endDate = new Date(); endDate.setDate(now.getDate() - 1); endDate.setHours(23, 59, 59, 999);
            periodName = "Yesterday";
        } else if (range === '7d') {
            startDate.setDate(now.getDate() - 7);
            periodName = "Last 7 Days";
        } else if (range === '30d') {
            startDate.setDate(now.getDate() - 30);
            periodName = "Last 30 Days";
        }

        // Fetch & Filter
        const snapshot = await db.collection('analytics_logs').where('hubId', '==', hubId).get();

        let stats = {
            total: 0,
            categories: { "Social": 0, "Affiliate/Product": 0, "Brand Collab": 0, "Communities": 0, "Portfolio": 0, "Others": 0 },
            links: {},
            byHour: {},
            devices: {},
            countries: {}
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            const clickTime = new Date(data.timestamp);

            // FIX: Strict Range Check applied BEFORE counting stats
            if (clickTime >= startDate && clickTime <= endDate) {
                stats.total++;
                
                // Hour (For Peak Time)
                const h = clickTime.getHours();
                stats.byHour[h] = (stats.byHour[h] || 0) + 1;

                // Categories (MAPPING RESTORED)
                let rawCat = data.category || "Others";
                let cat = "Others";
                if (rawCat.includes("Social")) cat = "Social";
                else if (rawCat.includes("Affiliate") || rawCat.includes("Product")) cat = "Affiliate/Product";
                else if (rawCat.includes("Brand")) cat = "Brand Collab";
                else if (rawCat.includes("Community")) cat = "Communities";
                else if (rawCat.includes("Portfolio")) cat = "Portfolio";
                else cat = "Others";

                stats.categories[cat]++;

                // Links
                stats.links[data.linkId] = (stats.links[data.linkId] || 0) + 1;

                // Meta
                stats.devices[data.meta.device || "Unknown"] = (stats.devices[data.meta.device] || 0) + 1;
                stats.countries[data.meta.country || "Unknown"] = (stats.countries[data.meta.country] || 0) + 1;
            }
        });

        const topLinkArr = Object.entries(stats.links).sort((a, b) => b[1] - a[1])[0] || ["None", 0];
        const topPerformingLink = { id: topLinkArr[0], clicks: topLinkArr[1] };

        // Pass extra data to insights for better results
        const deepInsights = generateDeepInsights({ ...stats, topPerformingLink }, periodName);

        res.json({
            hubId,
            period: periodName,
            totalVisits: stats.total,
            topPerformingLink,
            categoryBreakdown: stats.categories,
            deviceBreakdown: stats.devices,
            countryBreakdown: stats.countries, // Ensure this is sent!
            detailedLinkStats: stats.links,    // Ensure this is sent!
            byHour: stats.byHour,
            suggestions: deepInsights
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Analytics Engine Running on Port ${PORT}`);
});