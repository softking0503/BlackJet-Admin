const { bool } = require('joi');
const { mongoose, conn } = require('../config/connection');

let pilotSchema = new mongoose.Schema({
    first_name: {
        type: String,
        default: ""
    },
    last_name: {
        type: String,
        default: ""
    },
    dateOfBirth: {
        type: Date
    },
    phone: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        default: ""
    },
    phone_code: {
        type: String,
        default: ""
    },
    Address: {
        type: String,
        default: ""
    },
    Nationality: {
        type: String,
        default: ""
    },
    Photo: {
        type: String,
        default: ""
    },
    LicenseNumber: {
        type: String,
        default: ""
    },
    LicenseType: {
        type: String,
        default: ""
    },
    LiIssuingAuthority: {
        type: String,
        default: ""
    },
    LiDateOfIssue: {
        type: Date
    },
    LiExpirationDate: {
        type: Date
    },
    FlightSchoolAttended: {
        type: String,
        default: ""
    },
    Certifications: {
        type: [],
        default: []
    },
    TotalFlightHr: {
        type: Number,
        default: 0
    },
    FlightHrByAircraftType: {
        type: Number,
        default: 0
    },
    SpecialQualifications: {
        type: [],
        default: []
    },
    MedicalCertType: {
        type: String,
        default: ""
    },
    MeIssuingDoctor: {
        type: String,
        default: ""
    },
    MeDateOfIssue: {
        type: Date
    },
    MeExpiryDate: {
        type: Date
    },
    MeRestrictions: {
        type: String,
        default: ""
    },
    ScannedCopiesOfLiCert: {
        type: [],
        default: []
    },
    PassportCopy: {
        type: String,
        default: ""
    },
    AnyOtherDocs: {
        type: [],
        default: []
    },
    BackgroundChecksStatus: {
        type: String,
        default: ""
    },
    SecurityClearanceLevel: {
        type: String,
        default: ""
    },
    EmergencyName: {
        type: String,
        default: ""
    },
    EmergencyRelation: {
        type: String,
        default: ""
    },
    EmergencyPhone: {
        type: String,
        default: ""
    },
    EmergencyEmail: {
        type: String,
        default: ""
    },
    EmergencyPhoneCode: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    // type:{
    //     type:String,
    //     enum: ['pilot', 'copilot'],
    // }

}, { versionKey: false, timestamps: true });
pilotSchema.index({ email: 1 });

module.exports = User = conn.model('pilot', pilotSchema);