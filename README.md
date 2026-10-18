# 🔗 SecureAuth [Smart Link Hub Generator]
> **Dynamic. Context-Aware. Intelligent.**
> A next-generation link management platform that adapts content based on user context.

## 🚀 Deployment
* **Live Website:** []
* **Analytics Engine:** [https://smartlink-analytics-1.onrender.com]

---

## 💡 Problem Understanding & Approach
Existing link-in-bio tools are static—they show the same links to everyone, regardless of context. This leads to poor conversion rates and cluttered profiles.

**Our Solution:**
We built a **Smart Link Hub** that acts as an intelligent decision engine. Instead of just listing URLs, our system evaluates **Contextual Parameters** (User Device, Location, Time) in real-time to decide *which* links to display.

**Core Philosophy:**
* **Decoupled Architecture:** We separated the high-volume Analytics traffic (Node.js) from the Core Business Logic (Spring Boot) to ensure scalability.
* **Privacy-First Intelligence:** We use non-invasive headers (User-Agent, IP) to derive context without tracking personal identity.

---

## 🏗️ System Architecture & Design
We adopted a **Microservice-inspired Hybrid Architecture** to handle distinct workload types efficiently.

### 1. The Stack
| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React.js (Black/Green Theme) | Dynamic UI, Rule Configuration Dashboard, Visual Analytics. |
| **Core Backend** | Java Spring Boot | User Authentication (OAuth), Link CRUD Operations, Rule Management. |
| **Analytics Engine** | **Node.js + Express** | High-throughput event logging, Rule Validation (Device/Location), Data Aggregation. |
| **Database** | Google Firestore (NoSQL) | Shared flexible storage for unstructured logs and user profiles. |

### 2. Data Flow Diagram
```mermaid
graph TD
    User[Visitor] -->|Opens Profile| Frontend
    Frontend -->|Fetches Links| SpringBoot[Core Backend]
    
    User -->|Clicks Link| Frontend
    Frontend -->|POST /track (Async)| Node[Analytics Engine]
    Node -->|Writes Log| Firebase[(Firestore)]
    
    Owner[Hub Owner] -->|Views Dashboard| Frontend
    Frontend -->|GET /dashboard| Node

3. Scalability Decisions
Async Tracking: The analytics POST /track request is "fire-and-forget" from the frontend, ensuring the user is redirected immediately without latency.

Separation of Concerns: Heavy analytics read/write operations never block the main Spring Boot thread handling user logins.

🔄 User Flow
Onboarding: User signs up and claims a unique handle (e.g., hub.com/arun).

Hub Construction:

User adds links (Instagram, Portfolio, GitHub).

The "Smart" Step: User applies a rule (e.g., "Show App Download link ONLY to Mobile Users").

The Visitor Experience:

A visitor opens the link.

The frontend checks the rules against the visitor's context.

The visitor sees a personalized list of links.

Action & Insight:

Visitor clicks a link.

The Analytics Engine captures the device, country, and timestamp.

The Owner views the "Analytics" tab to see a breakdown: "80% of clicks came from Mobile in India."

🔌 API Documentation
A. Analytics Microservice (Node.js)
Managed by Abhay Singh

1. Track Click Ingests high-volume click data. Handles device/geo-lookup internally.

Endpoint: POST /track

Payload:

JSON
{
  "linkId": "link_123",    // Unique Link ID
  "hubId": "user_arun",    // Hub Owner ID
}
2. Get Dashboard Stats Returns aggregated performance metrics for visualization.

Endpoint: GET /dashboard/:hubId

Response:

JSON
{
  "totalVisits": 1200,
  "topPerformingLink": { "id": "link_123", "clicks": 450 },
  "deviceBreakdown": { "Mobile": 800, "Desktop": 400 },
  "countryBreakdown": { "India": 1100, "USA": 100 }
}
B. Core Backend (Spring Boot)
Managed by Team Backend [Arun, Aditya]

POST /api/auth/login: Authenticates user.

GET /api/hub/:id: Fetches the public profile configuration.

POST /api/links: Adds a new link with optional rules.

🧠 The Rule Engine (Innovation)
Our system allows rules to be "stacked" without changing code.

Flexibility: Rules are stored as JSON objects attached to links.

Evaluation: The frontend evaluates these rules locally for speed, while the backend validates them for security.

Current Supported Rules:

Device Type: Mobile vs. Desktop.

Location: Country-based visibility.

⚙️ Setup & Deployment Guide
Prerequisites
Node.js (v22.21.0)

Java JDK (17+)

Firebase Project Credentials

1. Cloning the Repo
Bash
git clone [INSERT_GITHUB_REPO_LINK]
cd smart-link-hub
2. Setting up the Analytics Engine (Microservice)
Bash
cd analytics-engine
npm install
# Place serviceAccountKey.json in the root folder
node index.js
Environment Variables: None required (uses serviceAccountKey.json).

Port: Runs on 3000 by default.

3. Setting up the Core Backend
(Instructions provided by Backend Team)

Bash
cd backend-core
./mvnw spring-boot:run
4. Running the Frontend
Bash
cd frontend-ui
npm install
npm start
🏆 Innovation & Bonus Features
Black/Green Aesthetic: Strictly adhered to the UI/UX requirements for a professional "Hacker" look.

Real-time Metadata: We don't just count clicks; we tell you who clicked (Device/Country) to help users optimize their content.

Performance: Achieved <100ms response time for link redirection by using lightweight JSON payloads.
