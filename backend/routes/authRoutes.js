const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const verificationCodes = new Map(); // Store codes in memory for dev

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

router.post('/send-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes.set(email, code);

        let transporter;
        let senderEmail = process.env.EMAIL_USER;

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            // Use real Gmail if credentials are provided
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        } else {
            // Generate ethereal test account on the fly for development/github users
            let testAccount = await nodemailer.createTestAccount();
            senderEmail = testAccount.user;
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, 
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log("Using Ethereal Email for testing (No EMAIL_USER/EMAIL_PASS found in .env)");
        }

        let info = await transporter.sendMail({
            from: `"Cloud AI Team" <${senderEmail}>`,
            to: email,
            subject: "Your Verification Code",
            text: `Your verification code is: ${code}`,
            html: `<b>Your verification code is: ${code}</b>`,
        });

        console.log("Message sent: %s", info.messageId);
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log("Preview Email URL: %s", nodemailer.getTestMessageUrl(info));
        }
        console.log(`Verification code for ${email} is ${code}`); // Still keeping this for dev convenience

        res.json({ message: 'Verification code sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send email: ' + error.message });
    }
});

router.post('/register', async (req, res) => {
    const { username, password, role, teamName, email, verificationCode } = req.body;
    try {
        if (!verificationCode || verificationCodes.get(email) !== verificationCode) {
            return res.status(400).json({ message: 'Invalid or missing verification code' });
        }

        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ message: 'User already exists' });
        const user = await User.create({ 
            username, 
            password, 
            role: role || 'user', 
            teamName: teamName || '',
            email: email || ''
        });
        res.status(201).json({
            _id: user._id, 
            username: user.username, 
            role: user.role,
            teamName: user.teamName, 
            email: user.email,
            token: generateToken(user._id)
        });
        verificationCodes.delete(email); // clear code after successful register
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id, username: user.username, role: user.role,
                teamName: user.teamName, token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
