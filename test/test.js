const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.envtest') });
const membership_settings = require('../models/membership_settings');
const userModal = require('../models/users.model');
const tempUserModal = require('../models/tempUsers');
const userMembershipModal = require('../models/userMembership');
let twilioCountryModel = require('../models/twilioCountry');
const jwt = require('jsonwebtoken');
const mail = require('../helpers/mailer');
const planAndpricingModal = require("../models/membership");
const paymentModal = require("../models/card");
const priceModal = require("../models/price");
const discountModal = require("../models/discount");
const shortCodeModal = require("../models/shortCode");
const commonservices = require("../helpers/v2/common");

jest.mock('../models/membership_settings');
jest.mock('../models/users.model');
jest.mock('../models/tempUsers', () => { return jest.fn() });
jest.mock('../models/userMembership');
jest.mock('../models/twilioCountry');
jest.mock('jsonwebtoken');
jest.mock('../helpers/mailer');
jest.mock('../models/membership');
jest.mock('../models/card');
jest.mock('../models/price');
jest.mock('../models/discount');
jest.mock('../models/shortCode');
jest.mock('../helpers/v2/common');
// jest.mock('../helpers/response');

let login = require('../controllers/v2/user').login;
describe('login function', () => {
  let req, res;
  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('should return an error if phone is not valid', async () => {
    req.body = { phone: 'invalidPhone' };
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      "data": [],
      "message": 'Please Enter Valid Phone!',
      "status_code": 400,
      "success": false
    });
  });

  it('should return an error if country code is not supported by Twilio', async () => {
    req.body = { phone: '1234567890', country_code: 'TTT', phone_code: '+999' };
    twilioCountryModel.findOne.mockResolvedValue(null);
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(406);
    expect(res.json).toHaveBeenCalledWith({
      "status_code": 406,
      "success": false,
      message: 'Unfortunately, we do not support phone numbers with +999 country code'
    });
  });

  it('should return an error if Twilio country color is red', async () => {
    req.body = { phone: '1234567890', country_code: 'AFG', phone_code: '+93' };
    twilioCountryModel.findOne.mockResolvedValue({ colour: 'red' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(406);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unfortunately, we do not support phone numbers with +93 country code',
      "status_code": 406,
      "success": false,
    });
  });

  // it('should create a new user if phone does not exist', async () => {
  //   req.body = { phone: '1234567890', country_code: 'US', phone_code: '+1' };
  //   twilioCountryModel.findOne.mockResolvedValue({ colour: 'green' });
  //   userModal.findOne.mockResolvedValue(null);
  //   tempUserModal.prototype.save = jest.fn().mockResolvedValue(true);
  //   tempUserModal.findOne.mockResolvedValue(null);
  //   membership_settings.findOne.mockResolvedValue({ is_demo_process: true, preOrder: false });
  //   jwt.sign.mockReturnValue('token');
  //   userMembershipModal.findOne.mockResolvedValue(null);

  //   await login(req, res);

  //   //expect(tempUserModal.prototype.save).toHaveBeenCalled();
  //   expect(res.status).toHaveBeenCalledWith(200);
  //   expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ "data": {"country_code": undefined, "email": "test@example.com", "email_verified": undefined, "is_demo_process": true, "is_information_page_completed": undefined, "is_membership_payment_page_completed": undefined, "is_membership_purchased": false, "newUser": false, "onboard_status": undefined, "otp": "", "otp_verified": undefined, "phone": undefined, "phone_code": undefined, "phone_verified": undefined, "preOrder": false, "profile_pic": undefined, "randomString": undefined, "status": undefined}, "message": "Successfully logged in.", "status_code": 200, "success": true }));
  // });

  it('should return an error if email format is invalid', async () => {
    req.body = { email: 'invalidEmail' };
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      data: [],
      message: "Invalid Email Format!",
      status_code: 400,
      success: false
    });
  });

  // it('should create a new user if email does not exist', async () => {
  //   req.body = { email: 'test@example.com' };
  //   userModal.findOne.mockResolvedValue(null);
  //   tempUserModal.prototype.save = jest.fn().mockResolvedValue(true);
  //   membership_settings.findOne.mockResolvedValue({ is_demo_process: true, preOrder: false });
  //   jwt.sign.mockReturnValue('token');
  //   userMembershipModal.findOne.mockResolvedValue(null);
  //   mail.sendMailVerification = jest.fn().mockResolvedValue(true);

  //   await login(req, res);

  //   expect(tempUserModal.prototype.save).toHaveBeenCalled();
  //   expect(mail.sendMailVerification).toHaveBeenCalled();
  //   expect(res.status).toHaveBeenCalledWith(200);
  //   expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
  //     message: 'Successfully logged in.',
  //     data: {"country_code": undefined, "email": "test@example.com", "email_verified": undefined, "is_demo_process": true, "is_information_page_completed": undefined, "is_membership_payment_page_completed": undefined, "is_membership_purchased": false, "newUser": false, "onboard_status": undefined, "otp": "", "otp_verified": undefined, "phone": undefined, "phone_code": undefined, "phone_verified": undefined, "preOrder": false, "profile_pic": undefined, "randomString": undefined, "status": undefined}, "status_code": 200, "success": true

  //   }));
  // });

  // it('should return an error if user is inactive', async () => {
  //   req.body = { phone: '1234567890', country_code: 'US', phone_code: '+1' };
  //   twilioCountryModel.findOne.mockResolvedValue({ colour: 'green' });
  //   userModal.findOne.mockResolvedValue({ status: 'inactive' });

  //   await login(req, res);

  //   expect(res.status).toHaveBeenCalledWith(400);
  //   expect(res.json).toHaveBeenCalledWith({
  //     data: [],
  //     message: 'User is Inactive!',
  //     status_code: 400,
  //     success: false
  //   });
  // });

  it('should return an error if no phone or email is provided', async () => {
    req.body = {};
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      data: {}, message: 'Phone/Email is required!', status_code: 422,
      success: false
    });
  });

  // it('should return a success response if existing phone user is found', async () => {
  //   req.body = { phone: '1234567890', country_code: 'US', phone_code: '+1' };
  //   twilioCountryModel.findOne.mockResolvedValue({ colour: 'green' });
  //   userModal.findOne.mockResolvedValue({ status: 'active', _id: 'existingUserId', phone: '1234567890' });
  //   userMembershipModal.findOne.mockResolvedValue(null);
  //   jwt.sign.mockReturnValue('token');
  //   userModal.findOneAndUpdate.mockResolvedValue({
  //     _id: 'existingUserId',
  //     phone: '1234567890',
  //     token: 'token',
  //     otp: '123456'
  //   });
  //   membership_settings.findOne.mockResolvedValue({ is_demo_process: true, preOrder: false });

  //   await login(req, res);

  //   expect(userModal.findOneAndUpdate).toHaveBeenCalled();
  //   expect(res.status).toHaveBeenCalledWith(200);
  //   expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
  //     message: 'Successfully logged in.',
  //     data: {"country_code": undefined, "email": "test@example.com", "email_verified": undefined, "is_demo_process": true, "is_information_page_completed": undefined, "is_membership_payment_page_completed": undefined, "is_membership_purchased": false, "newUser": false, "onboard_status": undefined, "otp": "", "otp_verified": undefined, "phone": undefined, "phone_code": undefined, "phone_verified": undefined, "preOrder": false, "profile_pic": undefined, "randomString": undefined, "status": undefined}, "status_code": 200, "success": true
  //   }));
  // });

  it('should return a success response if existing email user is found', async () => {
    req.body = { email: 'test@example.com' };
    userModal.findOne.mockResolvedValue({ status: 'active', _id: 'existingUserId', email: 'test@example.com' });
    userMembershipModal.findOne.mockResolvedValue(null);
    jwt.sign.mockReturnValue('token');
    userModal.findOneAndUpdate.mockResolvedValue({
      _id: 'existingUserId',
      email: 'test@example.com',
      token: 'token',
      otp: '123456'
    });
    membership_settings.findOne.mockResolvedValue({ is_demo_process: true, preOrder: false });
    mail.sendMailOTPVerification = jest.fn().mockResolvedValue(true);

    await login(req, res);

    expect(userModal.findOneAndUpdate).toHaveBeenCalled();
    expect(mail.sendMailOTPVerification).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Successfully logged in.',
      data: { "country_code": undefined, "email": "test@example.com", "email_verified": undefined, "is_demo_process": true, "is_information_page_completed": undefined, "is_membership_payment_page_completed": undefined, "is_membership_purchased": false, "newUser": false, "onboard_status": undefined, "otp": "", "otp_verified": undefined, "phone": undefined, "phone_code": undefined, "phone_verified": undefined, "preOrder": false, "profile_pic": undefined, "randomString": undefined, "status": undefined }, "status_code": 200, "success": true
    }));
  });

  it('should handle server error gracefully', async () => {
    req.body = { phone: '1234567890', country_code: 'US', phone_code: '1' };
    twilioCountryModel.findOne.mockRejectedValue(new Error('Server Error'));
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error', "status_code": 500, "success": false });
  });
});
