const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var membershipSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    noOfSeats: {
        type: Number,
        default: 0
    },
    content: {
        type: String,
        default: ''
    },
    text: {
        type: String,
        default: ''
    },
    bannerTag: {
        type: String,
        default: ''
    },
    type: {
        type: Number,
        default: 0//1 == Unlimited membership and 2 for Unlimited elite
    },
    highlightsArray: [{
        highlight: {
            type: String,
            required: true
        },
        strikeThroughHighlight: {
            type: String,
            default: ''
        },
        check: {
            type: Boolean,
            default: true // Initially set to false
        }
    }],
    downgradeArray: [{
        downgrade: {
            type: String,
            required: false
        },
        check: {
            type: Boolean,
            default: true // Initially set to false
        }
    }],
    downgradeText: {
        type: String,
        default: ''
    },
    preorderOn: {
        type: Boolean,
        default: false // Initially set to false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });
membershipSchema.index({ name: 1 });

module.exports = conn.model('membership', membershipSchema);
