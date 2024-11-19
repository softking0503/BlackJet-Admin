const { mongoose, conn } = require('../config/connection');

var subadminSignatureSchema = new mongoose.Schema({
    subadmin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    signature: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { versionKey: false, timestamps: true });
subadminSignatureSchema.index({ subadmin_id: 1 });
subadminSignatureSchema.index({ name: 1 });
subadminSignatureSchema.index({ status: 1 });
module.exports = conn.model('subadminSignature', subadminSignatureSchema);
