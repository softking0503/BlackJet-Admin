const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        default: ""
    },
    preferredFirstName: {
        type: String,
        default: ""
    },
    gender: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        default: ""
    },
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: false
    },
    country_code: {
        type: String,
        default: ""
    },
    phone_code: {
        type: String,
        default: "+61"
    },
    phone: {
        type: String
    },
    birthday: {
        type: Date,
        default: new Date()
    },
    token: {
        type: String,
        trim: true,
        default: ''
    },
    otp: {
        type: Number,
        default: -1
    },
    socket_id: {
        type: String,
        default: ""
    },
    chat_with: {
        type: String,
        default: ""
    },
    // receiver_type: {
    //     type: String,
    //     enum: ['user', 'subadmin', 'admin'],
    //     default: ""
    // },
    status: {
        type: String,
        enum: ['active', 'inactive', 'disable', 'cancel'],
        default: 'active'
    },
    userModeType: {
        type: String,
        enum: ['pending', 'normal', 'preorder'],
        default: 'pending'
    },
    userModeStaticType: {
        type: String,
        enum: ['normal', 'preorder'],
        default: 'normal'
    },
    occupation: {
        type: String
    },
    annual_income: {
        type: String
    },
    industries: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Industries',
        },
    ],
    // show_profile_snooze_till: {
    //     type: Date,
    //     default: new Date()
    // },//No need anywhere
    userVerifyStatus: {
        type: String,
        enum: ['verified', 'not verified', 'in progress'],
        default: 'not verified'
    },
    passportVerified: {
        type: Boolean,
        default: false
    },
    passportDocSubmitted: {
        type: Boolean,
        default: false
    },
    driverlicenseVerified: {
        type: Boolean,
        default: false
    },
    driverlicenseDocSubmitted: {
        type: Boolean,
        default: false
    },
    passport_resubmission_requested: {
        type: Boolean,
        default: false
    },
    driver_license_resubmission_requested: {
        type: Boolean,
        default: false
    },
    email_verified: {
        type: Boolean,
        default: false
    },
    phone_verified: {
        type: Boolean,
        default: false
    },
    profile_pic: {
        type: String,
        default: ""
    },
    safety_video_seen: {
        type: Boolean,
        default: false
    },
    guest_passes: {
        type: Number,
        default: 0
    },
    chat_status: {
        type: String,
        enum: ['online', 'offline', 'idle', 'busy'],
        default: 'idle'
    },
    pet_passes: {
        type: Number,
        default: 0
    },
    // deductPet_passes: {
    //     type: Number,
    //     default: 0
    // },//not used anywhwere
    passport_verification_date: {
        type: Date,
        default: new Date()
    },
    driver_license_verification_date: {
        type: Date,
        default: new Date()
    },
    reusable_bookings: {
        type: Number,
        default: 0
    },
    reset_vouchers: {
        type: Number,
        default: 0
    },
    firebase_device_token: {
        type: String,
        default: ""
    },
    otp_verified: {
        type: Boolean,
        default: false
    },
    is_information_page_completed: {
        type: Boolean,
        default: false
    },
    is_membership_payment_page_completed: {
        type: Boolean,
        default: false
    },
    is_member: {
        type: Boolean,
        default: false
    },
    onboard_status: {
        type: Boolean,
        default: false
    },
    membershipType: {
        type: String,//Unlimited, Unlimited Elite
        default: ""
    },
    reason: {
        type: String,
        default: ""
    },
    powerboardCustomerId: {
        type: String,
        default: ""
    },
    airwallexCustomerId: {
        type: String,
        default: ""
    },
    hellozaiCusId: {
        type: String,
        default: ""
    },
    membershipAgreement: {
        type: Boolean,
        default: false
    },
    privacyPolicyTermsofUse: {
        type: Boolean,
        default: false
    },
    veriff_reason: {
        type: String,
        default: ""
    },
    underway: {
        type: Number,
        default: 0
    },
    profile_update_count: {
        type: Number,
        default: 0
    },
    given_name: {
        type: String,
        default: ""
    },
    last_name: {
        type: String,
        default: ""
    },
    otpValidTime: {
        type: Date, // Change data type to Date for storing date and time
        default: null, // Default to null to allow it to be empty
    },
    deviceInfo: {
        type: [mongoose.Schema.Types.Mixed],
        default: {}
    },
    guest_pass_to_pet_pass: {
        type: Number,
        default: 0
    },
    randomString: {
        type: String,
        trim: true,
        default: ''
    },
    first_name: {
        type: String,
        default: ""
    },
    middle_name: {
        type: String,
        default: ""
    },
    inviteOnboard: {
        type: Boolean,
        default: false
    },
    timezone: {
        type: String,
        default: ""
    },
    account_terminate: {
        type: Date,
        default: null
    }
}, { versionKey: false, timestamps: true });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ status: 1 });

module.exports = User = conn.model('user', userSchema);
