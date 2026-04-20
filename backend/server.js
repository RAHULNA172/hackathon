const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running!' });
});

const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;

async function seedUsers() {
    const accounts = [
        { username: 'admin', password: 'admin123', role: 'admin', teamName: '' },
        { username: 'subadmin', password: 'subadmin123', role: 'subadmin', teamName: '' },
        { username: 'teacher', password: 'teacher123', role: 'teacher', teamName: '' },
        { username: 'rahul', password: 'password123', role: 'user', teamName: 'Alpha Team' },
        { username: 'priya', password: 'password123', role: 'user', teamName: 'Beta Team' },
    ];
    for (const acc of accounts) {
        const exists = await User.findOne({ username: acc.username });
        if (!exists) {
            await User.create(acc);
            console.log(`✔ Seeded account: ${acc.username} (${acc.role})`);
        }
    }
}

async function startServer() {
    try {
        const mongoServer = await MongoMemoryServer.create({ binary: { version: '4.4.15' } });
        const mongoUri = mongoServer.getUri();
        
        await mongoose.connect(mongoUri);
        console.log('Connected to In-Memory MongoDB');

        // Auto-create default accounts
        await seedUsers();
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Super Admin  → username: admin       | password: admin123`);
            console.log(`Sub Admin    → username: subadmin    | password: subadmin123`);
            console.log(`User login   → username: rahul       | password: password123`);
        });
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}

startServer();

