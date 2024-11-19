const { mongoose, conn } = require('../config/connection');

let veriffSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    id: {
        type: String,
        default: ""
    },
    code: {
        type: Number,
        default: ""
    },
    action: {
        type: String,
        default: ""
    },
    feature: {
        type: String,
        default: ""
    },
    attemptId: {
        type: String,
        default: ""
    },
    vendorData: {
        type: String,
        default: ""
    }
}, { versionKey: false, timestamps: true });
veriffSchema.index({ user_id: 1 });


module.exports = User = conn.model('veriffEventResponse', veriffSchema);
