const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const transactionModal = require("../models/payment")

const sharp = require('sharp')
const path = require('path');
const fs = require('fs');

const s3 = new aws.S3({
    secretAccessKey: 'VSVtrWwktavw7+4vCqGVXdYzq8mTD6dCHxWKLlt0',
    accessKeyId: 'AKIAWTAHABS7BUSTIKZG',
    region: 'ap-southeast-2'
})

module.exports.multerUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + '_' + file.originalname)
        }
    })
});

module.exports.multerUploadWebsite = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'rmwdstaticweb',
        region: 'us-east-2',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + '_' + file.originalname)
        }
    })
});

module.exports.multerUploadLocal = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, __dirname + '/../uploads/')
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        }
    }),
    fileFilter: (req, file, callback) => {
        if (fs.existsSync(path.join(__dirname + '/../uploads/', file.originalname))) {
            callback(new Error(`File ${file.originalname} is already uploaded!`), false);
        } else {
            callback(null, true);
        }
    }
});

module.exports.multerUploadLocalUnique = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, __dirname + '/../uploads/')
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '_' + file.originalname)
        }
    })
});

exports.uploadTicketFile = async (data, id) => {
    const params = {
        Bucket: 'devbukelg', // pass your bucket name
        Key: `ticket-${id}.pdf`, // file will be saved as testBucket/contacts.pdf
        Body: data
    };

    return new Promise((resolve, reject) => {
        s3.upload(params, function (s3Err, data) {
            if (s3Err) throw s3Err
            console.log(`File uploaded successfully at ${data.Location}`)
            resolve(data.Location);
        });
    }).catch((error) => {
        throw error
    });
}

exports.uploadManualFile = async (data, fileName) => {
    const params = {
        Bucket: 'devbukelg', // pass your bucket name
        Key: fileName, // file will be saved as testBucket/contacts.pdf
        Body: data
    };

    return new Promise((resolve, reject) => {
        s3.upload(params, function (s3Err, data) {
            if (s3Err) throw s3Err
            console.log(`File uploaded successfully at ${data.Location}`)
            resolve(data.Location);
        });
    }).catch((error) => {
        throw error
    });
}
exports.uploadBase64FileToS3 = async (base64String) => {
    const fileBuffer = Buffer.from(base64String, 'base64');
    let bucketName = process.env.BUCKET_NAME
    const params = {
        Bucket: bucketName, // pass your bucket name
        Key: `${Date.now().toString()}`, // file will be saved as testBucket/contacts.pdf
        Body: fileBuffer
    };

    return new Promise((resolve, reject) => {
        s3.upload(params, function (s3Err, data) {
            if (s3Err) throw s3Err
            resolve(data.Location);
        });
    }).catch((error) => {
        throw error
    });
}
// Function to generate invoice number
exports.generateInvoiceNumber = async () => {
    const date = new Date();
    const year = date.getFullYear().toString(); // Full 4-digit year
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month and pad with leading zero if necessary
    const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary

    // Concatenate the year, month, and day (format: YYYYMMDD)
    const formattedDate = `${year}${month}${day}`;

    // Query to get today's invoice count
    const todayStart = new Date(date.setHours(0, 0, 0, 0)); // Start of the day
    const todayEnd = new Date(date.setHours(23, 59, 59, 999)); // End of the day

    const todayInvoiceCount = await transactionModal.countDocuments({
        createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    // The next invoice number is the count + 1
    const nextInvoiceNo = (todayInvoiceCount).toString().padStart(3, '0'); // Ensure it's 3 digits
    // Concatenate the formatted date and invoice number to form the final invoice number
    return `Invoice${formattedDate}-${nextInvoiceNo}`;
};