const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');
/*0 - empty seat,
  1 - Booked seat,
  2 - Booked seat with Baby,
  3 - Booked seat with pet on lap,
  4 - Booked seat for member’s pet
*/

let user_guest_mapping_Schema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    guest_name: {
        type: String,
        default: ""
    },
    guest_phone_code: {
        type: String,
        default: ""
    },
    guest_phone: {
        type: String,
        default: ""
    },
    guest_profile_pic: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

}, { versionKey: false, timestamps: true });
user_guest_mapping_Schema.index({ user_id: 1 });
user_guest_mapping_Schema.index({ status: 1 });
// user_guest_mapping_Schema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('user_guest_mapping', user_guest_mapping_Schema);