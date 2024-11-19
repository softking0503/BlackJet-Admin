const { mongoose, conn } = require('../config/connection');

var legalUpdateUserSchema = new mongoose.Schema({
    legal_title: {
        type: String,
        default: ''
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
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
legalUpdateUserSchema.index({ user_id: 1 });
legalUpdateUserSchema.index({ status: 1 });
legalUpdateUserSchema.index({ legal_title: 1 });
module.exports = conn.model('legalUpdateUser', legalUpdateUserSchema);