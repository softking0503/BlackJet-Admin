const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let veriffSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    webhook_response: {
        type: [mongoose.Schema.Types.Mixed]
    }
}, { versionKey: false, timestamps: true });
veriffSchema.index({ user_id: 1 });


module.exports = User = conn.model('veriffPepResponse', veriffSchema);
