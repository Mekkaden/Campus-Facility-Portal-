const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // 10 minutes TTL
    }
});

const Otp = mongoose.model('Otp', otpSchema);

let mockOtpStore = [];
let mockOtpCounter = 1;

class MockOtp {
    static deleteMany(filter) {
        mockOtpStore = mockOtpStore.filter(o => o.email !== filter.email);
        return Promise.resolve({ deletedCount: 1 });
    }

    static create(data) {
        const item = { ...data, _id: 'mock_otp_' + mockOtpCounter++, createdAt: new Date() };
        mockOtpStore.push(item);
        return Promise.resolve(item);
    }

    static findOne(filter) {
        const item = mockOtpStore.find(o => o.email === filter.email && o.otp === filter.otp);
        return Promise.resolve(item || null);
    }

    static deleteOne(filter) {
        const index = mockOtpStore.findIndex(o => o._id === filter._id);
        if (index > -1) mockOtpStore.splice(index, 1);
        return Promise.resolve({ deletedCount: 1 });
    }
}

module.exports = process.env.MONGO_URI ? Otp : MockOtp;
