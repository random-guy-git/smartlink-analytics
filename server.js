const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let analyticsLogs = [
    { linkId: "arun-insta", timestamp: "2026-01-24T10:00:00Z", device: "Mobile" },
    { linkId: "arun-insta", timestamp: "2026-01-24T10:05:00Z", device: "Desktop" },
    { linkId: "my-portfolio", timestamp: "2026-01-24T11:00:00Z", device: "Mobile" }
];

console.log("Dummy Database Initialized with " + analyticsLogs.length + " entries.");

// ROUTE 1: TRACKING

app.post('/track', (req, res) => {
    const data = req.body;

    // 1. Validate input (Basic check)
    if (!data.linkId) {
        return res.status(400).json({ error: "Missing linkId" });
    }

    // 2. Create the log entry
    const newLog = {
        linkId: data.linkId,
        timestamp: new Date().toISOString(), // Current time
        device: data.device || "Unknown",
        ip: "127.0.0.1" // Mock IP for now
    };

    // 3. Save to Dummy DB (Later, this line changes to Firebase code)
    analyticsLogs.push(newLog);

    console.log(`✅ Click tracked for: ${newLog.linkId}`);
    res.status(200).json({ message: "Click tracked successfully", data: newLog });
});

// ROUTE 2: ANALYTICS
app.get('/stats/:linkId', (req, res) => {
    const targetLinkId = req.params.linkId;

    // 1. Filter our dummy list to find matches
    const relevantLogs = analyticsLogs.filter(log => log.linkId === targetLinkId);

    // 2. Calculate Stats (Basic Math)
    const totalClicks = relevantLogs.length;
    
    // Example: Count how many were Mobile vs Desktop
    const mobileClicks = relevantLogs.filter(log => log.device === "Mobile").length;
    const desktopClicks = relevantLogs.filter(log => log.device === "Desktop").length;

    // 3. Send response
    res.json({
        linkId: targetLinkId,
        totalClicks: totalClicks,
        breakdown: {
            mobile: mobileClicks,
            desktop: desktopClicks
        }
    });
});

// START SERVER

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Analytics Server running on port ${PORT}`);
});