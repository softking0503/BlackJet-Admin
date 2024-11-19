const { mongoose, conn } = require('../config/connection');

var contactUsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true, // Remove leading/trailing whitespaces
    },
    email: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        trim: true,
        required: true,
    },
    phone_code: {
        type: String,
        trim: true,
        required: true,
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
        enum: ['active', 'inactive', 'delete'],
        default: 'active'
    }

}, { versionKey: false });
contactUsSchema.index({ email: 1, subject: 1 });

contactUsSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = contactUs = conn.model('contactUs', contactUsSchema);
