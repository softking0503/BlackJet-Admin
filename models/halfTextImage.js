const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var halfTextImageSchema = new mongoose.Schema({
    image: {
        type: String,
        default: ""
    },
    image_link: {
        type: String,
        default: ""
    },
    section_heading: {
        type: String,
        default: ""
    },
    heading: {
        type: String,
        default: ""
    },
    sub_heading: {
        type: String,
        default: ""
    },
    text: {
        type: String,
        default: ""
    },
    created_at: {
        type: Date,
        default: new Date()
    },
    updated_at: {
        type: Date,
        default: new Date()
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false });
halfTextImageSchema.index({ status: 1 });
halfTextImageSchema.index({ created_at: 1 });
halfTextImageSchema.index({ updated_at: 1 });
halfTextImageSchema.index({ section_heading: 1 });
halfTextImageSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('halfTextImage', halfTextImageSchema);
