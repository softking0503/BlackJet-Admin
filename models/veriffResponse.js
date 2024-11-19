const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let veriffResponseSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false,
    },
    type: {
        type: String,
        default: ""
    },
    code: {
        type: Number,
        default: 0
    },
    message: {
        type: String,
        default: "",
    },
    user_image: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { versionKey: false, timestamps: true });
veriffResponseSchema.index({ user_id: 1 });
veriffResponseSchema.index({ type: 1 });
veriffResponseSchema.index({ code: 1 });

module.exports = User = conn.model('veriffResponse', veriffResponseSchema);
