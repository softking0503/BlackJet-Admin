
const dotenv = require('dotenv');
const userModal = require("../../models/users.model");
const user_guest_mapping_modal = require("../../models/user_guest_mapping");
const veriffResponseModel = require("../../models/veriffResponse");
const aws = require('aws-sdk');
const fs = require('fs');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { successResponse,
  internalServerError,
  failMessage
} = require("../../helpers/response");
const dayjs = require('dayjs')
const secretManagerAws = require('../../helpers/secretManagerAws');
const common = require('../../helpers/v2/common');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../../config', '.envs') });

const S3_REGION = process.env.S3_REGION;
// const credentials = new aws.SharedIniFileCredentials({ profile: "s3" });
// aws.config.credentials = credentials;
const veriff_documents = require("../../models/veriff_documents")
exports.updateProfilePic = async (req, res, next) => {

  try {
    const _id = req.payload._id
    // const s3 = new aws.S3({
    //   region: S3_REGION
    // })
    const s3 = new aws.S3();
    let multerUpload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.USER_MEDIA_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          cb(null, Date.now().toString() + '_' + file.originalname)
        }
      })
    });
    let singleUpload = multerUpload.single("image");
    singleUpload(req, res, async function (err) {
      console.log(req, 'req')
      if (err) {
        return res.json({
          success: false,
          errors: {
            title: "Image Upload Error",
            detail: err.message,
            error: err,
          },
        });
      }
      if (!req.file) {
        return failMessage("Network error", res)
      }
      let userData = await userModal.findByIdAndUpdate({ _id }, { profile_pic: req.file.key }, { new: true });
      if (userData) {
        //updating guest info
        await user_guest_mapping_modal.findOneAndUpdate({ guest_phone_code: userData.phone_code, guest_phone: userData.phone }, { guest_profile_pic: userData.profile_pic })
      }

      let imageUrl = await common.fetchS3fileByKey(req.file.key, process.env.USER_MEDIA_BUCKET);
      if (imageUrl) {
        req.file.location = imageUrl;
      }
      return successResponse({ "url": req.file.location, "key": req.file.key }, 'Successfully updated profile photo.', res);
    })

  } catch (error) {
    console.log(error, "errrrrrrrrrr")
    return internalServerError('Internal Server Error', res);
  }
}
exports.uploadDriversLicense = async (req, res) => {
  try {
    const user = req.payload
    const _id = req.payload._id

    let veriff = require('../../helpers/third_party_function')
    //created the sessions
    let data = {
      "query": {
        "full_name": `${user.fullName}`,
        "DOB": `${dayjs(user.birthday).format('YYYY-MM-DD')}`,
        "vendorData": user._id + " DriverLicense"
      }
    }
    let passport_session = await veriff.createVeriffSession(data, 'DRIVERS_LICENSE')
    //convert the image into base 64
    let { base64Image } = veriff.convertToBase64(req, 'image')
    console.log(base64Image == undefined)
    //upload all the docs
    let uploadPassport = veriff.uploadVeriffDocument(passport_session.verification.id, base64Image)

    //submit the sessions
    let submitPassport = veriff.submitVeriffSession(passport_session.verification.id)
    await Promise.all([passport_session, base64Image,
      uploadPassport,
      submitPassport])
    await userModal.findByIdAndUpdate({ _id }, { driver_license_sessionId: passport_session.verification.id }, { new: true });

    return successResponse({ "sessionID": passport_session.verification.id }, 'Successfully submitted document!', res);
  } catch (err) {
    console.log(err);
    return internalServerError('Internal Server Error', res);
  }
};
exports.userVerifications = async (req, res) => {
  try {
    const user = req.payload
    const _id = req.payload._id
    const { type } = req.body
    let veriff = require('../../helpers/third_party_function')
    //created the sessions
    //"full_name": `${user.fullName}`,
    let data = {
      "query": {
        "first_name": `${user.given_name}`,
        "last_name": `${user.last_name}`,
        "DOB": `${dayjs(user.birthday).format('YYYY-MM-DD')}`,
        "vendorData": user._id + ` ${type}`
      }
    }
    let passport_session = await veriff.createVeriffSession(data, type)
    let passportDocSubmitted = req.payload.passportDocSubmitted
    let driverlicenseDocSubmitted = req.payload.driverlicenseDocSubmitted
    //convert the image into base 64
    let images = ['document-front', 'document-back', 'face']
    if (type == "PASSPORT") {
      passportDocSubmitted = true
      images = ['document-front', 'face']
    }
    let base64Images = await veriff.convertToBase64version2(req, images)

    await veriff.uploadVeriffDocument(passport_session?.verification.id, base64Images[0], 'document-front')
    if (type == "DRIVERS_LICENSE") {
      driverlicenseDocSubmitted = true
      await veriff.uploadVeriffDocument(passport_session?.verification.id, base64Images[1], 'document-back')
      await veriff.uploadVeriffDocument(passport_session?.verification.id, base64Images[2], 'face')

    } else {
      await veriff.uploadVeriffDocument(passport_session?.verification.id, base64Images[1], 'face')

    }
    let getRes = await veriff.submitVeriffSession(passport_session?.verification.id)
    console.log('getRes===', getRes)
    let urls = []
    // for (const image of base64Images) {
    //   let file = await exports.uploadBase64FileToS3(image)
    //   urls.push(file)
    // }
    let files = req.files;
    for (let i = 0; i < files.length; i++) {
      let file = await exports.uploadFileToS3(files[i])
      urls.push(file)
    }
    await veriff_documents.create({
      user_id: req.payload._id,
      urls
    })
    let updated_user = await userModal.findByIdAndUpdate({ _id }, { driver_license_sessionId: passport_session.verification.id, userVerifyStatus: "not verified", passportDocSubmitted, driverlicenseDocSubmitted }, { new: true });
    console.log('files[files.length]==',files[files.length])
    let fileKey = await exports.uploadVeriffFaceTos3(files[files.length - 1])
    //inserting verification user id and utc time
    const storeVerificationTime = new veriffResponseModel({
      user_id: req.payload._id,
      user_image: fileKey
    });
    await storeVerificationTime.save();
  
    // if (updated_user.passportDocSubmitted && updated_user.driverlicenseDocSubmitted) {
    //   await userModal.findByIdAndUpdate({ _id }, {
    //     userVerifyStatus: "in progress"
    //   })
    // }
    return successResponse({ "sessionID": passport_session.verification.id }, 'Your verification data has been successfully submitted, and you will get the results shortly.', res);
  } catch (err) {
    console.log(err);
    return internalServerError('Internal Server Error', res);
  }
};
exports.uploadPassport = async (req, res) => {
  try {
    const user = req.payload
    const _id = req.payload._id

    let veriff = require('../../helpers/third_party_function')
    //"full_name": `${user.fullName}`,
    let data = {
      "query": {
        "first_name": `${user.given_name}`,
        "last_name": `${user.last_name}`,
        "DOB": `${dayjs(user.birthday).format('YYYY-MM-DD')}`,
        "vendorData": user._id + " Passport"
      }
    }

    let passport_session = await veriff.createVeriffSession(data, 'PASSPORT')
    //convert the image into base 64
    let { base64Image } = veriff.convertToBase64(req, 'image')
    console.log(base64Image == undefined)
    //upload all the docs
    let uploadPassport = veriff.uploadVeriffDocument(passport_session.verification.id, base64Image)

    //submit the sessions
    let submitPassport = veriff.submitVeriffSession(passport_session.verification.id)
    await Promise.all([passport_session, base64Image,
      uploadPassport,
      submitPassport])
    await userModal.findByIdAndUpdate({ _id }, { passport_sessionId: passport_session.verification.id }, { new: true });

    return successResponse({ "sessionID": passport_session.verification.id }, 'Successfully submitted document!', res);
  }
  catch (err) {
    console.log(err);
    return internalServerError('Internal Server Error', res);
  }
};
exports.uploadProofOfAge = async (req, res) => {

  try {
    // const s3 = new aws.S3({
    //   region: S3_REGION
    // })
    const s3 = new aws.S3();
    const user = req.payload
    let multerUpload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.USER_MEDIA_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          cb(null, Date.now().toString() + file.originalname)
        }
      })
    });
    let singleUpload = multerUpload.single("image");

    singleUpload(req, res, async function (err) {
      if (err) {
        return res.json({
          success: false,
          errors: {
            title: "Image Upload Error",
            detail: err.message,
            error: err,
          },
        });
      }
      if (!req.file) {
        return failMessage("Network error", res)
      }
      let imageUrl = await common.fetchS3fileByKey(req.file.key, process.env.USER_MEDIA_BUCKET);
      if (imageUrl) {
        req.file.location = imageUrl;
      }
      return successResponse({ "url": req.file.location, "key": req.file.key }, 'Successfully uploaded proof of age.', res);
    })
  } catch (err) {
    console.log(err);
    return internalServerError('Internal Server Error', res);
  }
};
exports.uploadPhotoOfInfant = async (req, res) => {

  try {
    // const s3 = new aws.S3({
    //   region: S3_REGION
    // })
    const s3 = new aws.S3();
    const user = req.payload
    let multerUpload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.USER_MEDIA_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          cb(null, 'Photo_of_infant' + user._id + file.originalname)
        }
      })
    });
    let singleUpload = multerUpload.single("image");

    singleUpload(req, res, async function (err) {
      if (err) {
        return res.json({
          success: false,
          errors: {
            title: "Image Upload Error",
            detail: err.message,
            error: err,
          },
        });
      }
      if (!req.file) {
        return failMessage("Network error", res)
      }
      let imageUrl = await common.fetchS3fileByKey(req.file.key, process.env.USER_MEDIA_BUCKET);
      if (imageUrl) {
        req.file.location = imageUrl;
      }
      return successResponse({ "url": req.file.location, "key": req.file.key }, 'Successfully uploaded photo of infant.', res);
    })
  } catch (err) {
    console.log(err);
    return internalServerError('Internal Server Error', res);
  }
};
exports.upload_acceptance_animal_proof = async (req, res) => {

  try {
    // const s3 = new aws.S3({
    //   region: S3_REGION
    // })
    const s3 = new aws.S3();
    let multerUpload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.USER_MEDIA_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          cb(null, Date.now().toString() + '_' + file.originalname)
        }
      })
    });
    let singleUpload = multerUpload.single("image");

    singleUpload(req, res, async function (err) {
      if (err) {
        return res.json({
          success: false,
          errors: {
            title: "Image Upload Error",
            detail: err.message,
            error: err,
          },
        });
      }
      if (!req.file) {
        return failMessage("Network error", res)
      }
      let imageUrl = await common.fetchS3fileByKey(req.file.key, process.env.USER_MEDIA_BUCKET);
      if (imageUrl) {
        req.file.location = imageUrl;
      }
      return successResponse({ "url": req.file.location, "key": req.file.key }, 'Successfully uploaded Acceptance animal proof.', res);
    })
  } catch (err) {
    console.log(err);
    return internalServerError('Internal Server Error', res);
  }
};
exports.upload_pet_profile_pic = async (req, res) => {

  try {
    // const s3 = new aws.S3({
    //   region: S3_REGION
    // })
    const s3 = new aws.S3();
    let multerUpload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.USER_MEDIA_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          cb(null, Date.now().toString() + '_' + file.originalname)
        }
      })
    });
    let singleUpload = multerUpload.single("image");

    singleUpload(req, res, async function (err) {
      if (err) {
        return res.json({
          success: false,
          errors: {
            title: "Image Upload Error",
            detail: err.message,
            error: err,
          },
        });
      }
      if (!req.file) {
        return failMessage("Network error", res)
      }
      let imageUrl = await common.fetchS3fileByKey(req.file.key, process.env.USER_MEDIA_BUCKET);
      if (imageUrl) {
        req.file.location = imageUrl;
      }
      return successResponse({ "url": req.file.location, "key": req.file.key }, 'Successfully uploaded pet profile pic.', res);
    })
  } catch (err) {
    console.log(err);
    return internalServerError('Internal Server Error', res);
  }
};
exports.uploadBase64FileToS3 = async (base64String) => {

  const fileBuffer = Buffer.from(base64String, 'base64');
  const params = {
    Bucket: process.env.USER_MEDIA_BUCKET, // pass your bucket name
    Key: `${Date.now().toString()}.jpg`, // file will be saved as testBucket/contacts.pdf
    Body: fileBuffer
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, function (s3Err, data) {
      if (s3Err) throw s3Err
      console.log(`File uploaded successfully at ${data.Key}`)
      resolve(data.Key);
    });
  }).catch((error) => {
    throw error
  });
}

exports.uploadFileToS3 = async (base64String) => {
  //let fileData = fs.readFileSync(base64String.buffer);
  let buffer = base64String.buffer;
  //let image_name = `${Date.now().toString()}.jpg`;
  let image_name = Date.now().toString()+'_'+base64String.originalname;
  let params = {
    Bucket: process.env.VERIFF_MEDIA_BUCKET,
    Key: image_name,
    Body: buffer
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, function (s3Err, data) {
      if (s3Err) throw s3Err
      console.log(`File uploaded successfully at ${data.key}`)
      resolve(data.key);
    });
  }).catch((error) => {
    throw error
  });
}

exports.uploadVeriffFaceTos3 = async (base64String) => {
  console.log('uploadVeriffFaceTos3==',base64String)
  let buffer = base64String.buffer;
  let image_name = Date.now().toString()+'_'+base64String.originalname;
  let params = {
    Bucket: process.env.USER_MEDIA_BUCKET,
    Key: image_name,
    Body: buffer
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, function (s3Err, data) {
      if (s3Err) throw s3Err
      console.log(`File uploaded successfully at ${data.key}`)
      resolve(data.key);
    });
  }).catch((error) => {
    throw error
  });
}