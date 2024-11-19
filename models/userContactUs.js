const { mongoose, conn } = require('../config/connection');

var contactUsSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    },
    FullName: {
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
    enquiry: {
        type: String,
        required: true,
    },
    enquiryDetails: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        trim: true,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });
contactUsSchema.index({ user_id: 1 });
contactUsSchema.index({ email: 1 });
contactUsSchema.index({ subject: 1 });
contactUsSchema.index({ status: 1 });
module.exports = contactUs = conn.model('userContactUs', contactUsSchema);
