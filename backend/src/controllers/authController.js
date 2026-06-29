const complaintModel = require('../models/Complaint');
const Otp = require('../models/Otp');
const sendOtpEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_key_123';

async function sendOtp(req, res) {
    const email = req.body.email;
    
    if (!email || !email.includes('@mgits.ac.in')) {
        return res.status(400).json({ error: 'Invalid domain. Only @mgits.ac.in emails are allowed.' });
    }

    try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await Otp.deleteMany({ email: email });
        await Otp.create({ email: email, otp: otpCode });
        await sendOtpEmail(email, otpCode);

        return res.status(200).json({ 
            success: true, 
            message: 'OTP sent to your email.'
        });
    } catch (error) {
        console.error('OTP error:', error);
        return res.status(500).json({ error: 'Failed to send OTP.' });
    }
}

async function verifyOtp(req, res) {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP required.' });
    }

    try {
        const record = await Otp.findOne({ email: email, otp: otp });
        if (!record) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        await Otp.deleteOne({ _id: record._id });
        const hash = complaintModel.generateStudentHash(email);
        
        const token = jwt.sign({ email, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({ 
            success: true, 
            message: 'Student identity verified securely.',
            hashMarker: hash.substring(0, 8) + '...',
            token: token
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

async function adminLogin(req, res) {
    const { username, password } = req.body;
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'deepimpact123';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.status(200).json({ success: true, token: token });
    } else {
        return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }
}

module.exports = {
    sendOtp,
    verifyOtp,
    adminLogin
};
