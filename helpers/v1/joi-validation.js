const Joi = require('joi')

const schema = {

  validateUserLogin: Joi.object().keys({
    email: Joi.string().empty('').email({ tlds: { allow: false } }),
    country_code: Joi.string().empty('').optional(),
    phone_code: Joi.string().empty('').optional(),
    phone: Joi.string().empty('')
  }).or('email', 'phone'),
  validateUserLoginToken: Joi.object().keys({
    email: Joi.string().empty('').email({ tlds: { allow: false } }),
    country_code: Joi.string().empty('').optional(),
    phone_code: Joi.string().empty('').optional(),
    phone: Joi.string().empty(''),
    checkRegType: Joi.string().required()

  }).or('email', 'phone'),

  update_phone: Joi.object().keys({
    country_code: Joi.string().required(),
    phone_code: Joi.string().required(),
    phone: Joi.string().required(),
    otp: Joi.string().regex(/^[0-9]{6}$/).empty('').optional()

  }),
  sendOtpPhone: Joi.object().keys({
    phone_code: Joi.string().required(),
    phone: Joi.string().required()
  }),

  genderData: Joi.object().keys({
    gender: Joi.string().required()
  }),

  OTPrequired: Joi.object().keys({
    otp: Joi.string().regex(/^[0-9]{6}$/).required(),
    firebase_device_token: Joi.string().required(),
    verify_from: Joi.number().empty('').optional(),
    checkRegType: Joi.string().required(),
    email: Joi.string().empty('').email({ tlds: { allow: false } }).optional()

  }),
  email_validate: Joi.object().keys({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    checkRegType: Joi.string().required()

  }),
  checkEmailExist: Joi.object().keys({
    email: Joi.string().email({ tlds: { allow: false } }).required()
  }),
  validate_add_information: Joi.object().keys({
    fullName: Joi.string().required(),
    preferredFirstName: Joi.string().empty('').optional(),
    gender: Joi.string().required(),
    birthday: Joi.string().required(),
    privacyPolicyTermsofUse: Joi.boolean().empty('').optional(),
    checkRegType: Joi.string().required(),
    uniqueCode: Joi.string().empty('').optional(),
    deviceInfo: Joi.object().optional()

  }),
  validate_completion_of_reqgistration: Joi.object().keys({
    occupation: Joi.string().empty('').optional(),
    annual_income: Joi.string().empty('').optional(),
    // pattern(/^[0-9]+$/).required(),
    industries: Joi.array().items(Joi.string().empty('').optional()).empty('').optional()
  }),
  validate_signup_complete: Joi.object().keys({
    occupation: Joi.string().empty('').optional(),
    annual_income: Joi.string().empty('').optional(),
    // pattern(/^[0-9]+$/).required(),
    industries: Joi.array().items(Joi.string().empty('').optional()).empty('').optional()
  }),
  generateReferCodeSchema: Joi.object({
    name: Joi.string().default(''),
    phone_no: Joi.string().allow('').optional(),
    phone_code: Joi.string().allow('').optional(),
  }),
  validate_search: Joi.object({
    search: Joi.string().required(), // Assuming search is a string and is required
  }),
  validate_update_safety_video: Joi.object().keys({
    status: Joi.boolean().required()
  }),
  validate_dob: Joi.object({
    DOB: Joi.date().iso().required(), // Assuming DOB is a string and is required
  }),
  addPayment: Joi.object().keys({
    paymentMethod: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), // Assuming payment_method is a string and is required
    cardholderName: Joi.string().required(),
    cardNumber: Joi.string().required(),
    cardType: Joi.string().required(),
    expiry: Joi.string().required(),
    cvv: Joi.string().required(),
    billingAddress: Joi.object({
      streetAddress: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postCode: Joi.string().required(),
      country: Joi.string().required()
    }).required(),
    membershipAgreement: Joi.boolean().empty('').optional(),
    businessName: Joi.string().empty('').optional(),
    abn: Joi.string().empty('').optional(),
    is_website: Joi.boolean().empty('').optional()
  }),
  validate_lat_long: Joi.object({
    curr_lat: Joi.number().min(-90).max(90).optional(),
    curr_long: Joi.number().min(-180).max(180).optional()
  }),
  notifyBefore2hours: Joi.object({
    curr_lat: Joi.number().min(-90).max(90).required(),
    curr_long: Joi.number().min(-180).max(180).required(),

  }),
  validate_get_flights: Joi.object().keys({
    first_date: Joi.date().iso().required(),
    second_date: Joi.date().iso().empty('').optional(),
    leaving_from: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    arriving_at: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  }),
  validate_get_flights_date: Joi.object().keys({
    leaving_from: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    arriving_at: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  }),
  validate_flight_id: Joi.object({
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    second_flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional() // Assuming flight_id is a string and is required
  }),

  validate_add_guest: Joi.object().keys({
    guest_name: Joi.string().required(),
    guest_phone_code: Joi.string().required(),
    guest_phone: Joi.string().required(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),

  }),
  validate_remove_guest: Joi.object().keys({
    guest_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),

  }),
  validate_search_pet_breed: Joi.object({
    search: Joi.string().required(),
    pet_type: Joi.string().
      valid('Cat', 'Dog').
      required()
  }),
  validate_add_pet: Joi.object().keys({
    pet_profile_pic: Joi.string().empty('').optional(),
    pet_type: Joi.string().
      valid('Cat', 'Dog', '').
      optional(),
    pet_name: Joi.string().empty('').optional(),
    pet_breed: Joi.array().items(Joi.string().empty('')).optional(),
    pet_weight: Joi.string().pattern(/^\d{1,2}$/).empty('').optional(),
    pet_liability_signature: Joi.string().empty('').optional(),
    assistance_animal_proof: Joi.string().empty('').optional(),
    bio: Joi.string().empty('').optional(),
    vets_name: Joi.string().empty('').optional(),
    state: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    vets_license_no: Joi.string().empty('').optional(),
    vets_license_date: Joi.date().iso().empty('').optional(),
    rabbies_vaccine_date: Joi.date().iso().empty('').optional(),
    rabbies_vaccine_valid_to_date: Joi.date().iso().empty('').optional(),
    distemper_vaccine_date: Joi.date().iso().empty('').optional(),
    distemper_vaccine_valid_to_date: Joi.date().iso().empty('').optional(),
    gender: Joi.string().empty('').optional(),
    age: Joi.string().empty('').optional(),


  }),
  validate_edit_pet: Joi.object().keys({
    pet_profile_pic: Joi.string().empty('').optional(),
    pet_type: Joi.string().
      valid('Cat', 'Dog', '').
      optional(),
    pet_name: Joi.string().empty('').optional(),
    pet_breed: Joi.array().items(Joi.string().empty('')).optional(),
    pet_weight: Joi.string().pattern(/^\d{1,2}$/).empty('').optional(),
    pet_liability_signature: Joi.string().empty('').optional(),
    assistance_animal_proof: Joi.string().empty('').optional(),
    bio: Joi.string().empty('').optional(),
    pet_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    vets_name: Joi.string().empty('').optional(),
    state: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    vets_license_no: Joi.string().empty('').optional(),
    vets_license_date: Joi.date().iso().empty('').optional(),
    rabbies_vaccine_date: Joi.date().iso().empty('').optional(),
    rabbies_vaccine_valid_to_date: Joi.date().iso().empty('').optional(),
    distemper_vaccine_date: Joi.date().iso().empty('').optional(),
    distemper_vaccine_valid_to_date: Joi.date().iso().empty('').optional(),
    gender: Joi.string().empty('').optional(),
    age: Joi.string().empty('').optional(),


  }),
  validate_flight_booking: Joi.object().keys({
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    is_booking_confirmed: Joi.boolean().required(),
    is_member_seat: Joi.boolean().required(),
    is_only_guest_seat: Joi.boolean().required(),
    is_only_pet_seat: Joi.boolean().required(),
    is_guest_and_pet_seat: Joi.boolean().required(),
    Total_pet_price_with_gst: Joi.string().empty('').optional(),
    is_pet_on_lap: Joi.boolean().required(),
    Sflight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    Sis_booking_confirmed: Joi.boolean().empty('').optional(),
    Sis_member_seat: Joi.boolean().empty('').optional(),
    Sis_only_guest_seat: Joi.boolean().empty('').optional(),
    Sis_only_pet_seat: Joi.boolean().empty('').optional(),
    Sis_guest_and_pet_seat: Joi.boolean().empty('').optional(),
    STotal_pet_price_with_gst: Joi.string().empty('').optional(),
    Sis_pet_on_lap: Joi.boolean().empty('').optional(),
    pet_pass_used: Joi.number().required(),
    Spet_pass_used: Joi.number().empty('').optional(),
    guest_pass_to_pet_pass: Joi.number().empty('').optional(),
    Sguest_pass_to_pet_pass: Joi.number().empty('').optional()

  }),
  validate_lock_seat: Joi.object().keys({
    add_seat_no: Joi.string().pattern(/^[0-8]$/).required(),
    remove_seat_no: Joi.string().pattern(/^[0-8]$/).required(),
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    guest_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    pet_id: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).empty('').optional(),

  }),
  validate_edit_seat: Joi.object().keys({
    add_seat_no: Joi.string().pattern(/^[0-8]$/).required(),
    remove_seat_no: Joi.string().pattern(/^[0-8]$/).required(),
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    guest_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    pet_id: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).empty('').optional(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),

  }),
  edit_seatV2: Joi.object().keys({
    add_seat_no: Joi.array().items(Joi.object().empty('').optional()).empty('').optional(),
    remove_seat_no: Joi.array().items(Joi.string().pattern(/^[0-8]$/).empty('').optional()).empty('').optional(),
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    // guest_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    pet_id: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).empty('').optional(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    canceled_seat_nos: Joi.array().items(Joi.string().empty('').optional()).empty('').optional(),

  }),
  validate_get_pet_data: Joi.object().keys({
    pet_ids: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()).required(),
  }),
  validate_guest_confirms_booking: Joi.object({
    user_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    guest_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    confirm: Joi.number().valid(1, 0).required(),
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()

  }),
  validate_pet_on_board_request: Joi.object().keys({
    member_response: Joi.number().max(1).valid(1, 0).required(),
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    requested_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  check_booking_status: Joi.object({
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  makePaymentActive: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  changePreference: Joi.object().keys({
    pushNotifications: Joi.boolean().empty('').optional(),
    locationFeature: Joi.boolean().empty('').optional(),
    SyncFlightWithCalendar: Joi.boolean().empty('').optional(),
    displayPreferences: Joi.string().valid('Default', 'Dark', 'Light').empty('').optional(),
    automaticInvoiceToMail: Joi.boolean().empty('').optional()
  }),
  querySchema: Joi.object({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
  }),
  typeSchema: Joi.object({
    type: Joi.string().required()
  }),
  AddContactUs: Joi.object().keys({
    FullName: Joi.string().required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    phone: Joi.string().required(),
    enquiry: Joi.string().required(),
    subject: Joi.string().required(),
    enquiryDetails: Joi.string().required(),
    acctType: Joi.string().optional()
  }),
  heartBeat: Joi.object({
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    Sflight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    type: Joi.string().required(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),

  }),
  AddMembership: Joi.object().keys({
    name: Joi.string().required(),
    price: Joi.string().required(),
    membership_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  purchaseGiftCard: Joi.object().keys({
    giftcardName: Joi.string().required(),
    giftCard_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    recipient_name: Joi.string().required(),
    recipient_number: Joi.string().required(),
    recipient_phone_code: Joi.string().empty('').optional(),
    recipient_country_code: Joi.string().empty('').optional(),
    recipient_message: Joi.string().empty('').optional(),
    delivery_date: Joi.date().iso().empty('').optional(),
    delivery_time: Joi.string().empty('').optional(),
    price: Joi.string().required()
  }),
  editGiftCard: Joi.object().keys({
    recipient_name: Joi.string().empty('').optional(),
    recipient_number: Joi.string().empty('').optional(),
    recipient_phone_code: Joi.string().empty('').optional(),
    recipient_country_code: Joi.string().empty('').optional(),
    recipient_message: Joi.string().empty('').optional(),
    transaction_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    delivery_date: Joi.date().iso().empty('').optional(),
    delivery_time: Joi.string().empty('').optional(),
  }),
  rescheduleDeliveryTime: Joi.object().keys({
    transaction_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    delivery_date: Joi.date().iso().required(),
    delivery_time: Joi.string().required()
  }),
  confirmUpgradeAndPurchase: Joi.object().keys({
    prarataDiff: Joi.string().required(),
    price: Joi.string().required(),
    membership_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  downgradeMembership: Joi.object().keys({
    price: Joi.string().required(),
    membership_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  automaticMailInvoice: Joi.object().keys({
    email: Joi.string().empty('').email({ tlds: { allow: false } })
  }),
  cancelMembershipSchema: Joi.object().keys({
    membership_id: Joi.string().required(),
    status: Joi.string().valid('active', 'inactive').required()
  }),
  getBookingListSchema: Joi.object({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    booking_status: Joi.string()
      .valid('pending', 'confirmed', 'canceled', 'purchase-pending', '')
      .allow(''),
  }),
  buyGuestPasses: Joi.object().keys({
    boutique_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    price: Joi.string().required()
  }),
  redeemGiftCard: Joi.object().keys({
    code: Joi.string().required(),
  }),
  changeRenewalDay: Joi.object().keys({
    membership_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    day: Joi.string().required()
  }),
  changeRenewalDayConfirmPay: Joi.object().keys({
    membership_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    additional_charges: Joi.string().required(),
    new_renewable_date: Joi.date().iso().required()
  }),
  terminateMembership: Joi.object().keys({
    membership_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  }),
  purchaseResetVoucher: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), //reset voucher id
    count: Joi.string().required()
  }),
  resendGiftCard: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), //transaction id
  }),
  reset_passes: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), //booking id
    reset_pet_pass: Joi.number().empty('').optional(),
    reset_guest_pass: Joi.number().empty('').optional(),
    reset_reusable_booking: Joi.number().empty('').optional(),
    total_reset_voucher: Joi.number().empty('').optional(),
    all_reset: Joi.boolean().empty('').optional()

  }),
  validate_delete_pet: Joi.object({
    pet_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), //pet id

  }),
  show_profile: Joi.object({
    is_show: Joi.string().valid('yes', 'no').required(), //'yes' or 'no'

  }),
  snooze: Joi.object({
    snooze_for_1hr: Joi.string().valid('yes', 'no').empty('').optional(), //'yes' or 'no'
    snooze_for_24hr: Joi.string().valid('yes', 'no').empty('').optional(), //'yes' or 'no'
    delete_forever: Joi.string().valid('yes', 'no').empty('').optional(), //'yes' or 'no'
    membership_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    payment_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    boutique_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(), // for guest pass or voucher sale
    announcement_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    show_profile_card: Joi.string().valid('yes', 'no').empty('').optional(),
    survey_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),

  }),

  deviceTokenValidationSchema: Joi.object({
    device_token: Joi.string().required(),
    device_type: Joi.string().valid('ios', 'android').required(),
    type: Joi.string().valid('login', 'logout').required()
  }),

  getBook_another_flights: Joi.object().keys({
    canceled_flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    total_seats_wanted: Joi.string().pattern(/^[1-8]$/).required(),
    with_pet: Joi.boolean().required()
  }),
  notify_at_leaveTime: Joi.object({
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), //'yes' or 'no'
    second_booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(), //'yes' or 'no'

  }),
  oneTimeInitiationPayment: Joi.object().keys({
    status: Joi.string().empty('').optional(),
  }),
  cancelBooking: Joi.object().keys({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    cancel_all: Joi.string().valid('yes', 'no').required(),
    canceled_seat_nos: Joi.array().items(Joi.string().empty('').optional()).empty('').optional(),
    guest_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional()
  }),
  editPayment: Joi.object().keys({
    paymentMethod: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(), // Assuming payment_method is a string and is required
    cardholderName: Joi.string().required(),
    cardNumber: Joi.string().required(),
    expiry: Joi.string().required(),
    cvv: Joi.string().required(),
    billingAddress: Joi.object({
      streetAddress: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postCode: Joi.string().required(),
      country: Joi.string().required()
    }).required(),
    businessName: Joi.string().empty('').optional(),
    membershipAgreement: Joi.boolean().empty('').optional(),
    abn: Joi.string().empty('').optional(),
    payment_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  submitSurvey: Joi.object().keys({
    survey_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), // Assuming payment_method is a string and is required
    user_answer: Joi.array().items(Joi.number().required()).required()
  }),
  validate_edit_guest: Joi.object().keys({
    guest_name: Joi.string().empty('').optional(),
    guest_phone_code: Joi.string().empty('').optional(),
    guest_phone: Joi.string().empty('').optional(),
    guest_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()

  }),
  getReferList: Joi.object({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional()
  }),
  resendSignaturePDF: Joi.object({
    pet_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  cardSchema: Joi.object({
    cardholderName: Joi.string().required(),
    cardNumber: Joi.string().required(),
    cardType: Joi.string().required(),
    expiry: Joi.string().required(),
    cvv: Joi.string().required(),
    billingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zip: Joi.string().required(),
      country: Joi.string().required()
    }).required()
  }),
  viewSchema: Joi.object({
    id: Joi.string().required(), // Assuming id is a string and is required
  }),
  validate_getVeriffResponse: Joi.object().keys({
    type: Joi.string().required(),
    submitdate: Joi.string().required()
  }),
  redeemGuestPasses: Joi.object({
    _id: Joi.string().required(),
    user_id: Joi.string().required(),
    send_to: Joi.string().required()
  }),
  routesSchema: Joi.object({
    fromCity: Joi.string().required().trim().min(1),
    curr_lat: Joi.number().min(-90).max(90).optional(),
    curr_long: Joi.number().min(-180).max(180).optional()
  }),

  resendGuestBookingMessageSchema: Joi.object().keys({
    guest_name: Joi.string().required(),
    guest_phone_code: Joi.string().required(),
    guest_phone: Joi.string().required(),
    booking_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()

  }),

  emptySchema: Joi.object({
    // Define any expected query parameters (in this case, none are expected)
  }).unknown(false),

}
module.exports = schema;