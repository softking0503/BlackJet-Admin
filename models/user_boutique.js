const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let user_boutique_Schema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    boutique_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'boutique',
        required: true
    },
    snooze_till: {
        type: Date,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

}, { versionKey: false, timestamps: true });
user_boutique_Schema.index({ user_id: 1 });
user_boutique_Schema.index({ boutique_id: 1 });
user_boutique_Schema.index({ status: 1 });
// user_boutique_Schema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('user_boutique', user_boutique_Schema);