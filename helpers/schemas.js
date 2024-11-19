const Joi = require('joi')

const schema = {
  registerSchema: Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    email: Joi.string().email().required(),
    country_code: Joi.string().allow('').optional(),
    password: Joi.string().required(),
    phone: Joi.string().allow('').optional(),
    roles_array: Joi.array().items(
      Joi.object({
        role_id: Joi.string().required(),
        role_status: Joi.string().valid('read', 'write').required(), // Adjust the valid roles as needed
      })
    ),
  }),

  validateLogin: Joi.object().keys({
    email: Joi.string().empty(''),
    phone: Joi.string().empty(''),
    password: Joi.string().required(),
  }).or('email', 'phone'),

  validateUpdate: Joi.object().keys({
    id: Joi.string().required(),
    first_name: Joi.string().required(),
    email: Joi.string().email().required(),
    last_name: Joi.string().required(),
    country_code: Joi.string().allow('').optional(),
    password: Joi.string().required(),
    phone: Joi.string().allow('').optional(),
    roles_array: Joi.array().items(
      Joi.object({
        role_id: Joi.string().required(),
        role_status: Joi.string().valid('read', 'write').required(), // Adjust the valid roles as needed
      })
    ),
  }),

  validateUpdatePassword: Joi.object().keys({
    id: Joi.string().required(),
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
    confirmPassword: Joi.string().required(),
  }),

  validateAdminProfile: Joi.object().keys({
    id: Joi.string().required()
  }),

  validateAllAdminProfiles: Joi.object().keys({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    role: Joi.string().optional(),
    name: Joi.string().optional(),
  }),

  transactionListValidationSchema: Joi.object({
    userId: Joi.string().required(),
    skip: Joi.number().integer().empty('').optional(),
    limit: Joi.number().integer().empty('').optional(),
  }),

  getTransactionDetailSchema: Joi.object({
    transactionId: Joi.string().required()
  }),

  refundSchema: Joi.object({
    userId: Joi.string().required(),
    effectiveCancelDate: Joi.date().required(),
    transactionId: Joi.string().required()
  }),

  emailInvoiceSchema: Joi.object({
    userId: Joi.string().required(),
    transactionId: Joi.string().required()
  }),

  downloadInvoiceSchema: Joi.object({
    transactionId: Joi.string().required()
  }),


  // addUserSchema: Joi.object({
  //   fullName: Joi.string().required(),
  //   preferredFirstName: Joi.string().optional(),
  //   gender: Joi.string().valid('male', 'female', 'other').required(),
  //   email: Joi.string().email().required(),
  //   country_code: Joi.string().required(),
  //   phone: Joi.string().required(),
  //   password: Joi.string().optional(),
  //   birthday: Joi.date().iso().optional(),
  // }),

  validateBreakEdit: Joi.object().keys({
    id: Joi.number().required(),
  }),

  validateBreakAdd: Joi.object().keys({
    participant_id: Joi.number().required(),
    from: Joi.string().required(),
    to: Joi.string().required(),
    credit: Joi.string().required()
  }),

  validateBreakUpdate: Joi.object().keys({
    id: Joi.string().required(),
    from: Joi.string().required(),
    to: Joi.string().required(),
    credit: Joi.string().required()
  }),

  querySchema: Joi.object({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
  }),
  getAllPilots: Joi.object({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    search: Joi.string().empty('').optional()
  }),

  commonSchema: Joi.object({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    search: Joi.string().empty('').optional()
  }),

  updateMembershipPriceSchema: Joi.object({
    id: Joi.string().required(),
    user_id: Joi.string().required(),
    price: Joi.string().required(),
    changed_price: Joi.string().required(),
    change_date: Joi.date().allow(''),
    mail_message: Joi.string().allow('').required(),
  }),

  viewUpdatedUserMembership: Joi.object({
    user_membership_id: Joi.string().required(),
  }),

  viewUserMembership: Joi.object({
    id: Joi.string().required()
  }),

  getCategorySchema: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),

  updateItemSchema: Joi.object({
    id: Joi.string().required(), // Assuming id is a string and is required
    status: Joi.string().valid('active', 'inactive', 'delete').required(), // Modify allowed values as needed
  }),

  commonUpdateSchema: Joi.object({
    _id: Joi.string().required(), // Assuming id is a string and is required
    status: Joi.string().valid('active', 'inactive').required(), // Modify allowed values as needed
  }),

  editDowngradeSchema: Joi.object({
    id: Joi.string().required(), // Assuming it's a MongoDB ObjectId
    name: Joi.string().required(),
    downgradeArray: Joi.array().items(
      Joi.object({
        downgrade: Joi.string().optional(),
        check: Joi.boolean().default(true)
      })
    ).optional(),
    downgradeText: Joi.string().optional()
  }),
  // // Define Joi schema for gateway percentages object
  // gatewayPercentagesSchema: Joi.object({
  //   percentages: Joi.object().pattern(Joi.string(), Joi.number().required()).required(),
  //   paymentType: Joi.string().valid('masterCard', 'visa', 'amex').default('masterCard').required(),
  //   enabled: Joi.boolean().default(true).required()
  // }),

  // // Define Joi schema for paymentArray object
  // paymentArraySchema: Joi.array().items(Joi.object({
  //   region: Joi.string().valid('Australia', 'Non-Australia').required(),
  //   gatewayPercentages: Joi.array().items(gatewayPercentagesSchema).required()
  // })),

  // // Define Joi schema for the entire paymentGatewaySchema
  // paymentGatewaySchemaJoi: Joi.object({
  //   paymentArray: paymentArraySchema.required(),
  //   status: Joi.string().valid('active', 'inactive').default('active')
  // }),


  paymentStatusUpdate: Joi.object({
    id: Joi.string().required(),
    enabled: Joi.boolean().required()
  }),

  paymentGatewayListSchema: Joi.object({
    // type: Joi.array().items(Joi.string()).single() // Specifies that type should be an array of strings
  }),

  editItemSchema: Joi.object({
    id: Joi.string().required(), // Assuming id is a string and is required
    name: Joi.string().required(),
    gst: Joi.string().allow('').required()
  }),

  viewSchema: Joi.object({
    id: Joi.string().required() // Assuming id is a string and is required
  }),
  singleviewSchema: Joi.object({
    id: Joi.string().required(), // Assuming id is a string and is required
    mailbox: Joi.string().required()
  }),

  addItemSchema: Joi.object({
    name: Joi.string().required(),
    gst: Joi.string().allow('').required()
  }),

  // addHomePageSchema: Joi.object({
  //   text: Joi.string().required(),
  //   image_text: Joi.string().required()
  // }),

  // testimonialDataSchema: Joi.object({
  //   image: Joi.string().uri().required(),
  //   comment: Joi.string().required(),
  //   name: Joi.string().required(),
  // }),

  updateHomePageSchema: Joi.object({
    status: Joi.string().valid('active', 'inactive').required(), // Modify allowed values as needed
  }),

  addSaleSchema: Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('item', 'boutique').required(),
    flash_sale: Joi.boolean().required(),
    sale_start_date_time: Joi.date().allow(null, ''),
    sale_end_date_time: Joi.date().allow(null, ''),
    discount_price: Joi.string().allow(null, '')
  }),

  editDiscountPriceSchema: Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('item', 'boutique').required(),
    discount_price: Joi.string().required(),
  }),

  priceHistorySchema: Joi.object({
    id: Joi.string().required(), // Assuming id is a string and is required
    type: Joi.number().valid(1, 2, 3).required(), // Assuming type is a number and should be one of 1, 2, or 3
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional()
  }),

  addPriceSchema: Joi.object({
    membership: Joi.string().when('type', { is: 'membership', then: Joi.required(), otherwise: Joi.allow('') }),
    items: Joi.string().when('type', { is: 'item', then: Joi.required(), otherwise: Joi.allow('') }),
    boutique: Joi.string().when('type', { is: 'boutique', then: Joi.required(), otherwise: Joi.allow('') }),
    type: Joi.string().valid('membership', 'item', 'boutique').required(),
    delete_ids: Joi.string().allow('').optional(),
    schedule_prices: Joi.array().items(
      Joi.object({
        _id: Joi.string(),
        // type: Joi.string().valid('membership', 'item', 'boutique').required(),
        // membership: Joi.when('type', { is: 'membership', then: Joi.string().required() }),
        // items: Joi.when('type', { is: 'item', then: Joi.string().required() }),
        // boutique: Joi.when('type', { is: 'boutique', then: Joi.string().required() }),
        price: Joi.number().required(),
        initiationFees: Joi.number().allow('').optional(),
        no_of_month: Joi.string().allow('').optional(),
        discount_price: Joi.string().allow('').optional(),
        effectiveDate: Joi.date().required(),
        effectiveEndDate: Joi.date().allow(null).optional(), // Allow empty effectiveEndDate
      })
    ).required(),
  }),

  editPriceSchema: Joi.object({
    id: Joi.string().required(),
    price: Joi.number().min(0).required(),
    initiationFees: Joi.number().min(0).optional(),
    effectiveDate: Joi.date().iso().optional(),
    type: Joi.string().valid('membership', 'item', 'boutique').required(),
  }),

  editMembershipSchema: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    bannerTag: Joi.string().allow('').optional(),
    content: Joi.string().allow('').optional(),
    text: Joi.string().allow('').optional(), // Make text optional in Joi schema
    highlightsArray: Joi.array().items(Joi.object({
      highlight: Joi.string().trim().required(),
      strikeThroughHighlight: Joi.string().trim().allow('').optional(),
      check: Joi.boolean().default(true)
    })).optional()
  }),
  setMembershipPreorderSchema: Joi.object({
    preorderOn: Joi.boolean().default(false),
  }),

  addMembershipSchema: Joi.object({
    name: Joi.string().required(),
    bannerTag: Joi.string().allow('').optional(),
    content: Joi.string().allow('').optional(),
    text: Joi.string().required(),
    highlightsArray: Joi.array().items(Joi.object({
      highlight: Joi.string().trim().required(),
      strikeThroughHighlight: Joi.string().trim().allow('').optional(),
      check: Joi.boolean().default(true)
    })).optional()
  }),

  viewAllFAQsSchema: Joi.object({
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    search: Joi.string().allow('').optional(),
    category: Joi.string().allow('').optional(),
  }),

  addContentSchema: Joi.object({
    type_of_content: Joi.string().required(),
    message: Joi.string().required(),
  }),

  contentListSchema: Joi.object({
    type_of_content: Joi.string().required(),
  }),

  addFaqSchema: Joi.object({
    question: Joi.string().required(),
    answer: Joi.string().required(),
    section_description: Joi.string().allow('').optional(),
    section_heading: Joi.string().allow('').optional(),
    title: Joi.string().required(),
    category: Joi.array().items(Joi.string().required()).required(),
    delta_text: Joi.string().allow('').optional()
  }),

  editFaqSchema: Joi.object({
    id: Joi.string().required(),
    question: Joi.string().required(),
    answer: Joi.string().required(),
    section_description: Joi.string().allow('').optional(),
    section_heading: Joi.string().allow('').optional(),
    title: Joi.string().required(),
    category: Joi.array().items(Joi.string().required()).required(),
    delta_text: Joi.string().allow('').optional()
  }),

  addBoutiqueItemSchema: Joi.object({
    name: Joi.string().required(),
    card_title: Joi.string().allow('').optional(),
    card_content: Joi.string().allow('').optional(),
    gift_card: Joi.boolean().default(false),
    product_set: Joi.string().allow('').optional(),
    discount_price: Joi.string().allow('').optional(),
    is_month: Joi.boolean().optional().truthy('true', true).falsy('false', false).empty(''),
    no_of_month: Joi.string().allow('').optional(),
    membership: Joi.string().allow('').optional(),
  }),

  editBoutiqueItemSchema: Joi.object({
    id: Joi.string().required(),
    name: Joi.string(),
    card_title: Joi.string().allow('').optional(),
    card_content: Joi.string().allow('').optional(),
    gift_card: Joi.boolean().default(false),
    product_set: Joi.string().allow('').optional(),
    discount_price: Joi.string().allow('').optional(),
    is_month: Joi.boolean().optional().truthy('true', true).falsy('false', false).empty(''),
    no_of_month: Joi.string().allow('').optional(),
    membership: Joi.string().allow('').optional(),
  }),

  updatePriceSchema: Joi.object({
    id: Joi.string().required(),
    effectiveDate: Joi.string().isoDate(), // Validate that effectiveDate is a valid ISO date string
    effectiveEndDate: Joi.string().isoDate().allow('', null), // Validate effectiveEndDate as an ISO date or allow it to be an empty string or null
  }).or('effectiveDate', 'effectiveEndDate'), // Require at least one of effectiveDate or effectiveEndDate

  legalSchema: Joi.object({
    legalTitle: Joi.string().required(),
    legalContent: Joi.string().required(),
    status: Joi.string().valid('active', 'inactive').default('active'),
    delta_text: Joi.string().allow('').optional()
  }),

  editLegalSchema: Joi.object({
    id: Joi.string().required(),
    legalTitle: Joi.string().required(),
    legalContent: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').default('active'),
    trigger_mail: Joi.boolean().default(false),
    delta_text: Joi.string().allow('').optional()
  }),

  contactUsSchema: Joi.object({
    id: Joi.string().optional(),
    name: Joi.string().required().trim(),
    email: Joi.string().email().required(),
    subject: Joi.string().required(),
    message: Joi.string().required(),
    phone: Joi.string().required().trim(),
    phone_code: Joi.string().required().trim(),
  }),

  emptySchema: Joi.object({
    // Define any expected query parameters (in this case, none are expected)
  }).unknown(false),

  subAdminListSchema: Joi.object({
    group_id: Joi.string().allow('').optional(),
  }),

  addSavedLocationSchema: Joi.object({
    id: Joi.string().allow('').optional(), // ID of the saved location
    faqsLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().optional() // FAQ location ID, can be null or a valid ObjectId
      })
    ).optional(), // Optional array, allows empty array
    aboutUsLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().required() // About Us location ID, must be a valid ObjectId
      })
    ).optional(), // Optional array
    legalLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().required() // Legal location ID, must be a valid ObjectId
      })
    ).optional(), // Optional array
    contactUsLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().required() // Contact Us location ID, must be a valid ObjectId
      })
    ).optional(), // Optional array
    careersLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().required() // Careers location ID, must be a valid ObjectId
      })
    ).optional(), // Optional array
    mediaPressLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().required() // Media Press location ID, must be a valid ObjectId
      })
    ).optional(), // Optional array
    investorsLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().required() // Investors location ID, must be a valid ObjectId
      })
    ).optional(), // Optional array
    newsLocationIds: Joi.array().items(
      Joi.object({
        _id: Joi.string().required() // News location ID, must be a valid ObjectId
      })
    ).optional(), // Optional array
  }),

  requestSchema: Joi.object({
    type: Joi.string()
      .valid('contact_us', 'about_us', 'legal', 'faq', 'media_press', 'investors', 'careers')
      .required(),
    id: Joi.string().required(),
  }),

  discountTierSchema: Joi.object({
    discount_id: Joi.string().required(),
    tier: Joi.array().items(Joi.object({
      discount_price: Joi.string().required(),
      no_of_seats: Joi.number().integer().positive().required(),
    })).required(),
  }),

  addDiscountSchema: Joi.object({
    discount_alias_name: Joi.string().required(),
    membership_id: Joi.string().required(), // Adjust the type as needed
    start_date: Joi.date().required(),
    end_date: Joi.date().allow(''),
    total_seats: Joi.number().allow('').optional(),
    initiation_fees: Joi.string().allow('').optional(),
    indefinite_end_date: Joi.string().valid('true', 'false').default('false'),
    indefinite_seats: Joi.string().valid('true', 'false').default('false'),
    tier: Joi.array().items(Joi.object({
      discount_price: Joi.string().allow('').optional(),
      no_of_seats: Joi.number().allow('').optional(),
    })).required(),
    // tierIds: Joi.string().allow('').optional(), // Assuming it's a comma-separated string of IDs
    // discount_structure: Joi.array().items(Joi.object({
    //   fees: Joi.string().required(),
    //   no_of_seats: Joi.number().required(),
    // })).required(),
  }),

  updateDiscountSchema: Joi.object({
    discount_id: Joi.string().required(),
    discount_alias_name: Joi.string().required(),
    membership_id: Joi.string().required(),
    start_date: Joi.string().isoDate().required(),
    end_date: Joi.date().allow(''),
    total_seats: Joi.number().integer().allow('').optional(),
    initiation_fees: Joi.string().allow('').optional(),
    indefinite_end_date: Joi.string().valid('true', 'false').default('false'),
    indefinite_seats: Joi.string().valid('true', 'false').default('false'),
    tier: Joi.array().items(
      Joi.object({
        discount_price: Joi.string().allow('').optional(),
        no_of_seats: Joi.number().allow('').optional(),
        claim_seat: Joi.number().allow('').optional(),
      })
    ).required(),
  }),

  addCareerSchema: Joi.object({
    job_name: Joi.string().required(),
    job_type_id: Joi.string().required(), // ObjectId as a string
    job_location_id: Joi.string().required(), // ObjectId as a string
    job_category_id: Joi.string().required(), // ObjectId as a string
    requirements: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      order: Joi.number().integer().optional()
    })).optional()
  }),

  updateCareerSchema: Joi.object({
    career_id: Joi.string().required(), // ObjectId of the career to update
    job_name: Joi.string().optional(),
    job_type_id: Joi.string().optional(), // ObjectId as a string
    job_location_id: Joi.string().optional(), // ObjectId as a string
    job_category_id: Joi.string().optional(), // ObjectId as a string
    requirements: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      order: Joi.number().integer().optional()
    })).optional()
  }),


  enQuirySchema: Joi.object({
    type: Joi.string()
      .valid('contact_us', 'about_us', 'legal', 'media_press', 'sales', 'support', 'partnerships', 'something_else', 'general', 'investors', 'faq', 'careers', '')
      .allow(''), // Allow an empty string as a valid value
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    search: Joi.string().allow('').optional(),
  }),

  UserPetsSchema: Joi.object({
    id: Joi.string().required(), // Assuming id is required
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    search: Joi.string().allow('').optional(),
  }),

  enquiryUpdateSchema: Joi.object({
    id: Joi.string().required(),
    type: Joi.string().allow('').optional(),
    // isRead: Joi.allow('').optional(),
    isRead: Joi.boolean().optional().truthy('true', true).falsy('false', false).empty(''),
    status: Joi.string().allow('').optional()
  }).or('type', 'isRead', 'status'),


  addPilot: Joi.object().keys({
    first_name: Joi.string().empty('').optional(),
    last_name: Joi.string().empty('').optional(),
    dateOfBirth: Joi.date().iso().empty('').optional(),
    phone: Joi.string().empty('').optional(),
    email: Joi.string().email({ tlds: { allow: false } }).empty('').optional(),
    phone_code: Joi.string().empty('').optional(),
    Address: Joi.string().empty('').optional(),
    Nationality: Joi.string().empty('').optional(),
    Photo: Joi.string().empty('').optional(),
    LicenseNumber: Joi.string().empty('').optional(),
    LicenseType: Joi.string().empty('').optional(),
    LiIssuingAuthority: Joi.string().empty('').optional(),
    LiDateOfIssue: Joi.date().iso().empty('').optional(),
    LiExpirationDate: Joi.date().iso().empty('').optional(),
    FlightSchoolAttended: Joi.string().empty('').optional(),
    Certifications: Joi.array().items(Joi.string().empty('')).optional(),
    TotalFlightHr: Joi.number().empty('').optional(),
    FlightHrByAircraftType: Joi.number().empty('').optional(),
    SpecialQualifications: Joi.array().items(Joi.string().empty('')).optional(),
    MedicalCertType: Joi.string().empty('').optional(),
    MeIssuingDoctor: Joi.string().empty('').optional(),
    MeDateOfIssue: Joi.date().iso().empty('').optional(),
    MeExpiryDate: Joi.date().iso().empty('').optional(),
    MeRestrictions: Joi.string().empty('').optional(),
    ScannedCopiesOfLiCert: Joi.array().items(Joi.string().empty('')).optional(),
    PassportCopy: Joi.string().empty('').optional(),
    AnyOtherDocs: Joi.array().items(Joi.string().empty('')).optional(),
    BackgroundChecksStatus: Joi.string().empty('').optional(),
    SecurityClearanceLevel: Joi.string().empty('').optional(),
    EmergencyName: Joi.string().empty('').optional(),
    EmergencyRelation: Joi.string().empty('').optional(),
    EmergencyPhone: Joi.string().empty('').optional(),
    EmergencyEmail: Joi.string().empty('').optional(),
    EmergencyPhoneCode: Joi.string().empty('').optional(),

  }),

  updatePilot: Joi.object().keys({
    pilot_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    first_name: Joi.string().empty('').optional(),
    last_name: Joi.string().empty('').optional(),
    dateOfBirth: Joi.date().iso().empty('').optional(),
    phone: Joi.string().empty('').optional(),
    email: Joi.string().email({ tlds: { allow: false } }).empty('').optional(),
    phone_code: Joi.string().empty('').optional(),
    Address: Joi.string().empty('').optional(),
    Nationality: Joi.string().empty('').optional(),
    Photo: Joi.string().empty('').optional(),
    LicenseNumber: Joi.string().empty('').optional(),
    LicenseType: Joi.string().empty('').optional(),
    LiIssuingAuthority: Joi.string().empty('').optional(),
    LiDateOfIssue: Joi.date().iso().empty('').optional(),
    LiExpirationDate: Joi.date().iso().empty('').optional(),
    FlightSchoolAttended: Joi.string().empty('').optional(),
    Certifications: Joi.array().items(Joi.string().empty('')).optional(),
    TotalFlightHr: Joi.number().empty('').optional(),
    FlightHrByAircraftType: Joi.number().empty('').optional(),
    SpecialQualifications: Joi.array().items(Joi.string().empty('')).optional(),
    MedicalCertType: Joi.string().empty('').optional(),
    MeIssuingDoctor: Joi.string().empty('').optional(),
    MeDateOfIssue: Joi.date().iso().empty('').optional(),
    MeExpiryDate: Joi.date().iso().empty('').optional(),
    MeRestrictions: Joi.string().empty('').optional(),
    ScannedCopiesOfLiCert: Joi.array().items(Joi.string().empty('')).optional(),
    PassportCopy: Joi.string().empty('').optional(),
    AnyOtherDocs: Joi.array().items(Joi.string().empty('')).optional(),
    BackgroundChecksStatus: Joi.string().empty('').optional(),
    SecurityClearanceLevel: Joi.string().empty('').optional(),
    EmergencyName: Joi.string().empty('').optional(),
    EmergencyRelation: Joi.string().empty('').optional(),
    EmergencyPhone: Joi.string().empty('').optional(),
    EmergencyEmail: Joi.string().empty('').optional(),
    EmergencyPhoneCode: Joi.string().empty('').optional(),
  }),

  addLocation: Joi.object().keys({
    city_name: Joi.string().required(),
    airport_abbreviation: Joi.string().required(),
    lat: Joi.string().empty('').optional(),
    long: Joi.string().empty('').optional(),
    image: Joi.string().required(),
    state_name: Joi.string().required()
  }),

  updateLocation: Joi.object().keys({
    city_name: Joi.string().empty('').optional(),
    airport_abbreviation: Joi.string().empty('').optional(),
    lat: Joi.string().empty('').optional(),
    long: Joi.string().empty('').optional(),
    image: Joi.string().empty('').optional(),
    state_name: Joi.string().empty('').optional(),
    location_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),

  // addState: Joi.object().keys({
  //   state_name: Joi.string().required()
  // }),
  addRoute: Joi.object().keys({
    route_name: Joi.string().required(),
    toCity: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    fromCity: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),

  updateRoute: Joi.object().keys({
    route_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    route_name: Joi.string().required(),
    toCity: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    fromCity: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),

  enquiryValidationSchema: Joi.object({
    type: Joi.string().required(),
  }),

  addFlights: Joi.object().keys({
    flight_name: Joi.string().required(),
    route: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    day: Joi.array().items(Joi.string()).required(),
    isRecurr: Joi.boolean().required(),
    recurrLastDate: Joi.date().iso().empty('').optional(),
    flight_takeoff_date: Joi.date().iso().required(),
    takeoff_time: Joi.string().required(),
    landing_time: Joi.string().required(),
    pilot: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    copilot: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    aircraftAssignment: Joi.string().empty('').optional(),
    lastMaintenanceDate: Joi.date().iso().empty('').optional(),
    timezone: Joi.string().required(),

  }),

  updateFlight: Joi.object().keys({
    flight_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    flight_name: Joi.string().empty('').optional(),
    route: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    day: Joi.array().items(Joi.string()).empty('').optional(),
    isRecurr: Joi.boolean().empty('').optional(),
    recurrLastDate: Joi.date().iso().empty('').optional(),
    flight_takeoff_date: Joi.date().iso().empty('').optional(),
    takeoff_time: Joi.string().empty('').optional(),
    landing_time: Joi.string().empty('').optional(),
    pilot: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    copilot: Joi.string().regex(/^[0-9a-fA-F]{24}$/).empty('').optional(),
    aircraftAssignment: Joi.string().empty('').optional(),
    lastMaintenanceDate: Joi.date().iso().empty('').optional(),
  }),

  investorsSchema: Joi.object({
    frame1_image: Joi.string().allow(''),
    frame2_image: Joi.string().allow(''),
    frame3_image: Joi.string().allow(''),
    frame4_content: Joi.string().required(),
  }),

  blogStatusSchema: Joi.object({
    id: Joi.string().required(),
    blog_published_date: Joi.date().allow('').optional(),
    status: Joi.string().valid('active', 'inactive').default('active'),
  }),

  updatePaymentStatusSchema: Joi.object({
    updateArr: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        status: Joi.string().valid('active', 'inactive').required(),
        payment_gateway_order: Joi.string().required(),
        payment_gateway_limit: Joi.string().required(),
      })
    ).required(),
  }),

  getAllUsersSchema: Joi.object({
    search: Joi.string().allow('').optional(),
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    is_member: Joi.string().allow('').optional(),
  }),

  _idSchema: Joi.object({
    _id: Joi.string().required(), // Assuming id is a string and is required
  }),

  updateBookingCheckedIn: Joi.object({
    id: Joi.string().required(), // Assuming id is a string and is required
    checked_in: Joi.boolean().required(), // Modify allowed values as needed
  }),
  addUserToGroupSchema: Joi.object({
    group_id: Joi.string().required(),
    id: Joi.string().required(),
    type: Joi.string().valid('user', 'subadmin', 'admin').required()
  }),
  updateGuestNameSchema: Joi.object({
    id: Joi.string().required(),
    guest_name: Joi.string().required()
  }),
  sendInboxMailSchema: Joi.object({
    id: Joi.string().required(),
    message: Joi.string().required()
  }),
  reorderSchema: Joi.object({
    collectionName: Joi.string().required(),
    items: Joi.array().items(
      Joi.object({
        _id: Joi.string().required()
      })
    ).required()
  }),
  addBlackListCardSchema: Joi.object({
    cardNumber: Joi.string()
      .required()
      .trim()
      .pattern(/^\d{15,16}$/) // Validate for 15 or 16 digits
      .messages({
        'string.base': 'Card number should be a string',
        'string.empty': 'Card number is required',
        'string.pattern.base': 'Card number must be 15 or 16 digits long',
      }),
  }),

  getNewCategorySchema: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), // Assuming id is required
    skip: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
  }),

  addUpdateContactCategorySchema: Joi.object({
    oldArray: Joi.array().items(
      Joi.object({
        _id: Joi.string().required(),
        category: Joi.string().required(),
        email: Joi.string().email().required(),
        display_name: Joi.string().required(),
        main: Joi.boolean().required(),
        user_id: Joi.string().required(),
        address_id: Joi.string().required()
      })
    ).optional(),
    newArray: Joi.array().items(
      Joi.object({
        category: Joi.string().required(),
        email: Joi.string().email().required(),
        display_name: Joi.string().required(),
        main: Joi.boolean().required(),
        user_id: Joi.string().optional(),
        username: Joi.string().optional()
      })
    ).optional()
  }),

  // searchSubadminSchema: Joi.object({
  //   search: Joi.string().required()
  // }),

  addUpdateSubadminSignatureSchema: Joi.object({
    oldArray: Joi.array().items(
      Joi.object({
        _id: Joi.string().required(),
        name: Joi.string().required(),
        signature: Joi.string().required(),
        subadmin_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
      })
    ).optional(),
    newArray: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        signature: Joi.string().required(),
        subadmin_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
      })
    ).optional()
  }),

  addShortcodeSchema: Joi.object({
    shortCodeName: Joi.string().required(),
    details: Joi.array().items(
      Joi.object({
        keyName: Joi.string().allow(''),
        tableName: Joi.string().allow('')
      })
    ).optional(),
  }),

  // Define the validation schema for adding/updating job types, locations, and categories
  addOrUpdateJobDetailsSchema: Joi.object({
    job_types: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        _id: Joi.string().optional().allow(''), // Optional for updating
      })
    ).required(),
    job_locations: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        _id: Joi.string().optional().allow(''), // Optional for updating
      })
    ).required(),
    job_categories: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        _id: Joi.string().optional().allow(''), // Optional for updating
      })
    ).required(),
  }),

  deleteContactUsCategorySchema: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),

  getSelfSignature: Joi.object({
    subadmin_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }),
  checkInviteLinkSchema: Joi.object().keys({
    link_code: Joi.string().required()
  }),
}
module.exports = schema;