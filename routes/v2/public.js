const dotenv = require('dotenv');
const express = require('express');
const router = express.Router();
const public = require('../../controllers/v2/public');
const { HOD } = require('../../helpers/v2/common');
const common = require('../../helpers/v2/common');
const publicSchema = require('../../helpers/v2/publicSchema');
const middleware = require('../../helpers/middleware');
const validateSchema = require('../../helpers/validation-helper').validateSchema;
const validateSchemaGet = require('../../helpers/validation-helper').validateSchemaGet;
const schema = require('../../helpers/schemas');

const { multerUpload, multerUploadLocal } = require('../../helpers/upload');
const secretManagerAws = require('../../helpers/secretManagerAws');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../../config', '.envs') });
const S3_REGION = process.env.S3_REGION;
var multer = require('multer');

var aws = require('aws-sdk');
var multerS3 = require('multer-s3');
// const credentials = new aws.SharedIniFileCredentials({ profile: "s3" });
// aws.config.credentials = credentials;
// aws.config.update({
//     region: S3_REGION
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


router.post('/addEnQuiry', validateSchema(publicSchema.enquiryValidationSchema), HOD(public.addEnquiry));
router.post('/attachCV', s3upload.any('CV'), HOD(public.attachCV));
router.post('/submitJobApplicaton', validateSchema(publicSchema.submitJobApplicaton), HOD(public.submitJobApplicaton));
router.get('/careers', validateSchemaGet(publicSchema.validationSchema), HOD(public.careers));
router.get('/categoryList', validateSchemaGet(publicSchema.querySchema), HOD(public.categoryList));
router.get('/getFaqQuestions', validateSchemaGet(publicSchema.getCategorySchema), HOD(public.getFaqQuestions));
router.get('/viewLegal', validateSchemaGet(schema.viewSchema), HOD(public.getLegal));
router.get('/viewAllLegal', validateSchemaGet(publicSchema.querySchema), HOD(public.legalList));
router.get('/contact_us_list', validateSchemaGet(publicSchema.querySchema), HOD(public.contact_us_list));
router.get('/getEnquiryList', HOD(public.getEnquiryList));
router.get('/get_all_location', HOD(public.get_all_location));
router.get('/get_all_category', HOD(public.get_all_category));
router.get('/get_career', validateSchemaGet(publicSchema.viewSchema), HOD(public.get_career));
router.get('/viewMembership', validateSchemaGet(publicSchema.viewMembershipSchema), HOD(public.viewMembership));
router.post('/uploadAnyFiles', s3upload.any('files'), HOD(public.uploadAnyFiles));
router.post('/uploadAnyChatFiles', s3uploadchat.any('files'), HOD(public.uploadAnyChatFiles));
router.get('/getChatTime', validateSchemaGet(publicSchema.emptySchema), HOD(public.getChatTime));
router.get('/viewAllSavedLocation', validateSchemaGet(schema.emptySchema), HOD(public.viewAllSavedLocation));
router.get('/checkInviteLink', validateSchemaGet(schema.checkInviteLinkSchema), HOD(public.checkInviteLink));

module.exports = router;
