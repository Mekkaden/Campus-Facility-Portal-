const mongoose = require('mongoose');
const crypto = require('crypto');

const complaintSchema = new mongoose.Schema({
    studentHash: {
        type: String,
        required: true,
        index: true 
    },
    category: {
        type: String,
        required: true,
        enum: ['Infrastructure', 'Academics', 'Hostel', 'Food', 'Other']
        //enum means like only these values are allowed
    },
    title: {
        type: String,
        required: true,
        maxlength: 150
    },
    description: {
        type: String,
        required: true,
        maxlength: 3000
    },
    status: {
        type: String,
        required: true,
        enum: ['pending_manual_review', 'approved', 'rejected'],
        default: 'pending_manual_review'
    },
    // LLM Moderation fields
    trustScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    moderationFlags: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    statusHistory: {
        type: [{
            status: { type: String },
            changedAt: { type: Date, default: Date.now },
            note: { type: String, default: '' }
        }],
        default: []
    },
    adminNotes: {
        type: [{
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }],
        default: []
    }
});

// Zero-Knowledge Identity Hashing
// This function must be used BEFORE saving a complaint. 
// The raw @mgits.ac.in email is never passed to MongoDB.
function generateStudentHash(email) {
    const rawEmail = String(email).toLowerCase().trim();
    const hashSecret = process.env.HASH_SECRET;
    
    if (!hashSecret) {
        throw new Error('Server Configuration Error: HASH_SECRET is missing.');
    }
    
    // Create a one-way SHA-256 hash using the email and sequence secret
    const hash = crypto.createHash('sha256');
    hash.update(rawEmail);
    hash.update(hashSecret);
    
    return hash.digest('hex');
}

const Complaint = mongoose.model('Complaint', complaintSchema);

// In-Memory Mock Store for when MONGO_URI is not provided
let mockDataStore = [];
let mockIdCounter = 1;

class MockComplaint {
    constructor(data) {
        Object.assign(this, data);
        this._id = 'mock_' + mockIdCounter++;
        this.createdAt = new Date();
        this.adminNotes = this.adminNotes || [];
        this.statusHistory = this.statusHistory || [];
    }

    save() {
        mockDataStore.push(this);
        return Promise.resolve(this);
    }

    static find() {
        return {
            sort: function() {
                // Return a copy sorted by createdAt descending
                const sorted = [...mockDataStore].sort((a, b) => b.createdAt - a.createdAt);
                return Promise.resolve(sorted);
            }
        };
    }

    static findById(id) {
        const item = mockDataStore.find(c => c._id === id);
        return Promise.resolve(item || null);
    }

    static findByIdAndUpdate(id, update, options) {
        let item = mockDataStore.find(c => c._id === id);
        if (!item) return Promise.resolve(null);
        
        if (update.status) item.status = update.status;
        if (update.$push) {
            if (update.$push.statusHistory) item.statusHistory.push(update.$push.statusHistory);
            if (update.$push.adminNotes) item.adminNotes.push(update.$push.adminNotes);
        }
        return Promise.resolve(item);
    }

    static findByIdAndDelete(id) {
        const index = mockDataStore.findIndex(c => c._id === id);
        if (index === -1) return Promise.resolve(null);
        const item = mockDataStore[index];
        mockDataStore.splice(index, 1);
        return Promise.resolve(item);
    }
}

// Export the real model if MONGO_URI exists, otherwise export the Mock model
const ExportedModel = process.env.MONGO_URI ? Complaint : MockComplaint;

module.exports = {
    Complaint: ExportedModel,
    generateStudentHash: generateStudentHash
};
