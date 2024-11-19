const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let userSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    duplicated_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    }],
    is_duplicated:{
        type: Boolean,
        default: false
    },
    payment_status:{
        type: String,
        default: ""

    },
    document_type: {
        type: String,
    },
    gender: {
        type: String,
    },
    idNumber: {
        type: String,
    },
    lastName: {
        type: String,
        default: ""
    },
    firstName: {
        type: String,
        default: ""
    },
    citizenship: {
        type: String,
        default: ""
    },
    dateOfBirth: {
        type: String,
        default: ""
    },
    nationality: {
        type: String,
        default: ""
    },
    yearOfBirth: {
        type: String,
        default: ""
    },
    placeOfBirth: {
        type: String,
        default: ""
    },
    pepSanctionMatch: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'disable', 'cancel'],
        default: 'active'
    },
  
 

}, { versionKey: false, timestamps: true });
userSchema.index({ user_id: 1 });
userSchema.index({ document_type: 1 });
userSchema.index({ idNumber: 1 });
userSchema.index({ lastName: 1 });
userSchema.index({ firstName: 1 });
userSchema.index({ citizenship: 1 });
userSchema.index({ dateOfBirth: 1 });
userSchema.index({ nationality: 1 });
userSchema.index({ yearOfBirth: 1 });
userSchema.index({ placeOfBirth: 1 });
userSchema.index({ status: 1 });
// Custom validation for email
// userSchema.path('email').validate((val) => {
//     console.log("val=",val)
//     emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,13}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
//     return emailRegex.test(val);
// }, 'Invalid e-mail.');
// userSchema.pre('save', function (next) {
//     this.updated_at = new Date();
//     next();
// });
module.exports = User = conn.model('veriff', userSchema);
