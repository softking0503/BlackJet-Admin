const { boolean } = require('joi');
const { mongoose, conn } = require('../config/connection');

var aboutUsSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true, // Adjust as needed
    },
    type_of_content: {
        type: String,
        enum: ['aboutUs', 'termsAndCondition', 'privacyPolicy'],
        required: true, // Adjust as needed
        default: 'aboutUs', // You can set a default value
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
    },
}, { versionKey: false });
aboutUsSchema.index({ type_of_content: 1 });

aboutUsSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = conn.model('contentManagement', aboutUsSchema);
