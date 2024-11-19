
const Joi = require('joi')

const publicSchema = {

    enquiryValidationSchema: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string(),
        email: Joi.string().email().required(),
        phone: Joi.number().required(),
        browserWindow: Joi.string().required(),
        device: Joi.string().required(),
        computerScreen: Joi.string().required(),
        subject: Joi.string().required(),
        type: Joi.string().required(),
        //type: Joi.string().valid('about_us', 'legal', 'careers', 'media_press', 'sales', 'support', 'partnerships', 'something_else', 'general', 'investors', 'contact_us', 'faq').required(),
        relatedEnquiry: Joi.string().required(), // Assuming it's a string representing the relatedEnquiry ID
        enQuiry: Joi.string().required(),
    }),

    validationSchema: Joi.object({
        skip: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1),
        job_type: Joi.string().allow('').optional(),
        job_location: Joi.string().allow('').optional(),
        category: Joi.string().allow('').optional()
    }),

    submitJobApplicaton: Joi.object().keys({
        career_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        first_name: Joi.string().required(),
        last_name: Joi.string().required(),
        phone: Joi.string().required(),
        phone_code: Joi.string().required(),
        email: Joi.string().email({ tlds: { allow: false } }).required(),
        salary: Joi.string().required(),
        desired_salary: Joi.string().required(),
        cover_letter: Joi.string().required(),
        cv: Joi.string().required(),
        is_visa_sponsorship: Joi.boolean().required(),
        information: Joi.string().required()
    }),

    querySchema: Joi.object({
        skip: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).optional(),
    }),

    getCategorySchema: Joi.object({
        id: Joi.string().required(), // Assuming id is required
        skip: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).optional(),
    }),

    viewSchema: Joi.object().keys({
        id: Joi.string().required()
    }),
    viewMembershipSchema: Joi.object({
        // id: Joi.string().trim().required(),
        type: Joi.string().valid('Unlimited', 'Unlimited Elite', 'Free Preview').allow('').optional()
    }),
    emptySchema: Joi.object({
        // Define any expected query parameters (in this case, none are expected)
    }).unknown(false)


}


module.exports = publicSchema;

