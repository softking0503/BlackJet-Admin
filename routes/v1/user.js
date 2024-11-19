const dotenv = require('dotenv');
const express = require('express');
const router = express.Router();
const user = require('../../controllers/v1/user');
const auth = require('../../middleware/auth');
const upload = require('../../controllers/v1/upload')
const { HOD } = require('../../helpers/v1/common');
const common = require('../../helpers/v1/common');
const validateSchema = require('../../helpers/validation-helper').validateSchema;
const validateSchemaGet = require('../../helpers/validation-helper').validateSchemaGet;
const schema = require('../../helpers/v1/joi-validation');
const secretManagerAws = require('../../helpers/secretManagerAws');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../../config', '.envs') });
const S3_REGION = process.env.S3_REGION;
const BUCKET_NAME = process.env.BUCKET_NAME;

var multer = require('multer');
var aws = require('aws-sdk');
var multerS3 = require('multer-s3');
// const credentials = new aws.SharedIniFileCredentials({ profile: "s3" });
// aws.config.credentials = credentials;
// aws.config.update({
//     secretAccessKey: S3_ACCESS_KEY,
//     accessKeyId: S3_ACCESS_KEY_ID,
//     region: S3_REGION
// });
let s3 = new aws.S3();
const AWS_BUCKET_NAME = BUCKET_NAME; // s3 bucket name

let s3upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKET_NAME,
        key: function (req, file, cb) {
            console.log(file)
            cb(null, Date.now() + file.originalname);
        }
    })
});

const uploads = multer();
//User Auth APIs
router.post('/login', validateSchema(schema.validateUserLogin), HOD(user.login));
router.post('/loginWithToken', auth.required, validateSchema(schema.validateUserLoginToken), common.checkTokenAndStatus, HOD(user.loginWithToken));
router.get('/getPlansAndPricing', auth.required, common.checkTokenAndStatus, HOD(user.getPlansAndPricing));
router.get('/resendOtp', auth.required, common.checkTokenAndStatus, HOD(user.resendOTP));
router.get('/searchIndustries', auth.required, validateSchemaGet(schema.validate_search), common.checkTokenAndStatus, HOD(user.searchIndustries));
router.post('/verifyOtp', auth.required, validateSchema(schema.OTPrequired), common.checkTokenAndStatus, HOD(user.verifyOTP));
router.post('/addInformation', auth.required, validateSchema(schema.validate_add_information), common.checkTokenAndStatus, HOD(user.addInformation));
router.post('/completionOfRegistration', auth.required, validateSchema(schema.validate_completion_of_reqgistration), common.checkTokenAndStatus, HOD(user.completionOfRegistration));
router.get('/logout', auth.required, common.checkTokenAndStatus, HOD(user.logout));
router.post('/signupcomplete', auth.required, validateSchema(schema.validate_signup_complete), common.checkTokenAndStatus, HOD(user.signupcomplete));

//Profile APIs
router.post('/addEmail', auth.required, validateSchema(schema.email_validate), common.checkTokenAndStatus, HOD(user.addEmail));
router.post('/sendOtpEmailRegister', auth.required, validateSchema(schema.email_validate), common.checkTokenAndStatus, HOD(user.sendOtpEmailRegister));
router.put('/update_phone', auth.required, validateSchema(schema.update_phone), common.checkTokenAndStatus, HOD(user.update_phone));
router.post('/sendOtpPhone', auth.required, validateSchema(schema.sendOtpPhone), common.checkTokenAndStatus, HOD(user.sendOtpPhone));

router.put('/updateName', auth.required, common.checkTokenAndStatus, HOD(user.updateName));
router.put('/updateGender', auth.required, validateSchema(schema.genderData), common.checkTokenAndStatus, HOD(user.updateGender));
router.get('/emailVerification', HOD(user.emailVerification));
router.get('/getUserProfile', auth.required, common.checkTokenAndStatus, HOD(user.getUserProfile));
router.get('/sendCodeToEmail', auth.required, common.checkTokenAndStatus, HOD(user.sendCodeToEmail));
router.put('/editEmail', auth.required, common.checkTokenAndStatus, HOD(user.editEmail));
router.post('/sendOtpEmail', auth.required, validateSchema(schema.checkEmailExist), common.checkTokenAndStatus, HOD(user.sendOtpEmail));
router.get('/resendEmailVerification', auth.required, common.checkTokenAndStatus, HOD(user.resendEmailVerification));
router.put('/updateProfilePic', auth.required, common.checkTokenAndStatus, HOD(upload.updateProfilePic));
router.post('/uploadProofOfAge', auth.required, common.checkTokenAndStatus, HOD(upload.uploadProofOfAge));
router.post('/uploadPhotoOfInfant', auth.required, common.checkTokenAndStatus, HOD(upload.uploadPhotoOfInfant));
router.post('/upload_acceptance_animal_proof', auth.required, common.checkTokenAndStatus, HOD(upload.upload_acceptance_animal_proof));
router.post('/upload_pet_profile_pic', auth.required, common.checkTokenAndStatus, HOD(upload.upload_pet_profile_pic));
router.post('/addSpecialNeedsAndConditions', auth.required, common.checkTokenAndStatus, HOD(user.addSpecialNeedsAndConditions));
router.get('/getSpecialNeedsAndConditions', auth.required, common.checkTokenAndStatus, HOD(user.getSpecialNeedsAndConditions));
router.get('/editDOB', auth.required, validateSchemaGet(schema.validate_dob), common.checkTokenAndStatus, HOD(user.editDOB));
router.post('/userVerifications', auth.required, common.checkTokenAndStatus, uploads.any(), HOD(upload.userVerifications));
router.post('/veriffWebhookURL', HOD(user.veriffWebhookURL));
router.post('/veriffEventWebhookURL', HOD(user.veriffEventWebhookURL));
router.post('/veriffPepWebhookURL', HOD(user.veriffPepWebhookURL));
router.get('/softDeleteAccount', auth.required, common.checkTokenAndStatus, HOD(user.softDeleteAccount));

//Master Data APIs
router.post('/AddIndustriesMaster', HOD(user.AddIndustriesMaster));
router.put('/UpdateIndustriesMaster', HOD(user.UpdateIndustriesMaster));
router.put('/UpdatePetsMaster', HOD(user.UpdatePetsMaster));
router.post('/addpetsMasterData', HOD(user.addpetsMasterData));

//Membership APIs
router.get('/getMembership', HOD(user.getPlansAndPricing));
router.post('/AddMembership', auth.required, common.checkTokenAndStatus, validateSchema(schema.AddMembership), HOD(user.AddMembership));
router.get('/getUserMembership', auth.required, common.checkTokenAndStatus, HOD(user.getUserMembership));
router.get('/upgradeMembership', auth.required, common.checkTokenAndStatus, HOD(user.upgradeMembership));
router.post('/confirmUpgradeAndPurchase', auth.required, common.checkTokenAndStatus, validateSchema(schema.confirmUpgradeAndPurchase), HOD(user.confirmUpgradeAndPurchase));
router.post('/downgradeMembership', auth.required, common.checkTokenAndStatus, validateSchema(schema.downgradeMembership), HOD(user.downgradeMembership));
router.post('/cancelMembership', auth.required, common.checkTokenAndStatus, validateSchema(schema.cancelMembershipSchema), HOD(user.cancelMembership));
router.post('/changeRenewalDay', auth.required, common.checkTokenAndStatus, validateSchema(schema.changeRenewalDay), HOD(user.changeRenewalDay));
router.post('/changeRenewalDayConfirmPay', auth.required, common.checkTokenAndStatus, validateSchema(schema.changeRenewalDayConfirmPay), HOD(user.changeRenewalDayConfirmPay));
router.post('/terminateMembership', auth.required, common.checkTokenAndStatus, validateSchema(schema.terminateMembership), HOD(user.terminateMembership));
router.get('/autoRenew', auth.required, common.checkTokenAndStatus, HOD(user.autoRenew));
router.get('/renewMembership', auth.required, common.checkTokenAndStatus, HOD(user.renewMembership));
router.get('/activate_membership', auth.required, common.checkTokenAndStatus, HOD(user.activate_membership));

//Home
router.get('/homePage', auth.required, common.checkTokenAndStatus, HOD(user.homePage));
router.get('/homePagev2', auth.required, common.checkTokenAndStatus, HOD(user.homePagev2));
router.put('/updateSafetyVideoWatchStatus', auth.required, validateSchema(schema.validate_update_safety_video), common.checkTokenAndStatus, HOD(user.updateSafetyVideoWatchStatus));
router.get('/check_booking_status', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.check_booking_status), HOD(user.check_booking_status));
router.get('/show_profile', auth.required, validateSchemaGet(schema.show_profile), common.checkTokenAndStatus, HOD(user.show_profile));
router.get('/snooze', auth.required, validateSchemaGet(schema.snooze), common.checkTokenAndStatus, HOD(user.snooze));
router.post('/submitSurvey', auth.required, common.checkTokenAndStatus, validateSchema(schema.submitSurvey), HOD(user.submitSurvey));

//Payment
router.post('/addPayment', auth.required, common.checkTokenAndStatus, validateSchema(schema.addPayment), HOD(user.addPayment));
router.get('/getPaymentMethod', auth.required, common.checkTokenAndStatus, HOD(user.getPaymentMethod));
router.get('/getUsersPaymentListing', auth.required, common.checkTokenAndStatus, HOD(user.getUsersPaymentListing));
router.get('/makePaymentActive', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.makePaymentActive), HOD(user.makePaymentActive));
router.get('/getUserTransaction', auth.required, common.checkTokenAndStatus, HOD(user.getUserTransaction));
router.delete('/deletePayment', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.makePaymentActive), HOD(user.deletePayment));
router.put('/editPayment', auth.required, common.checkTokenAndStatus, validateSchema(schema.editPayment), HOD(user.editPayment));

//Booking
router.get('/get_cities', auth.required, validateSchemaGet(schema.validate_lat_long), common.checkTokenAndStatus, HOD(user.get_cities));
router.post('/get_flights', auth.required, validateSchema(schema.validate_get_flights), common.checkTokenAndStatus, HOD(user.get_flights));
router.post('/get_flights_date', auth.required, validateSchema(schema.validate_get_flights_date), common.checkTokenAndStatus, HOD(user.get_flights_date));
router.post('/booking', auth.required, validateSchema(schema.validate_flight_booking), common.checkTokenAndStatus, common.check_user_identity_verification, HOD(user.booking));
router.get('/get_seats_by_flightId', auth.required, validateSchemaGet(schema.validate_flight_id), common.checkTokenAndStatus, HOD(user.get_seats_by_flightId));
// router.get('/get_seats_by_flightIdv2', auth.required, validateSchemaGet(schema.validate_flight_id), common.checkTokenAndStatus, HOD(user.get_seats_by_flightIdv2));
router.post('/add_guest', auth.required, validateSchema(schema.validate_add_guest), common.checkTokenAndStatus, HOD(user.add_guest));
router.post('/remove_guest', auth.required, validateSchema(schema.validate_remove_guest), common.checkTokenAndStatus, HOD(user.remove_guest));
router.get('/search_pet_breeds', auth.required, validateSchemaGet(schema.validate_search_pet_breed), common.checkTokenAndStatus, HOD(user.search_pet_breeds));
router.post('/add_pet', auth.required, validateSchema(schema.validate_add_pet), common.checkTokenAndStatus, HOD(user.add_pet));
router.get('/get_users_pets', auth.required, common.checkTokenAndStatus, HOD(user.get_users_pets));
router.put('/edit_pet', auth.required, validateSchema(schema.validate_edit_pet), common.checkTokenAndStatus, HOD(user.edit_pet));
// router.post('/lock_seat', auth.required, validateSchema(schema.validate_lock_seat), common.checkTokenAndStatus, HOD(user.lock_seat));
router.post('/lock_seatv2', auth.required, validateSchema(schema.validate_lock_seat), common.checkTokenAndStatus, HOD(user.lock_seatv2));
router.get('/get_states', auth.required, common.checkTokenAndStatus, HOD(user.get_states));
router.post('/get_pet_data', auth.required, common.checkTokenAndStatus, validateSchema(schema.validate_get_pet_data), HOD(user.get_pet_data));
router.delete('/delete_pet', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.validate_delete_pet), HOD(user.delete_pet));
router.get('/booking_summary', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.validate_flight_id), HOD(user.booking_summary));
router.get('/guest_confirms_booking', validateSchemaGet(schema.validate_guest_confirms_booking), HOD(user.guest_confirms_booking));
router.get('/getBookingList', auth.required, common.checkTokenAndStatus, validateSchema(schema.getBookingListSchema), HOD(user.getBookingList));
router.get('/check_users_booking', auth.required, common.checkTokenAndStatus, HOD(user.check_users_booking));
router.post('/pet_on_board_member_decision', auth.required, common.checkTokenAndStatus, validateSchema(schema.validate_pet_on_board_request), HOD(user.pet_on_board_member_decision));
router.get('/convert_guest_pass', auth.required, common.checkTokenAndStatus, HOD(user.convert_guest_pass));
router.get('/heartBeat', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.heartBeat), HOD(user.heartBeat));
router.get('/cancelBooking', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.makePaymentActive), HOD(user.cancelBooking));
router.get('/clearLockedSeats', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.makePaymentActive), HOD(user.clearLockedSeats));
router.get('/undoEditSeats', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.makePaymentActive), HOD(user.undoEditSeats));
router.post('/cancelBooking', auth.required, common.checkTokenAndStatus, validateSchema(schema.cancelBooking), HOD(user.cancelBookingv2));
router.post('/edit_seat', auth.required, validateSchema(schema.validate_edit_seat), common.checkTokenAndStatus, HOD(user.edit_seat));
router.post('/confirmEditSeat', auth.required, validateSchema(schema.edit_seatV2), common.checkTokenAndStatus, HOD(user.confirmEditSeat));
router.post('/edit_seatv2', auth.required, validateSchema(schema.validate_edit_seat), common.checkTokenAndStatus, HOD(user.edit_seatv2));
router.post('/purchaseResetVoucher', auth.required, validateSchema(schema.purchaseResetVoucher), common.checkTokenAndStatus, HOD(user.purchaseResetVoucher));
router.post('/reset_passes', auth.required, validateSchema(schema.reset_passes), common.checkTokenAndStatus, HOD(user.reset_passes));
router.post('/getBook_another_flights', auth.required, validateSchema(schema.getBook_another_flights), common.checkTokenAndStatus, HOD(user.getBook_another_flights));
router.get('/notify_at_leaveTime', auth.required, validateSchemaGet(schema.notify_at_leaveTime), common.checkTokenAndStatus, HOD(user.notify_at_leaveTime));
router.get('/update_passes', auth.required, common.checkTokenAndStatus, HOD(user.update_passes));
router.put('/edit_guest', auth.required, validateSchema(schema.validate_edit_guest), common.checkTokenAndStatus, HOD(user.edit_guest));

//FAQ,Boutique,Preferences
router.post('/changePreference', auth.required, common.checkTokenAndStatus, validateSchema(schema.changePreference), HOD(user.changePreference));
router.get('/getPreference', auth.required, common.checkTokenAndStatus, HOD(user.getPreference));
router.get('/viewAllLegal', auth.optional, validateSchemaGet(schema.querySchema), HOD(user.viewAllLegal));
router.get('/viewAllFAQcategory', auth.optional, validateSchemaGet(schema.querySchema), HOD(user.viewAllFAQcategory));
router.get('/viewFAQbasedOnCategory', auth.optional, validateSchemaGet(schema.makePaymentActive), HOD(user.viewFAQbasedOnCategory));
router.post('/AddContactUs', auth.optional, common.checkTokenAndStatus, validateSchema(schema.AddContactUs), HOD(user.AddContactUs));
router.get('/contactUsAutoFields', auth.optional, HOD(user.contactUsAutoFields));
router.get('/viewLegal', auth.optional, validateSchemaGet(schema.viewSchema), HOD(user.getLegal));


//Boutique
router.get('/getBoutique', auth.required, common.checkTokenAndStatus, HOD(user.getBoutique));
router.post('/buyGuestPasses', auth.required, common.checkTokenAndStatus, validateSchema(schema.buyGuestPasses), HOD(user.buyGuestPasses));
router.get('/getHTMLContent', auth.optional, validateSchemaGet(schema.typeSchema), HOD(user.getHTMLContent));
router.post('/purchaseGiftCard', auth.required, common.checkTokenAndStatus, validateSchema(schema.purchaseGiftCard), HOD(user.purchaseGiftCard));
router.post('/rescheduleDeliveryTime', auth.required, common.checkTokenAndStatus, validateSchema(schema.rescheduleDeliveryTime), HOD(user.rescheduleDeliveryTime));
router.get('/emailInvoice', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.makePaymentActive), HOD(user.emailInvoice));
router.post('/automaticMailInvoice', auth.required, common.checkTokenAndStatus, validateSchema(schema.automaticMailInvoice), HOD(user.automaticMailInvoice));
router.get('/downloadInvoice', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.makePaymentActive), HOD(user.downloadInvoice));
router.post('/updateDeviceTokenold', auth.required, validateSchema(schema.deviceTokenValidationSchema), common.checkTokenAndStatus, HOD(user.updateDeviceTokenold));
router.post('/oneTimeInitiationPayment', auth.required, validateSchema(schema.oneTimeInitiationPayment), common.checkTokenAndStatus, HOD(user.oneTimeInitiationPayment));
router.post('/send_referral', auth.required, validateSchema(schema.generateReferCodeSchema), common.checkTokenAndStatus, HOD(user.send_referral));
router.get('/send_app_link', HOD(user.sendAppLink));
router.get('/freePreviewRegister', auth.required, common.checkTokenAndStatus, HOD(user.freePreviewRegister));
router.get('/getReferList', auth.required, validateSchemaGet(schema.snooze), common.checkTokenAndStatus, HOD(user.getReferList));
router.get('/resendSignaturePDF', auth.required, validateSchemaGet(schema.resendSignaturePDF), common.checkTokenAndStatus, HOD(user.resendSignaturePDF));


router.get('/notifyBefore2hours', auth.required, validateSchemaGet(schema.notifyBefore2hours), common.checkTokenAndStatus, HOD(user.notifyBefore2hours));
router.post('/uploadAnyFiles', s3upload.any('files'), HOD(user.uploadAnyFiles));
router.post('/redeemGiftCard', auth.required, common.checkTokenAndStatus, validateSchema(schema.redeemGiftCard), HOD(user.redeemGiftCard));
router.get('/resendGiftCard', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.resendGiftCard), HOD(user.resendGiftCard));
router.get('/generate-ics', auth.required, common.checkTokenAndStatus, HOD(user.generateics));
router.post('/uploadDriversLicense', auth.required, common.checkTokenAndStatus, HOD(upload.uploadDriversLicense));
router.post('/uploadPassport', auth.required, common.checkTokenAndStatus, HOD(upload.uploadPassport));
router.put('/editGiftCard', auth.required, common.checkTokenAndStatus, validateSchema(schema.editGiftCard), HOD(user.editGiftCard));
router.post('/addCard', auth.required, common.checkTokenAndStatus, HOD(user.addCard));
router.post('/createPayment', auth.required, common.checkTokenAndStatus, HOD(user.createPayment));

router.get('/getPeymentCountry', auth.required, common.checkTokenAndStatus, HOD(user.getPeymentCountry));
router.get('/getResetVoucher', auth.required, common.checkTokenAndStatus, HOD(user.getResetVoucher));
router.get('/getReferStatus', HOD(user.getReferStatus));

router.post('/getVeriffResponse', auth.required, validateSchema(schema.validate_getVeriffResponse), common.checkTokenAndStatus, HOD(user.getVeriffResponse));
router.post('/redeemGuestPasses', auth.required, validateSchema(schema.redeemGuestPasses), common.checkTokenAndStatus, HOD(user.redeemGuestPasses));
router.get('/routes', auth.required, validateSchemaGet(schema.routesSchema), common.checkTokenAndStatus, HOD(user.routes));

router.post('/resendGuestBookingMessage', auth.required, validateSchema(schema.resendGuestBookingMessageSchema), common.checkTokenAndStatus, HOD(user.resendGuestBookingMessage));
router.get('/getChatTime', auth.required, common.checkTokenAndStatus, validateSchemaGet(schema.emptySchema), HOD(user.getChatTime));

module.exports = router;
