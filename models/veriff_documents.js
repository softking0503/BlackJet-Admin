const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let userSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    urls:{
        type:[],
        default:[]
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'disable', 'cancel'],
        default: 'active'
    },
  
 

}, { versionKey: false, timestamps: true });
userSchema.index({ user_id: 1 });
userSchema.index({ "urls": 1 });

module.exports = User = conn.model('veriff_document', userSchema);
