require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const Application = require('./models/Application');
const Admin = require('./models/Admin');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   MIDDLEWARE
   ========================= */
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman, curl, or mobile apps)
        if (!origin) return callback(null, true);

        // Allow any localhost on typical frontend ports
        // Allow any request from the deployed frontend
        const allowedOrigins = [
            "https://vehical-insurance-backend-026c.onrender.com",
            "https://motor-insurance-frontend.onrender.com"
        ];

        // Check if origin is allowed
        // 🔒 STRICT SECURITY: "null" (file://) is NOT allowed.
        // Must match allowedOrigins array or be a deployed Render app.
        const isAllowedDocs = origin && origin.includes("onrender.com");

        if (allowedOrigins.includes(origin) || isAllowedDocs) {
            callback(null, true);
        } else {
            console.log('⚠️  CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: "insure.sid",
    secret: "insure-secret-key-super-secure",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

/* =========================
   DATABASE
   ========================= */
const MONGO_URI = "mongodb+srv://husenhfmca25_db_user:LW%40LTpD5Z2PchG5@cluster0.jyl2qbb.mongodb.net/insurance?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ MongoDB connected");

        // Seed Admin
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            await Admin.create({ username: 'admin', password: 'admin123' });
            console.log("👤 Default admin created (admin/admin123)");
        }
    })
    .catch(err => console.error("❌ MongoDB connection error:", err));

/* =========================
   AUTH MIDDLEWARE
   ========================= */
function requireAdmin(req, res, next) {
    // Check Session (Cookies) OR Token (Header for file:// support)
    const authHeader = req.headers['authorization'];

    if (req.session.admin || authHeader === 'Bearer demo-admin-token') {
        next();
    } else {
        res.sendStatus(401);
    }
}

/* =========================
   ROUTES
   ========================= */

// 1. Submit Application
app.post("/apply", async (req, res) => {
    try {
        const {
            name, phone, email,
            vehicle_type, make, model, year, registration_number
        } = req.body;

        if (!name || !phone || !email || !vehicle_type || !make || !model || !year) {
            return res.status(400).json({
                success: false,
                message: "All fields except registration number are required"
            });
        }

        const newApp = new Application(req.body);
        const savedApp = await newApp.save();

        console.log(`✅ New application submitted - ID: ${savedApp._id}, Name: ${name}`);
        res.json({ success: true, id: savedApp._id });

    } catch (err) {
        console.error("❌ Submission error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Admin Login
app.post("/admin/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username, password });

        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        req.session.admin = true;
        console.log(`✅ Admin logged in: ${username}`);
        res.json({ success: true, token: 'demo-admin-token' });

    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Check Session
app.get("/admin/check", (req, res) => {
    const authHeader = req.headers['authorization'];
    if (req.session.admin || authHeader === 'Bearer demo-admin-token') {
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
});

// 4. Logout
app.get("/admin/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.error("❌ Logout error:", err);
        res.clearCookie("insure.sid");
        res.sendStatus(200);
    });
});

// 5. Get All Applications (Protected)
app.get("/admin/data", requireAdmin, async (req, res) => {
    try {
        const apps = await Application.find().sort({ created_at: -1 });
        res.json(apps.map(app => ({
            ...app.toObject(),
            id: app._id // Map _id to id for frontend compatibility if needed
        })));
    } catch (err) {
        console.error("❌ Data fetch error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

/* =========================
   START SERVER
   ========================= */
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚗 INSURE - Backend (Node + Mongo)       ║
║   ✅ Server running on port ${PORT}            ║
║   📝 Admin credentials:                    ║
║      Username: admin                       ║
║      Password: admin123                    ║
╚════════════════════════════════════════════╝
    `);
});
