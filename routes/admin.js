const dotenv = require('dotenv');
const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin');
const auth = require('../middleware/auth');
const { HOD } = require('../helpers/v2/common');
const common = require('../helpers/v2/common');
const schemas = require('../helpers/schemas');
const middleware = require('../helpers/middleware');
const validateSchema = require('../helpers/validation-helper').validateSchema;
const validateSchemaGet = require('../helpers/validation-helper').validateSchemaGet;
const schema = require('../helpers/schemas');
const { multerUpload, multerUploadLocal } = require('../helpers/upload');
const secretManagerAws = require('../helpers/secretManagerAws');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });
var multer = require('multer');
var aws = require('aws-sdk');
var multerS3 = require('multer-s3');
// const credentials = new aws.SharedIniFileCredentials({ profile: "s3" });
// console.log('credentials==',credentials)
// aws.config.credentials = credentials;
// aws.config.update({
//     region: process.env.S3_REGION
// });

s3 = new aws.S3();
//CHAT_MEDIA_BUCKET
var s3uploadchat = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.CHAT_MEDIA_BUCKET,
        key: function (req, file, cb) {
            console.log(file)
            cb(null, Date.now() + file.originalname);
        }
    })
});

//USER_MEDIA_BUCKET
var s3upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.USER_MEDIA_BUCKET,
        key: function (req, file, cb) {
            console.log(file)
            cb(null, Date.now() + file.originalname);
        }
    })
});

router.get('/test', function (req, res) {
    console.log("test endpoint");
    res.send("Test successful");
});
router.post('/register', auth.optional, common.logActivity('Admin User Management', 'Add'), common.verifyPermission('Admin User Management', 'write'), validateSchema(schema.registerSchema), HOD(admin.register));
router.post('/login', auth.optional, common.logActivity('Admin User Management', 'login'), validateSchema(schema.validateLogin), HOD(admin.login));
router.get('/get-roles', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, HOD(admin.getRoles));
router.get('/getIndustry', auth.required, common.checkAdminOrSubadmin, HOD(admin.getIndustry));
router.get('/stateList', auth.required, common.checkAdminOrSubadmin, HOD(admin.stateList));
router.get('/getEnquiryList', auth.required, common.checkAdminOrSubadmin, HOD(admin.getEnquiryList));
router.get('/getAdminProfile', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.validateAdminProfile), HOD(admin.getAdminProfile));
router.get('/getAllAdminProfiles', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, validateSchema(schema.validateAllAdminProfiles), HOD(admin.getAllAdminProfiles));
router.post('/updateAdminProfile', auth.required, common.logActivity('Admin User Management', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('Admin User Management', 'write'), validateSchema(schema.validateUpdate), HOD(admin.updateAdminProfile));
router.post('/resetPassword', auth.optional, common.logActivity('Admin User Management', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.validateUpdatePassword), HOD(admin.resetPassword));
router.post('/adminForgotPassword', auth.optional, common.logActivity('Admin User Management', 'Edit'), HOD(admin.adminForgotPassword));
router.post('/updateAdminStatus', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), HOD(admin.updateAdminStatus));
router.post('/addContent', auth.required, common.checkAdminOrSubadmin, common.verifyPermission('Content Management', 'write'), validateSchema(schema.addContentSchema), HOD(admin.addContent));
router.get('/contentList', auth.optional, common.checkAdminOrSubadmin, common.verifyPermission('Content Management', 'read'), validateSchemaGet(schema.contentListSchema), HOD(admin.contentList));
router.get('/getAllCategories', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.getAllCategories));
router.get('/getCategory', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.getCategory));
router.post('/addCategory', auth.required, s3upload.any('image'), common.checkAdminOrSubadmin, HOD(admin.addCategory));
router.post('/editCategory', auth.required, s3upload.any('image'), common.checkAdminOrSubadmin, HOD(admin.editCategory));
router.post('/updateCategoryStatus', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), HOD(admin.updateCategoryStatus));
router.post('/addHomePage', auth.required, common.checkAdminOrSubadmin, s3upload.any(''), HOD(admin.addHomePage));
router.post('/addInvestors', auth.required, common.checkAdminOrSubadmin, s3upload.any(''), HOD(admin.addInvestors));
router.get('/viewHomePage', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.viewHomePage));
router.post('/updateHomePage', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateHomePageSchema), HOD(admin.updateHomePage));
router.post('/addTestimonial', auth.required, common.checkAdminOrSubadmin, s3upload.any('image'), HOD(admin.addTestimonial));
router.get('/viewTestimonial', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.viewTestimonial));
router.get('/viewAllTestimonials', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.viewAllTestimonials));
router.post('/updateTestimonial', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), HOD(admin.updateTestimonial));
router.post('/addHalfTextImage', auth.required, common.checkAdminOrSubadmin, s3upload.any('image'), HOD(admin.addHalfTextImage));
router.get('/viewHalfTextImage', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.viewHalfTextImage));
router.get('/viewAllHalfTextImageData', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.viewAllHalfTextImageData));
router.post('/updateHalfTextImage', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), HOD(admin.updateHalfTextImage));
router.post('/addColumnWithIcon', auth.required, common.checkAdminOrSubadmin, s3upload.any('image'), HOD(admin.addColumnWithIcon));
router.get('/viewColumnWithIcon', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.viewColumnWithIcon));
router.get('/viewAllColumnWithIconData', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.viewAllColumnWithIconData));
router.post('/updateColumnWithIcon', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), HOD(admin.updateColumnWithIcon));
router.post('/addFaq', auth.required, common.logActivity('FAQs', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.addFaqSchema), HOD(admin.addFaq));
router.post('/editFaq', auth.required, common.logActivity('FAQs', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.editFaqSchema), HOD(admin.editFaq));
router.post('/deleteFaq', auth.required, common.logActivity('FAQs', 'Deactivate'), common.checkAdminOrSubadmin, validateSchema(schema.viewSchema), HOD(admin.deleteFaq));
router.get('/viewFAQ', auth.required, common.logActivity('FAQs', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.viewFAQ));
router.get('/viewAllFAQs', auth.required, common.logActivity('FAQs', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewAllFAQsSchema), HOD(admin.viewAllFAQs));
router.post('/updateFaqStatus', auth.required, common.logActivity('FAQs', 'Activate'), common.checkAdminOrSubadmin, validateSchema(schema.commonUpdateSchema), HOD(admin.updateFaqStatus));
router.post('/addMembership', auth.required, common.logActivity('Membership Plans', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('Membership Plans', 'write'), validateSchema(schema.addMembershipSchema), HOD(admin.addMembership));
router.get('/viewMembership', auth.required, common.logActivity('Membership Plans', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('Membership Plans', 'read'), validateSchemaGet(schema.viewSchema), HOD(admin.viewMembership));
router.get('/viewAllMemberships', auth.required, common.logActivity('Membership Plans', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('Membership Plans', 'read'), validateSchemaGet(schema.querySchema), HOD(admin.viewAllMemberships));
router.post('/updateMembership', auth.required, common.logActivity('Membership Plans', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('Membership Plans', 'write'), validateSchema(schema.updateItemSchema), HOD(admin.updateMembership));
router.post('/editMembership', auth.required, common.logActivity('Membership Plans', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('Membership Plans', 'write'), validateSchema(schema.editMembershipSchema), HOD(admin.editMembership));
router.post('/editDowngradeCard', auth.required, common.logActivity('Membership Plans', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('Membership Plans', 'write'), validateSchema(schema.editDowngradeSchema), HOD(admin.editDowngradeCard));
router.post('/setMembershipPreorder', auth.required, common.logActivity('Membership Plans', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.setMembershipPreorderSchema), HOD(admin.setMembershipPreorder));
router.post('/addPrice', auth.required, common.logActivity('Item Pricing', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('Membership Plans', 'write'), validateSchema(schema.addPriceSchema), HOD(admin.addPrice));
router.post('/editPrice', auth.required, common.logActivity('Item Pricing', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.editPriceSchema), HOD(admin.editPrice));
router.get('/priceHistory', auth.required, common.logActivity('Item Pricing', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.priceHistorySchema), HOD(admin.priceHistory));
router.post('/addItems', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.addItemSchema), HOD(admin.addItems));
router.post('/editItem', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.editItemSchema), HOD(admin.editItem));
router.post('/updateItemStatus', common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), auth.required, HOD(admin.updateItemStatus));
router.get('/viewItem', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.viewItem));
router.get('/viewAllItems', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.viewAllItems));
router.post('/addBoutiqueItem', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.addBoutiqueItemSchema), HOD(admin.addBoutiqueItem));
router.post('/editBoutiqueItem', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.editBoutiqueItemSchema), HOD(admin.editBoutiqueItem));
router.post('/updateBoutiqueItemStatus', common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), auth.required, HOD(admin.updateBoutiqueItemStatus));
router.post('/updatePriceStatus', common.logActivity('Item Pricing', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), auth.required, HOD(admin.updatePriceStatus));
router.get('/getBoutiqueItem', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.getBoutiqueItem));
router.get('/viewAllBoutique', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.viewAllBoutique));
router.post('/updateEffectiveDate', common.checkAdminOrSubadmin, validateSchema(schema.updatePriceSchema), auth.required, HOD(admin.updateEffectiveDate));
router.post('/addLegal', auth.required, common.logActivity('Legal', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('Legal', 'write'), validateSchema(schema.legalSchema), HOD(admin.addLegal));
router.post('/editLegal', auth.required, common.logActivity('Legal', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('Legal', 'write'), validateSchema(schema.editLegalSchema), HOD(admin.editLegal));
router.post('/deleteLegal', auth.required, common.logActivity('Legal', 'Deactivate'), common.checkAdminOrSubadmin, common.verifyPermission('Legal', 'write'), validateSchema(schema.viewSchema), HOD(admin.deleteLegal));
router.get('/viewLegal', auth.required, common.logActivity('Legal', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('Legal', 'read'), validateSchemaGet(schema.viewSchema), HOD(admin.viewLegal));
router.get('/viewAllLegal', auth.required, common.logActivity('Legal', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('Legal', 'read'), validateSchemaGet(schema.querySchema), HOD(admin.viewAllLegal));
router.post('/updateLegalStatus', auth.required, common.logActivity('Legal', 'Activate'), common.checkAdminOrSubadmin, common.verifyPermission('Legal', 'write'), validateSchema(schema.commonUpdateSchema), HOD(admin.updateLegalStatus));
router.get('/viewContactUs', auth.required, common.logActivity('Contact Us Category', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.viewContactUs));
router.get('/contact_us_list', auth.required, common.logActivity('Contact Us Category', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewAllFAQsSchema), HOD(admin.contact_us_list));
router.post('/contactUs', auth.required, common.logActivity('Contact Us Category', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.contactUsSchema), HOD(admin.contactUs));
router.post('/delete_contact_us', auth.required, common.logActivity('Contact Us Category', 'Deactivate'), common.checkAdminOrSubadmin, validateSchema(schema.viewSchema), HOD(admin.delete_contact_us));
router.get('/getAllNavLocations', auth.required, common.logActivity('Navigation Management', 'View'), common.checkAdminOrSubadmin, HOD(admin.getAllNavLocations));
router.post('/add', auth.required, common.checkAdminOrSubadmin, HOD(admin.add));
router.post('/addOrUpdateSavedLocation', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.addSavedLocationSchema), HOD(admin.addOrUpdateSavedLocation));
router.get('/viewSavedLocation', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.requestSchema), HOD(admin.viewSavedLocation));
router.get('/viewAllSavedLocation', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.viewAllSavedLocation));
router.post('/addDiscount', auth.required, common.logActivity('New Membership Discount', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('New Membership Discount', 'write'), validateSchema(schema.addDiscountSchema), HOD(admin.addDiscount));
router.post('/editDiscount', auth.required, common.logActivity('New Membership Discount', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('New Membership Discount', 'write'), validateSchema(schema.updateDiscountSchema), HOD(admin.editDiscount));
router.post('/updateDiscountStatus', auth.required, common.logActivity('New Membership Discount', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('New Membership Discount', 'write'), validateSchema(schema.updateItemSchema), HOD(admin.updateDiscountStatus));
router.post('/deleteDiscount', auth.required, common.logActivity('New Membership Discount', 'Deactivate'), common.checkAdminOrSubadmin, common.verifyPermission('New Membership Discount', 'write'), validateSchema(schema.viewSchema), HOD(admin.deleteDiscount));
router.get('/getDiscount', auth.required, common.logActivity('New Membership Discount', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.getDiscount));
router.post('/addDiscountTier', auth.required, common.logActivity('New Membership Discount', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.discountTierSchema), HOD(admin.addDiscountTier));
router.post('/addInitiationDiscount', auth.required, common.logActivity('New Membership Discount', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.addDiscountSchema), HOD(admin.addInitiationDiscount));
router.get('/discountList', auth.required, common.logActivity('New Membership Discount', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.discountList));
router.post('/addUser', auth.required, common.logActivity('App User Management', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'write'), s3upload.any('profile_pic'), HOD(admin.addUser));
router.post('/editUser', auth.required, common.logActivity('App User Management', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'write'), s3upload.any('profile_pic'), HOD(admin.editUser));
router.get('/getAllUsers', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'read'), validateSchemaGet(schema.getAllUsersSchema), HOD(admin.getAllUsers));
router.get('/getUser', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'read'), validateSchemaGet(schema.viewSchema), HOD(admin.getUser));
router.post('/updateUserStatus', auth.required, common.logActivity('App User Management', 'Activate'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'write'), validateSchema(schema.updateItemSchema), HOD(admin.updateUserStatus));
router.get('/getUserPets', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'read'), validateSchemaGet(schema.UserPetsSchema), HOD(admin.getUserPets));
router.get('/getUserPet', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'read'), validateSchemaGet(schema.viewSchema), HOD(admin.getUserPet));
router.get('/getUserFlights', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'read'), HOD(admin.getUserFlights));
router.get('/getEnquiry', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.enQuirySchema), HOD(admin.getEnquiry));
router.post('/updateReadStatus', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.enquiryUpdateSchema), HOD(admin.updateReadStatus));
router.get('/getSingleEnquiry', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.singleviewSchema), HOD(admin.getSingleEnquiry));
router.post('/sendAppUrl', HOD(admin.sendAppUrl));
router.get('/membershipList', auth.required, common.checkAdminOrSubadmin, HOD(admin.membershipList));
router.post('/addVideo', auth.required, s3upload.any('video'), HOD(admin.addVideo));
router.post('/addCareer', auth.required, common.logActivity('Careers', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.addCareerSchema), HOD(admin.addCareer));
router.put('/updateCareer', auth.required, common.logActivity('Careers', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.updateCareerSchema), HOD(admin.updateCareer));
router.get('/getAllCareers', auth.required, common.logActivity('Careers', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.getAllCareers));
router.get('/getCareerbyID', auth.required, common.logActivity('Careers', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.getCareerbyID));
router.get('/deleteCareer', auth.required, common.logActivity('Careers', 'Deactivate'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.deleteCareer));
router.post('/addPilot', auth.required, common.logActivity('Flight Schedules', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.addPilot), HOD(admin.addPilot));
router.put('/updatePilot', auth.required, common.logActivity('Flight Schedules', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.updatePilot), HOD(admin.updatePilot));
router.get('/getAllPilots', auth.required, common.logActivity('Flight Schedules', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getAllPilots), HOD(admin.getAllPilots));
router.get('/getPilotbyID', auth.required, common.logActivity('Flight Schedules', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.getPilotbyID));
router.get('/deletePilot', auth.required, common.logActivity('Flight Schedules', 'Deactivate'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.deletePilot));
router.post('/uploadAnyFiles', auth.required, s3upload.any('files'), HOD(admin.uploadAnyFiles));
router.post('/uploadMultipleFiles', s3upload.any('files'), HOD(admin.uploadMultipleFiles));
router.post('/uploadAnyChatFiles', auth.required, s3uploadchat.any('files'), HOD(admin.uploadAnyChatFiles));
router.post('/uploadMultipleChatFiles', s3uploadchat.any('files'), HOD(admin.uploadMultipleChatFiles));
//validateSchema(schema.addLocation),
router.post('/addLocation', auth.required, common.checkAdminOrSubadmin, HOD(admin.addLocation));
router.get('/getLocation', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.querySchema), HOD(admin.getLocation));
router.post('/addRoute', auth.required, common.logActivity('Flight Schedules', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.addRoute), HOD(admin.addRoute));
router.put('/updateRoute', auth.required, common.logActivity('Flight Schedules', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.updateRoute), HOD(admin.updateRoute));
router.get('/getAllRoutes', auth.required, common.logActivity('Flight Schedules', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.commonSchema), HOD(admin.getAllRoutes));
router.get('/getRoutebyID', auth.required, common.logActivity('Flight Schedules', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.getRoutebyID));
router.get('/deleteRoute', auth.required, common.logActivity('Flight Schedules', 'Deactivate'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.deleteRoute));
router.post('/addFlights', auth.required, common.logActivity('Flight Schedules', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('Flight Schedules', 'write'), validateSchema(schema.addFlights), HOD(admin.addFlights));
router.put('/updateFlight', auth.required, common.logActivity('Flight Schedules', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('Flight Schedules', 'write'), validateSchema(schema.updateFlight), HOD(admin.updateFlight));
router.get('/getAllFlights', auth.required, common.logActivity('Flight Schedules', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('Flight Schedules', 'read'), validateSchemaGet(schema.commonSchema), HOD(admin.getAllFlights));
router.get('/getFlightbyID', auth.required, common.logActivity('Flight Schedules', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('Flight Schedules', 'read'), validateSchemaGet(schema.getCategorySchema), HOD(admin.getFlightbyID));
router.post('/addPet', auth.required, common.logActivity('App User Management', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'write'), s3upload.any(''), HOD(admin.addPet));
router.post('/editPet', auth.required, common.logActivity('App User Management', 'Edit'), common.checkAdminOrSubadmin, common.verifyPermission('App User Management', 'write'), s3upload.any(''), HOD(admin.editPet));
router.get('/breedList', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, HOD(admin.breedList));
router.get('/enquiries', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.enquiryValidationSchema), HOD(admin.enquiries));
router.get('/deleteFlight', auth.required, common.logActivity('Flight Schedules', 'Deactivate'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.deleteFlight));
router.get('/user_jobs_list', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewAllFAQsSchema), HOD(admin.user_jobs_list));
router.get('/getUserJob', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.getUserJob));
router.get('/getLocationById', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.getLocationById));
//validateSchema(schema.updateLocation),
router.put('/updateLocation', auth.required, common.checkAdminOrSubadmin, HOD(admin.updateLocation));
router.get('/deleteLocation', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.getCategorySchema), HOD(admin.deleteLocation));
router.get('/view_investors', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.view_investors));
router.post('/add_blog', auth.required, common.checkAdminOrSubadmin, s3upload.any('profile_pic'), HOD(admin.add_blog));
router.post('/edit_blog', auth.required, common.checkAdminOrSubadmin, s3upload.any('profile_pic'), HOD(admin.edit_blog));
router.get('/get_blog', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.viewSchema), HOD(admin.get_blog));
router.get('/blogs_list', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.commonSchema), HOD(admin.blogs_list));
router.post('/delete_blog', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.viewSchema), HOD(admin.delete_blog));
router.post('/update_blog_status', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.blogStatusSchema), HOD(admin.update_blog_status));
router.post('/update_payment_status', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updatePaymentStatusSchema), HOD(admin.update_payment_status));
router.get('/payment_list', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.payment_list));
router.get('/user_membership_List', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.commonSchema), HOD(admin.user_membership_List));
router.post('/update_user_membership', auth.required, common.logActivity('App User Management', 'Edit'), common.checkAdminOrSubadmin, validateSchema(schema.updateMembershipPriceSchema), HOD(admin.update_user_membership));
router.get('/view_updated_user_membership', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewUpdatedUserMembership), HOD(admin.view_updated_user_membership));
router.get('/view_user_membership', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewUserMembership), HOD(admin.view_user_membership));
router.get('/updated_membership_list', auth.required, common.logActivity('Membership Plans', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.commonSchema), HOD(admin.updated_membership_list));
router.get('/membership_price_history', auth.required, common.logActivity('Membership Plans', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.viewUserMembership), HOD(admin.membership_price_history));
router.post('/add_sale', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.addSaleSchema), HOD(admin.add_sale));
router.post('/edit_discount_price', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.editDiscountPriceSchema), HOD(admin.edit_discount_price));
router.get('/get_all_sale', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.commonSchema), HOD(admin.get_all_sale));
router.get('/get_items_and_boutiques', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.get_items_and_boutiques));
router.post('/sendAnnouncement', auth.required, common.checkAdminOrSubadmin, s3upload.any('image'), HOD(admin.sendAnnouncement));
router.get('/getAnnouncements', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.getAnnouncements));
router.get('/getAnnouncement', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema._idSchema), HOD(admin.getAnnouncement));
router.get('/getUsers', auth.required, common.logActivity('App User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.getUsers));
router.post('/editPaymentMethodStatus', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateItemSchema), HOD(admin.editPaymentMethodStatus));
router.post('/addPaymentGateway', auth.required, common.checkAdminOrSubadmin, common.verifyPermission('Payment Gateways', 'write'), HOD(admin.addPaymentGateway));
router.post('/editPaymentStatus', auth.required, common.checkAdminOrSubadmin, common.verifyPermission('Payment Gateways', 'write'), validateSchema(schema.paymentStatusUpdate), HOD(admin.editPaymentStatus));
router.get('/getPaymentList', auth.required, common.checkAdminOrSubadmin, common.verifyPermission('Payment Gateways', 'read'), validateSchemaGet(schema.paymentGatewayListSchema), HOD(admin.getPaymentList));
router.get('/getPaymentGateway', auth.required, common.checkAdminOrSubadmin, common.verifyPermission('Payment Gateways', 'read'), validateSchemaGet(schema.viewSchema), HOD(admin.getPaymentGateway));
router.get('/getPaymentMethodList', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.getPaymentMethodList));
router.get('/get_upcoming_booking', auth.required, common.checkAdminOrSubadmin, HOD(admin.get_upcoming_booking_list));
router.post('/update_booking_checkedin_status', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateBookingCheckedIn), HOD(admin.update_booking_checkedIn_status));
router.post('/addAdminToGroup', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.addUserToGroupSchema), HOD(admin.addAdminToGroup));
router.post('/updateGuestName', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.updateGuestNameSchema), HOD(admin.updateGuestName));
router.post('/sendInboxMail', auth.required, common.logActivity('Inbox', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.sendInboxMailSchema), HOD(admin.sendInboxMail));
router.post('/reorder', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.reorderSchema), HOD(admin.reorder));
router.post('/addBlackListCard', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.addBlackListCardSchema), HOD(admin.addBlackListCard));
router.get('/listBlackListCards', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.emptySchema), HOD(admin.listBlackListCards));
router.get('/getFaqQuestions', auth.required, common.logActivity('FAQs', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('FAQs', 'read'), validateSchemaGet(schema.getNewCategorySchema), HOD(admin.getFaqQuestions));
router.get('/discountHistory', auth.required, common.logActivity('New Membership Discount', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.querySchema), HOD(admin.discountHistory));
router.get('/getContactUsCategory', auth.required, common.logActivity('Contact Us Category', 'View'), common.checkAdminOrSubadmin, common.verifyPermission('Contact Us Category', 'read'), HOD(admin.getContactUsCategory));
router.post('/addUpdateContactCategory', auth.required, common.logActivity('Contact Us Category', 'Add'), common.checkAdminOrSubadmin, common.verifyPermission('Contact Us Category', 'write'), validateSchema(schema.addUpdateContactCategorySchema), HOD(admin.addUpdateContactCategory));
router.get('/searchSubadmin', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, HOD(admin.searchSubadmin));//validateSchemaGet(schema.searchSubadminSchema)
router.get('/getSubadminSignature', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, HOD(admin.getSubadminSignature));
router.get('/getSelfSignature', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.getSelfSignature), HOD(admin.getSelfSignature));
router.post('/addUpdateSubadminSignature', auth.required, common.logActivity('Admin User Management', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.addUpdateSubadminSignatureSchema), HOD(admin.addUpdateSubadminSignature));
router.post('/deleteContactUsCategory', auth.required, common.logActivity('Contact Us Category', 'Deactivate'), common.checkAdminOrSubadmin, common.verifyPermission('Contact Us Category', 'write'), validateSchema(schema.deleteContactUsCategorySchema), HOD(admin.deleteContactUsCategory));
router.get('/subAdminList', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.subAdminListSchema), HOD(admin.subAdminList));
router.get('/connectDatabase', auth.required, common.checkAdminOrSubadmin, HOD(admin.connectDatabase));
router.get('/getWildduckAccessToken', auth.required, common.checkAdminOrSubadmin, HOD(admin.getWildduckAccessToken));
router.get('/getAdminRole', auth.required, common.logActivity('Admin User Management', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.getAdminRole));
router.post('/addShortcode', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.addShortcodeSchema), HOD(admin.addShortcode));
router.post('/addOrUpdateJobDetails', auth.required, common.logActivity('Careers', 'Add'), common.checkAdminOrSubadmin, validateSchema(schema.addOrUpdateJobDetailsSchema), HOD(admin.addOrUpdateJobDetails));
router.get('/getJobDetails', auth.required, common.logActivity('Careers', 'View'), common.checkAdminOrSubadmin, validateSchemaGet(schema.emptySchema), HOD(admin.getJobDetails));
router.get('/getTransactionList', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.transactionListValidationSchema), HOD(admin.getTransactionList));
router.get('/getTransactionDetail', auth.required, common.checkAdminOrSubadmin, validateSchemaGet(schema.getTransactionDetailSchema), HOD(admin.getTransactionDetail));
router.post('/refund', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.refundSchema), HOD(admin.refund));
router.post('/emailInvoice', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.emailInvoiceSchema), HOD(admin.emailInvoice));
router.post('/downloadInvoice', auth.required, common.checkAdminOrSubadmin, validateSchema(schema.downloadInvoiceSchema), HOD(admin.downloadInvoice));
//router.get('/getAllsFlights', HOD(admin.getAllsFlights));

module.exports = router;