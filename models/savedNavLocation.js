const { mongoose, conn } = require('../config/connection');

const savedNavLocationSchema = new mongoose.Schema({
    faqsLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    legalLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    aboutUsLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    contactUsLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    careersLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    mediaPressLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    investorsLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    newsLocationIds: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nav_location',
            required: false,  // Make required false to allow empty objects
        },
        isAdd: {
            type: Boolean,
            default: true
        },
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });

module.exports = savedNavLocation = conn.model('savedNavLocation', savedNavLocationSchema);