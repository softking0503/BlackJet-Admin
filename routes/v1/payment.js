const express = require('express');
const router = express.Router();
const payment = require('../../controllers/v1/payment');
const auth = require('../../middleware/auth');
const { HOD } = require('../../helpers/v1/common');
const common = require('../../helpers/v1/common');
const middleware = require('../../helpers/middleware');
const validateSchema = require('../../helpers/validation-helper').validateSchema;
const validateSchemaGet = require('../../helpers/validation-helper').validateSchemaGet;
const schema = require('../../helpers/v1/joi-validation');
const { multerUpload, multerUploadLocal } = require('../../helpers/upload');
var multer = require('multer');



router.post('/createPayment', auth.required, common.checkTokenAndStatus, HOD(payment.createPayment));
router.post('/create_payment', HOD(payment.create_payment));
router.get('/getpaymentIntent', HOD(payment.getpaymentIntent));
router.post('/paymentIntentConfirmContinue', HOD(payment.paymentIntentConfirmContinue));

module.exports = router;
