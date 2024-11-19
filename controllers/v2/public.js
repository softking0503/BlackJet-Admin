const passport = require('passport');
const { errorResponse, successResponse,
    emptyResponse,
    successResponseWithoutData,
    successResponseWithPagination,
    trimParams,
    requiredIdResponse,
    customResponse,
    notFoundMessage,
    internalServerError,
    randomResponse,
    failMessage,
    notFoundResponse,
    tokenError
} = require("../../helpers/response");
const mail = require('../../helpers/mailer');
const jobApplicationModal = require("../../models/jobApplication")
const enquiryModal = require("../../models/enquiry");
const locationModal = require("../../models/state");
const shortCodeModal = require("../../models/shortCode");
const enquiryListModal = require("../../models/enquiryList");
const careerModal = require("../../models/career");
const membership_settings = require("../../models/membership_settings")
const discountModal = require("../../models/discount");
const priceModal = require("../../models/price");
const categoryModal = require("../../models/category");
const contactModal = require("../../models/contactUs");
const SavedNavLocationModal = require("../../models/savedNavLocation");
const faqModal = require("../../models/faq");
const legalModal = require("../../models/legal");
const chatTimeModal = require("../../models/chatTime");
const membershipModal = require("../../models/membership");
const contactuscategoriesModal = require("../../models/contactUsCategory");
const JobType = require("../../models/jobType");  // JobType model
const JobLocation = require('../../models/jobLocation');  // JobLocation model
const JobCategory = require('../../models/jobCategory');  // JobCategory model
const common = require('../../helpers/v2/common');
const { toObjectId } = require('../../helpers/v2/common');

const inviteLinkModel = require("../../models/inviteLink");
const moment = require('moment');
const human = require('humanparser');
const { default: mongoose } = require('mongoose');
const { date, required } = require('joi');

// Controller function to get add enquiry
exports.addEnquiry = async (req, res) => {
    try {
        let acctType = '';

        // Check if authorization header exists and contains a value
        if (!req.headers.authorization || req.headers.authorization.trim() === '') {
            // If authorization header is empty or missing, assign acctType as 'public_user'
            acctType = 'full_member';
        } else {
            // If authorization header has a value, assign acctType as 'full_member'
            acctType = 'public_user';
        }

        // Extract data from the request
        const { firstName, email, phone, subject, relatedEnquiry, enQuiry, browserWindow, device, computerScreen, ipv6 } = req.body;
        //getting first middel last name from fullName
        const attrs = human.parseName(firstName);
        let middle_name = attrs.middleName ? ' ' + attrs.middleName : ''; //middel name
        let firstname = `${attrs.firstName}${middle_name}`; // first and middel name if exist
        let lastName = attrs.lastName ? attrs.lastName : ''; //last name
        // Fetch the type from the enquiryList table based on the relatedEnquiry ID
        //const relatedEnquiryInfo = await enquiryListModal.findById(relatedEnquiry);
        const relatedEnquiryInfo = await contactuscategoriesModal.findById(relatedEnquiry);


        if (!relatedEnquiryInfo) {
            // Handle the case where the relatedEnquiry ID is not found
            return notFoundResponse('Related Enquiry not found', res);
        }

        // Extract IPv4 address from the req.ip
        const ipv4 = req.ip.split(':').pop();
        // Create a new ENQUIRY document
        const newEnquiry = new enquiryModal({
            firstName: firstname,
            lastName,
            email,
            phone,
            subject,
            ipv4,
            ipv6,
            browserWindow,
            device,
            computerScreen,
            acctType, // Assign acctType here
            relatedEnquiry,
            type: relatedEnquiryInfo.category.toLowerCase(),
            enQuiry // Assuming you provide the relatedEnquiry ID in the request body
        });

        // Save the new Enquiry to the database
        await newEnquiry.save();

        //mail content 
        let mailData = {
            firstName: firstname,//enquiry sender first name
            lastName,//enquiry sender last name
            email,//enquiry sender email ID
            phone,//enquiry sender phone
            subject,// enquiry for
            enQuiry, //enquiry message
            acctType,//account type full_member or public_user
            category: relatedEnquiryInfo.category,//enquiry type
            termlink: process.env.TERMOFUSELINK,
            privacylink: process.env.PRIVACYLINK
        }
        //Send acknowledgement mail to user 
        let mailResponse = await mail.sendMailEnquiry(mailData)
        if (mailResponse) {
            //adding mail ids 
            await enquiryModal.findByIdAndUpdate({ _id: newEnquiry._id }, {
                wildduck_mail_id: mailResponse.wildduck_mail_id, wildduck_mailbox_id: mailResponse.wildduck_mailbox_id
            }, { new: true })
        }
        // Respond with a success message and the created Enquiry record
        return successResponseWithoutData('Enquiry added successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

// Controller function to attach cv
exports.attachCV = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            let imageUrl;
            let key;
            //get s3 file data
            req.files.map((data) => {
                key = data.key;
                imageUrl = data.location;
            })
            //getting view url
            let getUrl = await common.fetchS3fileByKey(key, process.env.USER_MEDIA_BUCKET);
            if (getUrl != '') {
                imageUrl = getUrl;
            }
            let result = { 'key': key, 'imageUrl': imageUrl }
            //return the uploaded urls for all the files
            return successResponse(result, 'Data fetched successfully.', res);
        } else {
            return notFoundResponse('No CV file provided', res);

        }
    } catch (err) {
        console.error(err, "errr");
        return errorResponse('Internal Server Error', res);
    }
};

// Controller function to add job application
exports.submitJobApplicaton = async (req, res) => {
    try {
        const { career_id,
            first_name,
            last_name,
            phone,
            phone_code,
            email,
            salary,
            desired_salary,
            cv,
            is_visa_sponsorship,
            information,
            cover_letter
        } = req.body

        let findJobName = await careerModal.findById({ _id: career_id });

        //Insert whole req body object as we are allowing only those fields which are needed for insertion
        const data = await jobApplicationModal.create(req.body)

        let imageUrl;
        let getUrl = await common.fetchS3fileByKey(cv, process.env.USER_MEDIA_BUCKET);
        if (getUrl != '') {
            imageUrl = getUrl;
        }
        //mail content 
        let mailData = {
            first_name,//enquiry sender first name
            last_name,//enquiry sender last name
            email,//enquiry sender email ID
            phone,//enquiry sender phone
            phone_code,
            job_name: findJobName.job_name,
            salary,
            desired_salary,
            cv,
            cvUrl: imageUrl,
            is_visa_sponsorship,
            information,
            cover_letter,
            termlink: process.env.TERMOFUSELINK,
            privacylink: process.env.PRIVACYLINK,
        }
        //Send acknowledgement mail to user 
        let mailResponse = await mail.sendMailJobApplicantUser(mailData)
        console.log(mailResponse, 'mailResponse')
        if (mailResponse) {
            //adding mail ids 
            await jobApplicationModal.findByIdAndUpdate({ _id: data._id }, {
                wildduck_mail_id: mailResponse.wildduck_mail_id, wildduck_mailbox_id: mailResponse.wildduck_mailbox_id
            }, { new: true })
        }
        // Return success response with inserted data
        successResponse(data, 'Application submitted successfully.', res);
    } catch (error) {
        // Handle errors
        console.error('Error in adding application:', error);
        return errorResponse('Internal Server Error', res);
    }
};

// Controller function to get list of careers
exports.careers = async (req, res) => {
    try {
        console.log('jobType')

        // Destructure the properties you need from the request object
        const { skip, limit } = req.query;

        // Set default values for skip, limit, and sort
        const parsedSkip = skip ? parseInt(skip) : 1; // Default to the first page
        const parsedLimit = limit ? parseInt(limit) : 10; // Default page size to 10 careers

        // Calculate the number of records to skip
        const offset = (parsedSkip - 1) * parsedLimit;

        // Build the query for fetching careers
        const query = { status: 'active' };

        // Access the filters from req.query
        if (req.query.job_type) {
            const jobType = await JobType.findOne({ name: req.query.job_type });
            if (jobType) query.job_type = jobType._id; // Use ObjectId for filtering
        }

        if (req.query.job_location) {
            const jobLocation = await JobLocation.findOne({ name: req.query.job_location });
            if (jobLocation) query.job_location = jobLocation._id; // Use ObjectId for filtering
        }

        if (req.query.category) {
            const jobCategory = await JobCategory.findOne({ name: req.query.category });
            if (jobCategory) query.job_category = jobCategory._id; // Use ObjectId for filtering
        }

        // Fetch all active careers with pagination
        const careers = await careerModal.find(query)
            .populate('job_type', 'name')
            .populate('job_location', 'name')
            .populate('job_category', 'name')
            .sort({ _id: -1 }) // Sort by '_id' in descending order (latest first)
            .skip(offset)
            .limit(parsedLimit)
            .lean();

        // Check if data was found; if not, return an empty response
        if (!careers || careers.length === 0) {
            return emptyResponse([], res);
        }

        // Transform populated fields to return only 'name'
        careers.forEach(career => {
            if (career.job_type) career.job_type = career.job_type.name;
            if (career.job_location) career.job_location = career.job_location.name;
            if (career.job_category) career.job_category = career.job_category.name;
        });

        // Use countDocuments to get the total count
        const totalCount = await careerModal.countDocuments(query);

        return successResponseWithPagination(careers, totalCount, 'Data Fetched Successfully.', res);

    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

// Controller function to get all categories
exports.categoryList = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1; // Updated to 0-based index
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Create an aggregation pipeline to sort, skip, limit, and filter records
        const pipeline = [
            { $match: { status: 'active' } }, // Filter records with 'active' status
            { $sort: { order: 1 } }, // Sort by 'order' in ascending order
            { $skip: offset }, // Skip records based on pagination
            { $limit: parsedLimit }, // Limit the number of records per page
            { $project: { created_at: 0, updated_at: 0 } } // Exclude created_at and updated_at fields
        ];

        // Execute the aggregation pipeline
        const categories = await categoryModal.aggregate(pipeline);

        // Check if there are any categories
        if (categories.length > 0) {
            for (let i = 0; i < categories.length; i++) {
                if (categories[i].image) {
                    const isUrl = await common.isValidUrl(categories[i].image);
                    if (isUrl) {
                        const bucketName = await common.checkBucketName(categories[i].image);
                        categories[i].image = bucketName === process.env.USER_MEDIA_BUCKET ? await common.fetchS3file(categories[i].image, process.env.USER_MEDIA_BUCKET) : categories[i].image;
                    } else {
                        categories[i].image = await common.fetchS3fileByKey(categories[i].image, process.env.USER_MEDIA_BUCKET);
                    }
                }
            }
            // Send the list of categories as a JSON response
            return successResponseWithPagination(categories, categories.length, 'Categories retrieved successfully', res);
        } else {
            // Send a message if no categories are found
            return notFoundResponse('No categories found', res);
        }
    } catch (error) {
        // Handle errors and respond with an error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.getFaqQuestions = async (req, res) => {
    try {

        const categoryId = req.query.id;

        // Pagination parameters: skip and limit
        const page = parseInt(req.query.skip) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit is 10 items per page

        // Calculate the starting index for pagination
        const startIndex = (page - 1) * limit;

        // Assuming your faq model has a 'category_id' field to associate faq with categories
        const category = await faqModal.find({ category: categoryId, status: 'active' })
            .sort({ order: 1 })  // Sort by created_at in descending order (-1)
            .skip(startIndex)
            .limit(limit);

        if (!category || category.length === 0) {
            return notFoundResponse('No FAQs found for the category', res);
        }

        // Extracting all FAQs from the result
        const allCategoryDetails = category.map((data) => ({
            _id: data._id,
            question: data.question,
            answer: data.answer,
            section_description: data.section_description,
            section_heading: data.section_heading,
            title: data.title,
            status: data.status
            // Add other fields as needed
        }));

        return successResponseWithPagination(allCategoryDetails, allCategoryDetails.length, 'Data Fetched Successfully.', res);

    } catch (error) {
        console.error(error);
        return errorResponse('Internal Server Error', res);
    }
};

exports.getLegal = async (req, res) => {
    try {
        const { id } = req.query; // Assuming you pass the Legal item ID as a parameter

        // Find the Legal by ID
        const legal = await legalModal.findOne({ _id: id, status: 'active' });

        if (!legal) {
            return notFoundResponse('No active legal document found', res);
        }

        // Construct the response object
        const responseObject = {
            legal_title: legal.legalTitle,
            legalContent: legal.legalContent
        };

        return successResponse(responseObject, 'Active legal documents fetched successfully', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


exports.legalList = async (req, res) => {
    try {
        // Extract query parameters from the request
        const { skip, limit } = req.query;

        // Parse skip and limit values or provide default values if not present
        const parsedSkip = skip ? parseInt(skip) : 1; // Updated to 0-based index
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Create an aggregation pipeline to sort, skip, limit, and filter records
        const pipeline = [
            { $match: { status: 'active' } }, // Filter for active legal documents
            { $sort: { order: 1 } }, // Sort by 'order' in ascending order
            { $skip: offset }, // Skip records based on pagination
            { $limit: parsedLimit }, // Limit the number of records per page
            {
                $project: {
                    _id: 1,
                    legalTitle: '$legalTitle',
                },
            },
        ];

        // Execute the aggregation pipeline
        const legals = await legalModal.aggregate(pipeline);

        return successResponseWithPagination(legals, legals.length, 'Data Fetched Successfully.', res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};


// Controller function to get list of enquiries
exports.getEnquiryList = async (req, res) => {
    try {
        // Use the enquiryListModal to find all enQuiry in the collection
        //const response = await enquiryListModal.find({});
        //get all active categories
        let response = [];
        const getCat = await contactuscategoriesModal.aggregate([
            { $match: { status: 'active' } }, // Filter documents by status
            {
                $group: {
                    _id: '$category',  // Group by category to find unique category
                    category: { $first: '$category' },  // Keep category for each unique category
                    id: { $first: '$_id' }  // Keep _id for each unique category
                }
            },
            {
                $project: {
                    _id: '$id',
                    category: 1
                }
            }
        ]);

        // Check if any enQuiry were found, if not, return an empty response
        if (!getCat.length) return emptyResponse(response, res);

        for (let i = 0; i < getCat.length; i++) {
            response.push({
                _id: getCat[i]._id,
                name: getCat[i].category
            })
        }

        // Return a success response with the list of enQuiry
        return successResponseWithPagination(response, response.length, 'enQuiry get successfully.', res);
    } catch (err) {
        // Handle errors and return an internal server error response
        console.log(err);
        return internalServerError('Internal Server Error.', res);
    }
};

exports.contact_us_list = async (req, res) => {
    try {
        const { skip = 1, limit = 10, status = 'active' } = req.query;

        // Convert skip and limit to numbers
        const parsedSkip = parseInt(skip);
        const parsedLimit = parseInt(limit);

        // Calculate the offset based on skip and limit
        const offset = (parsedSkip - 1) * parsedLimit;

        // Find the saved location and populate 'email' field with 'name'
        const contacts = await contactModal
            .find({ status }) // Add status filter
            .sort({ id: -1 })
            .skip(offset)
            .limit(parsedLimit)
            .select('name email'); // Select only name and email fields

        // Get the total count for pagination
        const totalContacts = await contactModal.countDocuments({ status });

        // Respond with paginated contact list
        return successResponseWithPagination(contacts, totalContacts, "Contact list retrieved successfully", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.get_all_location = async (req, res) => {
    try {
        // Fetch data from the database
        const location = await locationModal.find({}, 'city_name');
        // Check if there are no listings
        if (!location || location.length === 0) {
            return notFoundResponse('No Location found', res);
        }
        // Respond with paginated contact list
        return successResponse(location, "Contact list retrieved successfully", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.get_all_category = async (req, res) => {
    try {
        // Fetch data from the database
        const job_category = await careerModal.find({}, 'job_category');
        // Check if there are no listings
        if (!job_category || job_category.length === 0) {
            return notFoundResponse('No job_category found', res);
        }
        // Respond with paginated contact list
        return successResponse(job_category, "Contact list retrieved successfully", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
};


exports.get_career = async (req, res) => {
    try {
        // Extract enquiry ID from the request parameters
        const careerId = req.query.id;

        // Use async/await to fetch careers with pagination and filters
        const careers = await careerModal.findById(careerId)

        // Check if no career is found, return a not found response
        if (!careers) {
            return notFoundResponse('Careers not found', res);
        }
        let careersDetails = {}
        // Map the fetched careers to a simplified format
        careersDetails = {
            _id: careers._id,
            job_name: careers.job_name,
            job_type: careers.job_type,
            job_location: careers.job_location,
            job_category: careers.job_category,
            description: careers.description,
            starting_salary: careers.starting_salary,
            max_salary: careers.max_salary,
            status: careers.status,
            job_post_date: careers.job_post_date
            // Add other fields as needed
        };

        return successResponse(careersDetails, 'Data Fetched Successfully.', res);

    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.viewMembership = async (req, res) => {
    try {
        // Extract the membership ID from the request parameters
        const membershipName = req.query.type;

        // Query the database to find the membership by its ID
        const membershipData = await membershipModal.findOne({ name: membershipName });

        if (!membershipData) {
            // Send a custom not found response with a message
            return notFoundResponse('Membership not found', res);
        }
        // Get the current date and time in UTC
        const currentDate = new Date();

        // Fetch all active shortcodes
        const shortCodes = await shortCodeModal.find({ status: 'active' });

        // Prepare to store updated highlights
        const updatedHighlights = [...membershipData.highlightsArray];
        let initiationFees = "";
        let priceValue = "";
        let smallestDiscount = null;
        let membershipSettings = {};
        membershipSettings = await membership_settings.findOne({ status: 'active' })

        // Find the prices with effective dates after the current UTC date and time
        // Find the prices with effective dates after the current UTC date and time
        const prices = await priceModal.find({
            status: "active",
            membership: membershipData._id,
            effectiveDate: { $lte: currentDate }, // Only select prices with effective dates less than or equal to the current UTC time
            $or: [
                { effectiveEndDate: null }, // Select prices with no effective end date
                { effectiveEndDate: { $gt: currentDate } } // Select prices with effective end dates greater than the current UTC time
            ]
        }).sort({ effectiveDate: -1 }); // Sort prices in descending order based on effective date
        if (membershipData.type == 1 || membershipData.type == 2) {

            if (!prices || prices.length === 0) {
                // If no prices are found, send a response indicating that no price is available
                return notFoundResponse('Price not found', res);
            }

            // Get the latest price based on descending order of effective date
            const currentPrice = prices[0];

            // Extract the price value and initiation fees from the current price
            priceValue = currentPrice.price;
            initiationFees = currentPrice.initiationFees;
            // Query the discount modal to get the active discount for the given membership
            const activeDiscounts = await discountModal.find({
                membership_id: membershipData._id,
                status: 'active',
                $or: [
                    {
                        start_date: { $lte: currentDate },
                        end_date: { $gte: currentDate }
                    },
                    {
                        start_date: { $lte: currentDate },
                        end_date: null
                    }
                ]
            }).sort({ start_date: -1 });
            // Find and update the smallest discount
            smallestDiscount = await common.findSmallestDiscount(activeDiscounts);
        }
        // Create a mapping of response keys to their corresponding values
        const responseKeyMapping = {
            initiationFees: initiationFees?.toString() || "",
            latestPrice: priceValue?.toString() || "",
            discountInitiationFees: smallestDiscount?.initiation_fees,
            discountPrice: smallestDiscount?.smallestDiscount?.discount_price || "",
            usedSeats: smallestDiscount?.smallestDiscount?.used_seats || 0,
        };

        // Process highlights inline with multiple replacements within a single shortCodeName
        const finalHighlights = [];
        for (const highlight of updatedHighlights) {
            let newHighlight = highlight.highlight;
            let code = '';  // Ensure code and value are reset per highlight
            let value = '';
            let fees = '';
            let discountees = '';

            // Iterate through the short codes and perform replacements
            for (const shortCode of shortCodes) {
                if (newHighlight.includes(shortCode.shortCodeName)) {
                    code = shortCode.shortCodeName.replace(/{{|}}/g, '');
                    value = initiationFees;
                    fees = initiationFees;
                    discountees = smallestDiscount?.initiation_fees;

                    let combinedValues = '';
                    for (const detail of shortCode.details) {

                        let replacementValue = '';
                        if (detail.tableName === 'unused') {
                            if (responseKeyMapping.hasOwnProperty(detail.keyName)) {
                                replacementValue = responseKeyMapping[detail.keyName];
                            }
                        } else {
                            try {
                                const modelPath = path.join('..', detail.tableName);
                                const Model = require(modelPath);
                                const data = await Model.findOne({ _id: detail.value });
                                replacementValue = data?.[detail.keyName] || '0';
                            } catch (error) {
                                console.error(`Error loading model or querying data for table ${detail.tableName}:`, error);
                            }
                        }
                        combinedValues += replacementValue + ' ';
                    }
                    combinedValues = combinedValues.trim();
                    // Replace the shortcode name in the highlight string
                    newHighlight = newHighlight.replace(shortCode.shortCodeName, combinedValues);
                    console.log(newHighlight, 'after replacement');
                }
            }

            // Construct the updated highlight
            const updatedHighlight = {
                highlight: newHighlight,
                strikeThroughHighlight: highlight.strikeThroughHighlight,
                check: highlight.check,
                _id: highlight._id,
                code: code,
                value: value,
                initiationFees: fees,
                discountInitiationFees: discountees
            };

            finalHighlights.push(updatedHighlight);
        }

        // Create the response object
        const responseObj = {
            _id: membershipData._id,
            name: membershipData.name,
            noOfSeats: membershipData.noOfSeats,
            content: membershipData.content,
            text: membershipData.text,
            bannerTag: membershipData.bannerTag,
            type: membershipData.type,
            highlightsArray: finalHighlights, // Use the updated highlights
            downgradeArray: membershipData.downgradeArray,
            downgradeText: membershipData.downgradeText,
            preorderOn: membershipData.preorderOn,
            status: membershipData.status,
            createdAt: membershipData.createdAt,
            updatedAt: membershipData.updatedAt,
            initiationFees: initiationFees?.toString() || "",
            latestPrice: priceValue?.toString() || "",
            discountInitiationFees: smallestDiscount?.initiation_fees,
            discountPrice: smallestDiscount?.smallestDiscount?.discount_price || "",
            usedSeats: smallestDiscount?.smallestDiscount?.used_seats || 0,
            is_demo_process: membershipSettings.is_demo_process,
            preOrder: membershipSettings.preOrder
        };
        // Send the response object as a JSON response
        return successResponse(responseObj, 'Membership Retrieved Successfully', res);
    } catch (error) {
        // Handle errors and respond with an internal server error message
        console.error(error);
        return internalServerError('Internal Server Error', res);
    }
};

exports.uploadAnyFiles = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            let result = [] //Storing the urls
            let key;
            req.files.map((data) => {
                key = data.key;
                result.push(data.location)
            })

            //getting view url
            let getUrl = await common.fetchS3fileByKey(key, process.env.USER_MEDIA_BUCKET);
            if (getUrl != '') {
                result[0] = getUrl;
            }

            //return the uploaded urls for all the files
            return successResponse(result[0], 'Data fetched successfully.', res);
        } else {
            return notFoundResponse('No file provided', res);

        }
    } catch (err) {
        console.error(err, "errr");
        return errorResponse('Internal Server Error', res);
    }
};

exports.uploadAnyChatFiles = async (req, res) => {
    try {
        if (req.files && req.files.length > 0) {
            let imageUrl;
            let key;
            //get s3 file data
            req.files.map((data) => {
                key = data.key;
                imageUrl = data.location;
            })
            //getting view url
            let getUrl = await common.fetchS3fileByKey(key, process.env.CHAT_MEDIA_BUCKET);
            if (getUrl != '') {
                imageUrl = getUrl;
            }
            let result = { 'key': key, 'imageUrl': imageUrl }
            //return the uploaded urls for all the files
            return successResponse(result, 'Data fetched successfully.', res);
        } else {
            return notFoundResponse('No file provided', res);

        }
    } catch (err) {
        console.error(err, "errr");
        return errorResponse('Internal Server Error', res);
    }
};


exports.getChatTime = async (req, res) => {
    try {
        const chatTime = await chatTimeModal.find();

        if (!chatTime) return emptyResponse(chatTime, res);
        // Return a success response with the list of subadmins
        return successResponse(chatTime[0], 'Data get successfully.', res);
    } catch (error) {
        // Log the error to the console
        console.error('Error in subAdminList:', error);

        // Return an internal server error response
        return internalServerError('Internal Server Error.', res);
    }
};

exports.viewAllSavedLocation = async (req, res) => {
    try {
        // Fields to populate for each location type
        const locationFields = [
            'faqsLocationIds',
            'legalLocationIds',
            'aboutUsLocationIds',
            'contactUsLocationIds',
            'careersLocationIds',
            'mediaPressLocationIds',
            'investorsLocationIds',
            'newsLocationIds'
        ];

        // Find saved locations and populate necessary fields
        const savedLocations = await SavedNavLocationModal.find().populate(
            locationFields.map(field => ({ path: field + '._id', select: 'name' }))
        ).lean(); // Use lean to convert to plain JS objects

        if (!savedLocations || savedLocations.length === 0) {
            return notFoundResponse("Saved location not found", res);
        }

        // Format location ids for response
        const formatLocationIds = (locationArray) => {
            return locationArray.map(item => ({
                _id: item._id._id,
                name: item._id.name,
                isAdd: item.isAdd
            }));
        };

        // Transform saved locations
        const formattedLocations = savedLocations.map(location => ({
            ...location,
            ...Object.fromEntries(locationFields.map(field => [
                field,
                formatLocationIds(location[field])
            ]))
        }));

        return successResponse(formattedLocations[0], "Saved locations retrieved successfully", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
}


exports.checkInviteLink = async (req, res) => {
    try {
        let link_code = req.query.link_code;
        let checkLinkCodeValid = await inviteLinkModel.findOne({ _id: toObjectId(link_code), status: 'active' })
        if (!checkLinkCodeValid) {
            return failMessage("Link expired or not valid.", res)
        }

        return successResponseWithoutData("Link active", res);
    } catch (error) {
        console.error(error);
        return internalServerError('Internal Server Error.', res);
    }
}