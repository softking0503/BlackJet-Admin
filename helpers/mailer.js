const dotenv = require('dotenv');
var nodemailer = require("nodemailer");
const fs = require("fs");
const axios = require('axios');
const path = require('path');
const contactuscategoriesModal = require("../models/contactUsCategory");
const secretManagerAws = require('../helpers/secretManagerAws');

// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  secureConnection: false,
  port: 587,
  tls: {
    ciphers: 'SSLv3'
  },
  auth: {
    user: process.env.SMTP_USERNAME, // Your Outlook email address
    pass: process.env.SMTP_PASSKEY, // Your Outlook email password or app password
  },
});
exports.sendMail = async (data) => {
  const mailSubject = 'Verification Code';

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: data.email,
    subject: mailSubject,
    text: data.body
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error while sending mail=", error);
    } else {
      console.log("Mail sent!")
    }
  })
}

exports.changeMemberShip = async (data, message) => {
  const mailSubject = 'Membership Price Change';
  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: data.email,
    subject: mailSubject,
    text: message
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error while sending mail=", error);
    } else {
      console.log("Mail sent!")
    }
  })
}
exports.sendMailPetLiabilitySign = async (data) => {
  const mailSubject = 'Signed Pet Acceptance of Liability';

  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  const response = await axios.get(data.path, { responseType: 'arraybuffer' });
  const base64Data = Buffer.from(response.data, 'binary').toString('base64');
  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: data.body,
          html: `<!DOCTYPE HTML
    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title></title>
    <style type="text/css">
        table,
        td {
            color: #F2F2F2;
        }

        a {
            color: #0000ee;
            text-decoration: underline;
        }

        @media only screen and (min-width: 620px) {
            .u-row {
                width: 600px !important;
            }

            .u-row .u-col {
                vertical-align: top;
            }

            .u-row .u-col-100 {
                width: 600px !important;
            }
        }

        @media (max-width: 620px) {
            .u-row-container {
                max-width: 100% !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
                margin-top: 0px !important;
            }

            .u-row .u-col {
                min-width: 320px !important;
                max-width: 100% !important;
                /* display: block !important; */
            }

            .u-row {
                /* width: calc(100% - 40px) !important; */
            }

            .u-col {
                width: 100% !important;
            }

            .u-col>div {
                margin: 0 auto;
            }
        }

        body {
            margin: 0;
            padding: 0;
        }

        table,
        tr,
        td {
            vertical-align: top;
            border-collapse: collapse;
        }

        p {
            margin: 0;
        }

        .ie-container table,
        .mso-container table {
            table-layout: fixed;
        }

        * {
            line-height: inherit;
        }

        a[x-apple-data-detectors='true'] {
            color: inherit !important;
            text-decoration: none !important;
        }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Cabin:400,700" rel="stylesheet" type="text/css">
</head>

<body class="clean-body u_body"
    style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #262626;color: #F2F2F2">
    <table
        style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #262626;width:100%"
        cellpadding="0" cellspacing="0">
        <tbody>
            <tr style="vertical-align: top">
                <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                    <div class="u-row-container" style="padding: 0px;background-color: transparent; margin-top: 80px;">
                        <div class="u-row"
                            style="Margin: 0 auto;min-width: 320px;max-width: 639px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #141414;">
                            <div
                                style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
                                <div class="u-col u-col-100"
                                    style="display: table-cell;vertical-align: top; padding: 40px 40px 30px 40px;">
                                    <div style="width: 100% !important;">
                                        <div
                                            style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;">
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 0px 5px 0px;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="text-align: center;margin-top: 10px; margin-bottom: 20px;">
                                                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                                                <img width="51.54px" src="${process.env.APPLOGO}"
                                                                    alt="">
                                                                    </a>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:20px 0px 15px 0px;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="line-height: 160%; text-align: left; word-wrap: break-word;">
                                                                <p
                                                                    style="font-size: 16px; line-height: 160%;color: #F2F2F2;font-weight:400;margin-bottom: 15px;">
                                                                    Hi ${data.fullName},
                                                                </p>
                                                                <div
                                                                    style="line-height: 160%; text-align: left; word-wrap: break-word;">

                                                                    <p
                                                                        style="font-size: 16px; line-height: 160%;color: #F2F2F2;font-weight:400;">
                                                                        Thank you for being a valued Black Jet member.
                                                                        Please find your signed Pet Acceptance of
                                                                        Liability form attached.
                                                                    </p>

                                                                </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="line-height: 160%; text-align: left; word-wrap: break-word;margin-top: 30px;">
                                                                <div
                                                                    style="line-height: 160%; text-align: left; word-wrap: break-word;border-top: 1px solid #242424;">
                                                                    <p
                                                                        style="font-size: 12px; line-height: 160%;color: #7A7A7A;font-weight:400;text-align: center;padding-top: 5px;">
                                                                    <div
                                      style="
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        margin: 0 auto;
                                        width: 100%;
                                      "
                                    >
                                      <ul
                                        style="
                                          font-size: 12px;
                                          line-height: 160%;
                                          color: #7a7a7a;
                                          font-weight: 400;
                                          text-align: center;
                                          padding-top: 5px;
                                          margin: 0;
                                          padding: 0;
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          margin: 0 auto;
                                        "
                                      >
                                                                        <li style="display: inline-block;"> <a
                                                                                href="${process.env.WEBSITELINK}"
                                                                                style="font-size: 10px;color:#7A7A7A;text-decoration: none;font-weight: normal;"><span
                                                                                    style="position: relative;top: 0px;margin-right: 1px;">&#169;</span>2023
                                                                                Black Jet Mobility Pty Ltd</a></li>
                                                                        <li style="display: inline-block;margin:0 5px;">
                                                                            <a href="${process.env.PRIVACYLINK}"
                                                                                style="font-size: 10px;color:#7A7A7A;text-decoration: none;font-weight: normal">Privacy
                                                                                Policy</a> </li>
                                                                        <li style="display: inline-block;"> <a
                                                                                href="${process.env.TERMOFUSELINK}"
                                                                                style="font-size: 10px;color:#7A7A7A;text-decoration: none;font-weight: normal">Terms
                                                                                of Use</a> </li>
                                                                    </ul>
                                    </div>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</body>

</html>`,
          attachments: [
            {
              filename: "liability-signature.pdf",
              contentType: 'image/jpeg',
              encoding: 'base64',
              contentTransferEncoding: 'base64',
              contentDisposition: 'attachment',
              content: base64Data
            }
          ]
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}
exports.sendMailInvoice = async (data) => {
  const mailSubject = 'Invoice';

  // const mailOptions = {
  //   from: process.env.SMTP_USERNAME,
  //   to: data.email,
  //   subject: mailSubject,
  //   text: 'Please find the attached invoice.',
  //   attachments: [
  //     {
  //       filename: 'invoice.pdf',
  //       content: data.file,
  //     },
  //   ],
  // };
  // transporter.sendMail(mailOptions, function (error, info) {
  //   if (error) {
  //     console.log("Error while sending mail=", error);
  //   } else {
  //     console.log("Mail sent!")
  //   }
  // })
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  const response = await axios.get(data.file, { responseType: 'arraybuffer' });
  const base64Data = Buffer.from(response.data, 'binary').toString('base64');
  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: 'Please find the attached invoice.',
          attachments: [
            {
              filename: "invoice.pdf",
              contentType: 'application/pdf',
              encoding: 'base64',
              contentTransferEncoding: 'base64',
              contentDisposition: 'attachment',
              content: base64Data
            }
          ]
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}
//email for verify user email
exports.sendMailVerification = async (data) => {
  const mailSubject = 'Verify Your Email Address';
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "name": data.fullName,
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: "",
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title></title>
    <style type="text/css">
      table,
      td {
        color: #f2f2f2;
      }
      a {
        color: #0000ee;
        text-decoration: underline;
      }
      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }
        .u-row .u-col {
          vertical-align: top;
        }
        .u-row .u-col-100 {
          width: 600px !important;
        }
      }
      @media (max-width: 620px) {
        .common-btn{
            width: 100% !important;
            max-width: max-content !important;
        }
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          margin-top: 0px !important;
        }
        .u-row .u-col {
          min-width: 320px !important;
          max-width: 100% !important;
          display: block !important;
          padding: 40px 10px 30px 10px !important;
        }
        .u-row {
          /* width: calc(100% - 20px) !important; */
        }
        .u-col {
          /* width: 100% !important; */
        }
        .u-col > div {
          margin: 0 auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
      }
      table,
      tr,
      td {
        vertical-align: top;
        border-collapse: collapse;
      }
      p {
        margin: 0;
      }
      .ie-container table,
      .mso-container table {
        table-layout: fixed;
      }
      * {
        line-height: inherit;
      }
      a[x-apple-data-detectors="true"] {
        color: inherit !important;
        text-decoration: none !important;
      }
    </style>
    <link
      href="https://fonts.googleapis.com/css?family=Cabin:400,700"
      rel="stylesheet"
      type="text/css"
    />
  </head>
  <body
    class="clean-body u_body"
    style="
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #262626;
      color: #f2f2f2;
    "
  >
    <table
      style="
        border-collapse: collapse;
        table-layout: fixed;
        border-spacing: 0;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        vertical-align: top;
        min-width: 320px;
        margin: 0 auto;
        background-color: #262626;
        width: 100%;
      "
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr style="vertical-align: top">
          <td
            style="
              word-break: break-word;
              border-collapse: collapse !important;
              vertical-align: top;
            "
          >
            <div
              class="u-row-container"
              style="
                padding: 0px;
                background-color: transparent;
                margin-top: 80px;
              "
            >
              <div
                class="u-row"
                style="
                  margin: 0 auto;
                  min-width: 320px;
                  max-width: 639px;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                  word-break: break-word;
                  background-color: #141414;
                "
              >
                <div
                  style="
                    border-collapse: collapse;
                    display: table;
                    width: 100%;
                    background-color: transparent;
                  "
                >
                  <div
                    class="u-col u-col-100"
                    style="
                      display: table-cell;
                      vertical-align: top;
                      padding: 40px 40px 30px 40px;
                    "
                  >
                    <div style="width: 100% !important">
                      <div
                        style="
                          padding: 0px;
                          border-top: 0px solid transparent;
                          border-left: 0px solid transparent;
                          border-right: 0px solid transparent;
                          border-bottom: 0px solid transparent;
                        "
                      >
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 0px 0px 5px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    text-align: center;
                                    margin-top: 10px;
                                    margin-bottom: 20px;
                                  "
                                >
                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                  <img
                                    width="51.54px"
                                    src="${process.env.APPLOGO}"
                                    alt=""
                                  />
                                  </a>
                                </div>
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: center;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 20px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                    "
                                  >
                                    Please click on the button below to verify
                                    your email:
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 10px 0px 20px 0px;
                                  font-family: 'Cabin', sans-serif;
                                  text-align: center;
                                "
                                align="left"
                              >
                                <a
                                  href="${data.link}"
                                  target="_blank"
                                  class="common-btn"
                                  style="
                                    margin-top: 5px;
                                    box-sizing: border-box;
                                    display: inline-block;
                                    font-family: 'Cabin', sans-serif;
                                    text-decoration: none;
                                    -webkit-text-size-adjust: none;
                                    text-align: center;
                                    color: #141414;
                                    background-color: #ffffff;
                                    border-radius: 4px;
                                    -webkit-border-radius: 4px;
                                    -moz-border-radius: 4px;
                                    width: auto;
                                    max-width: 100%;
                                    overflow-wrap: break-word;
                                    word-break: break-word;
                                    word-wrap: break-word;
                                    mso-border-alt: none;
                                    width: 366px;
                                    height: 52px;
                                  "
                                >
                                  <span
                                    style="
                                      display: block;
                                      padding: 17px 44px;
                                      line-height: 120%;
                                    "
                                    ><span
                                      style="
                                        font-size: 16px;
                                        line-height: 19.2px;
                                      "
                                      ><strong
                                        ><span
                                          style="
                                            line-height: 19.2px;
                                            font-size: 16px;
                                          "
                                          >Verify email address</span
                                        ></strong
                                      >
                                    </span>
                                  </span>
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 20px 0px 15px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 16px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                      margin-bottom: 15px;
                                    "
                                  >
                                    Hi ${data.fullName},
                                  </p>
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      To finish creating your account, please
                                      click on the button above.
                                    </p>
                                  </div>
                                  <div
                                    style="
                                      margin-top: 30px;
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #bfbfbf;
                                        font-weight: 400;
                                      "
                                    >
                                      If you're having trouble clicking the
                                      button, copy and paste the URL below into
                                      your browser:
                                      <a href="${data.link}" style="color:#7a7a7a; text-decoration: none;font-size: 10px;display: block;" target="_blank"
                                        >${data.link}</a
                                      >
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                    margin-top: 30px;
                                  "
                                >
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      border-top: 1px solid #242424;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #7a7a7a;
                                        font-weight: 400;
                                        text-align: center;
                                        padding-top: 5px;
                                      "
                                    >
                                      If you didn't try to sign-in, you may
                                      ignore this email, or, if you need
                                      assistance, <a href="${process.env.WEBSITELINK}/contactus" target="_blank" style="color:#7a7a7a; text-decoration:underline">contact us</a>
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}

exports.sendMailVideoCall = async (data) => {
  const mailSubject = 'Video Call';

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: data.email,
    subject: mailSubject,
    text: "Video call link for therapist and User: " + data.link
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log('Mail send', error);
    } else {
      console.log('Mail send successfully..')
    }
  })
}

exports.sendForgotMail = async (data) => {
  let mailSubject = 'Forgot Password | BLACK_JET';
  const mailMsg = `Welcome to Black_jet!!

    Below are your updated password, you can use for Login

    email : ${data.email} 
    Password: ${data.password}


    Best&Regards

    Black_jet Team`;

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: data.email,
    subject: mailSubject,
    html: mailMsg
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
    }
  })
}
exports.sendMailOTP = async (data) => {
  const mailSubject = 'Blackjet OTP';
  let mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: data.email,
    subject: mailSubject,
    text: data.otpMessage
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error while sending mail=", error);
    } else {
      console.log("Mail sent!")
    }
  })
}
exports.sendInbox = async (data, message) => {
  const mailSubject = 'Inbox || Blackjet';

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: data.email,
    subject: mailSubject,
    text: message,
    // attachments: [
    //     {
    //         filename: 'liability-signature.pdf',
    //         path: data.pdf,
    //         encoding: 'base64',
    //     },
    // ],
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error while sending mail=", error);
    } else {
      console.log("Mail sent!")
    }
  })
}

//email for email otp verification
exports.sendMailOTPVerification = async (data) => {
  const mailSubject = 'Black Jet Code';
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;
  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "name": data.fullname,
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: "",
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title></title>
    <style type="text/css">
      table,
      td {
        color: #f2f2f2;
      }
      a {
        color: #0000ee;
        text-decoration: underline;
      }
      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }
        .u-row .u-col {
          vertical-align: top;
        }
        .u-row .u-col-100 {
          width: 600px !important;
        }
      }
      @media (max-width: 620px) {
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          margin-top: 0px !important;
        }
        .u-row .u-col {
          min-width: 320px !important;
          max-width: 100% !important;
          display: block !important;
          padding: 40px 10px 30px 10px !important;
        }
        /* .u-row {
          width: calc(100% - 20px) !important;
        } */
        .u-col {
          /* width: 100% !important; */
        }
        .u-col > div {
          margin: 0 auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
      }
      table,
      tr,
      td {
        vertical-align: top;
        border-collapse: collapse;
      }
      p {
        margin: 0;
      }
      .ie-container table,
      .mso-container table {
        table-layout: fixed;
      }
      * {
        line-height: inherit;
      }
      a[x-apple-data-detectors="true"] {
        color: inherit !important;
        text-decoration: none !important;
      }
    </style>
    <link
      href="https://fonts.googleapis.com/css?family=Cabin:400,700"
      rel="stylesheet"
      type="text/css"
    />
  </head>
  <body
    class="clean-body u_body"
    style="
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #262626;
      color: #f2f2f2;
    "
  >
    <table
      style="
        border-collapse: collapse;
        table-layout: fixed;
        border-spacing: 0;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        vertical-align: top;
        min-width: 320px;
        margin: 0 auto;
        background-color: #262626;
        width: 100%;
      "
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr style="vertical-align: top">
          <td
            style="
              word-break: break-word;
              border-collapse: collapse !important;
              vertical-align: top;
            "
          >
            <div
              class="u-row-container"
              style="
                padding: 0px;
                background-color: transparent;
                margin-top: 80px;
              "
            >
              <div
                class="u-row"
                style="
                  margin: 0 auto;
                  min-width: 320px;
                  max-width: 639px;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                  word-break: break-word;
                  background-color: #141414;
                "
              >
                <div
                  style="
                    border-collapse: collapse;
                    display: table;
                    width: 100%;
                    background-color: transparent;
                  "
                >
                  <div
                    class="u-col u-col-100"
                    style="
                      display: table-cell;
                      vertical-align: top;
                      padding: 40px 40px 30px 40px;
                    "
                  >
                    <div style="width: 100% !important">
                      <div
                        style="
                          padding: 0px;
                          border-top: 0px solid transparent;
                          border-left: 0px solid transparent;
                          border-right: 0px solid transparent;
                          border-bottom: 0px solid transparent;
                        "
                      >
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 0px 0px 5px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    text-align: center;
                                    margin-top: 10px;
                                    margin-bottom: 20px;
                                  "
                                >
                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                  <img
                                    width="51.54px"
                                    src="${process.env.APPLOGO}"
                                    alt=""
                                  />
                                  </a>
                                </div>
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: center;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 20px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                    "
                                  >
                                    Your Black Jet verification code
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 10px 0px 20px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    background-color: #242424;
                                    padding: 24px 80px;
                                    border-radius: 12px;
                                    font-size: 28px;
                                    line-height: 34.03px;
                                    font-weight: 400;
                                    text-align: center;
                                    width: max-content;
                                    margin: 0 auto;
                                  "
                                >
                                  ${data.otp}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 20px 0px 15px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 16px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                      margin-bottom: 15px;
                                    "
                                  >
                                    Hi ${data.fullname},
                                  </p>
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      To finish logging in to your Black Jet
                                      account, enter this verification code.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                    margin-top: 30px;
                                  "
                                >
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      border-top: 1px solid #242424;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #7a7a7a;
                                        font-weight: 400;
                                        text-align: center;
                                        padding-top: 5px;
                                      "
                                    >
                                      If you didn't try to sign-in, you may
                                      ignore this email, or, if you need
                                      assistance, <a href="${process.env.WEBSITELINK}/contactus" target="_blank" style="color:#7a7a7a; text-decoration:underline">contact us</a>
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}
//email for acknowledgement mail to user
exports.sendMailEnquiry = async (data) => {
  const mailSubject = 'Thank you for contacting us';
  let wildduck_mail_id = [];
  let wildduck_mailbox_id = [];
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ category: data.category, status: 'active', main: true });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let inboxMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
        if (results[jk].path == 'INBOX') {
          inboxMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "name": data.firstName + ' ' + data.lastName,
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: "",
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title></title>
    <style type="text/css">
      img {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
      }

      .insideImage img {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
      }

      table,
      td {
        color: #f2f2f2;
      }
      a {
        color: #0000ee;
        text-decoration: underline;
      }

      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }
        .u-row .u-col {
          vertical-align: top;
        }
        .u-row .u-col-100 {
          width: 600px !important;
        }
      }
      @media (max-width: 767px) {
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          padding-top: 0px !important;
        }
        .u-row .u-col {
          min-width: 320px !important;
          max-width: 100% !important;
          display: block !important;
          padding: 40px 10px 30px 10px !important;
        }
        .u-row {
          width: calc(100% - 20px) !important;
        }
        .u-col {
          /* width: 100% !important; */
        }
        .u-col > div {
          margin: 0 auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
      }
      table,
      tr,
      td {
        vertical-align: top;
        border-collapse: collapse;
      }
      p {
        margin: 0;
      }
      .ie-container table,
      .mso-container table {
        table-layout: fixed;
      }
      * {
        line-height: inherit;
      }
      a[x-apple-data-detectors="true"] {
        color: inherit !important;
        text-decoration: none !important;
      }
      @media (max-width: 767px) {
        .mailwrapper {
          padding-top: 0 !important;
          background-color: #141414 !important;
        }
      }
    </style>
    <link
      href="https://fonts.googleapis.com/css?family=Cabin:400,700"
      rel="stylesheet"
      type="text/css"
    />
  </head>
  <body
    class="clean-body u_body"
    style="
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #262626;
      color: #f2f2f2;
    "
  >
    <table
      style="
        border-collapse: collapse;
        table-layout: fixed;
        border-spacing: 0;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        vertical-align: top;
        min-width: 320px;
        margin: 0 auto;
        background-color: #262626;
        width: 100%;
      "
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr style="vertical-align: top">
          <td
            style="
              word-break: break-word;
              border-collapse: collapse !important;
              vertical-align: top;
            "
          >
            <div
              class="u-row-container mailwrapper"
              style="
                padding: 0px;
                background-color: transparent;
                padding-top: 80px;
              "
            >
              <div
                class="u-row"
                style="
                  margin: 0 auto;
                  min-width: 320px;
                  max-width: 639px;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                  word-break: break-word;
                  background-color: #141414;
                "
              >
                <div
                  style="
                    border-collapse: collapse;
                    display: table;
                    width: 100%;
                    background-color: transparent;
                  "
                >
                  <div
                    class="u-col u-col-100"
                    style="
                      display: table-cell;
                      vertical-align: top;
                      padding: 40px 40px 30px 40px;
                    "
                  >
                    <div style="width: 100% !important">
                      <div
                        style="
                          padding: 0px;
                          border-top: 0px solid transparent;
                          border-left: 0px solid transparent;
                          border-right: 0px solid transparent;
                          border-bottom: 0px solid transparent;
                        "
                      >
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 0px 0px 5px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    text-align: center;
                                    margin: 10px auto 20px auto;
                                    width: 51.54px !important;
                                  "
                                >
                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                  <img
                                    style="width: 51.54px !important"
                                    src="${process.env.APPLOGO}"
                                    alt=""
                                  />
                                  </a>
                                </div>
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: center;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 20px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 600;
                                    "
                                  >
                                    Thank you for contacting us:
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 20px 0px 15px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 16px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                      margin-bottom: 15px;
                                    "
                                  >
                                    Hi ${data.firstName} ${data.lastName},
                                  </p>
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      We've received your enquiry and will get
                                      back to you in one to two business days.
                                    </p>
                                  </div>
                                  <div
                                    style="
                                      margin-top: 30px;
                                      line-height: 90%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 14px;
                                        line-height: 160%;
                                        color: #bfbfbf;
                                        font-weight: 600;
                                      "
                                    >
                                      Below is a copy of your enquiry:
                                    </p>
                                    <div
                                      style="
                                        text-align: left;
                                        margin-bottom: 0px;
                                      "
                                    >
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 700;
                                          color: #7a7a7a;
                                        "
                                        >Full Name:
                                      </span>
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 400;
                                          color: #7a7a7a;
                                        "
                                      >
                                        ${data.firstName} ${data.lastName}</span
                                      >
                                    </div>
                                    <div
                                      style="
                                        text-align: left;
                                        margin-bottom: 0px;
                                      "
                                    >
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 700;
                                          color: #7a7a7a;
                                        "
                                        >Email:
                                      </span>
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 400;
                                          color: #7a7a7a;
                                        "
                                      >
                                        ${data.email}</span
                                      >
                                    </div>
                                    <div
                                      style="
                                        text-align: left;
                                        margin-bottom: 0px;
                                      "
                                    >
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 700;
                                          color: #7a7a7a;
                                        "
                                        >Contact No:
                                      </span>
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 400;
                                          color: #7a7a7a;
                                        "
                                      >
                                        ${data.phone}</span
                                      >
                                    </div>
                                    <div
                                      style="
                                        text-align: left;
                                        margin-bottom: 5px;
                                      "
                                    >
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 700;
                                          color: #7a7a7a;
                                        "
                                        >Category:
                                      </span>
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 400;
                                          color: #7a7a7a;
                                        "
                                      >
                                        ${data.category}</span
                                      >
                                    </div>
                                    <div
                                      style="
                                        text-align: left;
                                        margin-top: 15px;
                                        margin-bottom: 15px;
                                      "
                                    >
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 700;
                                          color: #7a7a7a;
                                        "
                                        >Subject:
                                      </span>
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 400;
                                          color: #7a7a7a;
                                        "
                                      >
                                        ${data.subject}</span
                                      >
                                    </div>
                                    <div
                                      style="
                                        text-align: left;
                                        margin-top: 10px;
                                        margin-bottom: 10px;
                                      "
                                    >
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 400;
                                          color: #7a7a7a;
                                        "
                                      >
                                        Dear Black Jet, <br />
                                        <div class="insideImage">
                                          ${data.enQuiry}
                                        </div>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                    margin-top: 30px;
                                  "
                                >
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      border-top: 1px solid #242424;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #7a7a7a;
                                        font-weight: 400;
                                        text-align: center;
                                        padding-top: 5px;
                                      "
                                    ></p>
                                    <div
                                      style="
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        margin: 0 auto;
                                        width: 100%;
                                      "
                                    >
                                      <ul
                                        style="
                                          font-size: 12px;
                                          line-height: 160%;
                                          color: #7a7a7a;
                                          font-weight: 400;
                                          text-align: center;
                                          padding-top: 5px;
                                          margin: 0;
                                          padding: 0;
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          margin: 0 auto;
                                        "
                                      >
                                        <li style="display: inline-block">
                                          <a
                                            href="${process.env.WEBSITELINK}"
                                            style="
                                              font-size: 10px;
                                              color: #7a7a7a;
                                              text-decoration: none;
                                              font-weight: normal;
                                              white-space: nowrap;
                                            "
                                            ><span
                                              style="
                                                position: relative;
                                                top: 0px;
                                                margin-right: 1px;
                                              "
                                              >&#169;</span
                                            >
                                            2023 Black Jet Mobility Pty Ltd</a
                                          >
                                        </li>
                                        <li style="display: inline-block">
                                          <a
                                            href="${data.privacylink}"
                                            style="
                                              font-size: 10px;
                                              color: #7a7a7a;
                                              text-decoration: none;
                                              font-weight: normal;
                                              white-space: nowrap;
                                              margin: 0 16px;
                                            "
                                            >Privacy Policy</a
                                          >
                                        </li>
                                        <li style="display: inline-block">
                                          <a
                                            href="${data.termlink}"
                                            style="
                                              font-size: 10px;
                                              color: #7a7a7a;
                                              text-decoration: none;
                                              font-weight: normal;
                                              white-space: nowrap;
                                            "
                                            >Terms of Use</a
                                          >
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        wildduck_mail_id.push({ 'id': wildDuckSendMail.data.message.id });
        wildduck_mailbox_id.push({ 'mailbox': wildDuckSendMail.data.message.mailbox });
        console.log('mail sent to user')
        //let lastId = 0;
        //getting inbox last id
        // const wildDuckResponse12 = await axios.get(
        //   `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes/${inboxMailboxId}/messages`,
        //   {
        //     headers: {
        //       'X-Access-Token': `${ACCESS_TOKEN}`
        //     }
        //   }
        // );

        // if (wildDuckResponse12?.data?.success === true) {
        //   if (wildDuckResponse12.data.results.length>0) {
        //     lastId = wildDuckResponse12.data.results[0].id;
        //   }

        // }
        //save mail to inbox
        const wildDuckSendMailToUs = await axios.post(
          `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes/${inboxMailboxId}/messages`,
          {
            unseen: true,
            flagged: true,
            from: {
              "name": data.firstName + ' ' + data.lastName,
              "address": data.email
            },
            to: [
              {
                "name": getCatUser.display_name,
                "address": getCatUser.email
              }
            ],
            subject: data.subject,
            text: `${data.enQuiry}`,
            html: `<p>${data.enQuiry}</p>`
          },
          {
            headers: {
              'X-Access-Token': `${ACCESS_TOKEN}`
            }
          }
        );
        if (wildDuckSendMailToUs?.data?.success === true) {
          wildduck_mail_id.push({ 'id': wildDuckSendMailToUs.data.message.id });
          wildduck_mailbox_id.push({ 'mailbox': wildDuckSendMailToUs.data.message.mailbox });
          //getting inbox mailbox id
          //getting address id
          // const wildDuckResponse1 = await axios.get(
          //   `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes/${inboxMailboxId}/messages`,
          //   {
          //     headers: {
          //       'X-Access-Token': `${ACCESS_TOKEN}`
          //     }
          //   }
          // );

          // if (wildDuckResponse1?.data?.success === true) {
          //   if (wildDuckResponse1.data.results.length>0) {
          //     if(lastId == wildDuckResponse1.data.results[0].id){
          //       lastId = lastId + 1;
          //       wildduck_mail_id.push({ 'id': lastId });
          //     }else{
          //       wildduck_mail_id.push({ 'id': wildDuckResponse1.data.results[0].id });
          //     }
          //   }


          //   wildduck_mailbox_id.push({ 'mailbox': wildDuckResponse1.data.results[0].mailbox });
          // }
          console.log('mail sent to ' + data.category)
        } else {
          console.log('mail not sent to' + data.category)
        }

      } else {
        console.log('mail not sent')
      }
    }
    let resultVal = { 'wildduck_mail_id': wildduck_mail_id, 'wildduck_mailbox_id': wildduck_mailbox_id }
    return resultVal;
  }
  if (!getCatUser) {
    console.log('contact us category not found.')
    let resultVal = { 'wildduck_mail_id': wildduck_mail_id, 'wildduck_mailbox_id': wildduck_mailbox_id }
    return resultVal;
  }
}
//send invoice mail 
exports.sendRenewalMailMembershipInvoice = async (data) => {
  const mailSubject = 'Renewal Membership Invoice';
  //mail options
  const mailOptions = {
    from: process.env.SMTP_USERNAME,//username from mail send
    to: data.email,//to email where email to send
    subject: mailSubject,//mail subject
    text: 'Please find the attached invoice.',//text body content
    attachments: [
      {
        filename: 'invoice.pdf',
        path: data.file,
      },
    ],
  };
  //send mail
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error while sending mail=", error);
    } else {
      console.log("Mail sent!")
    }
  })
};
exports.sendRenewalDayMembershipInvoice = async (data) => {
  const mailSubject = 'Renewal Date Membership Invoice';
  //mail options
  const mailOptions = {
    from: process.env.SMTP_USERNAME,//username from mail send
    to: data.email,//to email where email to send
    subject: mailSubject,//mail subject
    text: 'Please find the attached invoice.',//text body content
    attachments: [
      {
        filename: 'invoice.pdf',
        path: data.file,
      },
    ],
  };
  //send mail
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error while sending mail=", error);
    } else {
      console.log("Mail sent!")
    }
  })
};
//send invoice mail 
exports.sendMailMembershipInvoice = async (data) => {
  const mailSubject = data.subject;
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  const response = await axios.get(data.file, { responseType: 'arraybuffer' });
  const base64Data = Buffer.from(response.data, 'binary').toString('base64');
  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: 'Please find the attached invoice.',
          html: `<!DOCTYPE HTML
    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title></title>
    <style type="text/css">
        table,
        td {
            color: #F2F2F2;
        }

        a {
            color: #0000ee;
            text-decoration: underline;
        }

        @media only screen and (min-width: 620px) {
            .u-row {
                width: 600px !important;
            }

            .u-row .u-col {
                vertical-align: top;
            }

            .u-row .u-col-100 {
                width: 600px !important;
            }
        }

        @media (max-width: 620px) {
            .u-row-container {
                max-width: 100% !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
                margin-top: 0px !important;
            }

            .u-row .u-col {
                min-width: 320px !important;
                max-width: 100% !important;
                /* display: block !important; */
            }

            .u-row {
                /* width: calc(100% - 40px) !important; */
            }

            .u-col {
                width: 100% !important;
            }

            .u-col>div {
                margin: 0 auto;
            }
        }

        body {
            margin: 0;
            padding: 0;
        }

        table,
        tr,
        td {
            vertical-align: top;
            border-collapse: collapse;
        }

        p {
            margin: 0;
        }
        .ie-container table,
        .mso-container table {
            table-layout: fixed;
        }

        * {

            line-height: inherit;

        }

        a[x-apple-data-detectors='true'] {

            color: inherit !important;

            text-decoration: none !important;

        }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Cabin:400,700" rel="stylesheet" type="text/css">
</head>
<body class="clean-body u_body"
    style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #262626;color: #F2F2F2">
    <table
        style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #262626;width:100%"
        cellpadding="0" cellspacing="0">
        <tbody>
            <tr style="vertical-align: top">
                <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                    <div class="u-row-container" style="padding: 0px;background-color: transparent; margin-top: 80px;">
                        <div class="u-row"
                            style="Margin: 0 auto;min-width: 320px;max-width: 639px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #141414;">
                            <div
                                style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
                                <div class="u-col u-col-100"
                                    style="display: table-cell;vertical-align: top; padding: 40px 40px 30px 40px;">
                                    <div style="width: 100% !important;">
                                        <div
                                            style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;">
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 0px 5px 0px;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="text-align: center;margin-top: 10px; margin-bottom: 20px;">
                                                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                                                <img width="51.54px" src="${process.env.APPLOGO}" alt="">
                                                                </a>
                                                            </div>
                                                         </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:20px 0px 15px 0px;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="line-height: 160%; text-align: left; word-wrap: break-word;">
                                                                <p
                                                                    style="font-size: 16px; line-height: 160%;color: #F2F2F2;font-weight:400;margin-bottom: 15px;">
                                                                    Hi ${data.fullName},
                                                                </p>
                                                                <div
                                                                    style="line-height: 160%; text-align: left; word-wrap: break-word;">
                                                                    <p
                                                                        style="font-size: 16px; line-height: 160%;color: #F2F2F2;font-weight:400;">
                                                                        Thank you for being a valued Black Jet member.  We've processed your credit card payment successfully.  Please find your invoice attached.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="line-height: 160%; text-align: left; word-wrap: break-word;margin-top: 30px;"> 
                                                                <div
                                                                    style="line-height: 160%; text-align: left; word-wrap: break-word;border-top: 1px solid #242424;">
                                                                    <p
                                                                        style="font-size: 12px; line-height: 160%;color: #7A7A7A;font-weight:400;text-align: center;padding-top: 5px;">
                                                                    <div
                                      style="
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        margin: 0 auto;
                                        width: 100%;
                                      "
                                    >
                                      <ul
                                        style="
                                          font-size: 12px;
                                          line-height: 160%;
                                          color: #7a7a7a;
                                          font-weight: 400;
                                          text-align: center;
                                          padding-top: 5px;
                                          margin: 0;
                                          padding: 0;
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          margin: 0 auto;
                                        "
                                      >
                                                                        <li style="display: inline-block;"> <a
                                                                                href="${process.env.WEBSITELINK}"
                                                                                style="font-size: 10px;color:#7A7A7A;text-decoration: none;font-weight: normal;"><span style="position: relative;top: 0px;margin-right: 1px;">&#169;</span>2023 Black Jet Mobility Pty Ltd</a></li>
                                                                        <li style="display: inline-block;margin:0 5px;"> <a
                                                                                href="${process.env.PRIVACYLINK}"
                                                                                style="font-size: 10px;color:#7A7A7A;text-decoration: none;font-weight: normal">Privacy Policy</a> </li>
                                                                        <li style="display: inline-block;"> <a
                                                                                href="${process.env.TERMOFUSELINK}"
                                                                                style="font-size: 10px;color:#7A7A7A;text-decoration: none;font-weight: normal">Terms of Use</a> </li>
                                                                    </ul>
                                                                    </div>
                                                                    </p>
                                                                </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</body>
</html>`,
          attachments: [
            {
              filename: "invoice.pdf",
              contentType: 'application/pdf',
              encoding: 'base64',
              contentTransferEncoding: 'base64',
              contentDisposition: 'attachment',
              content: base64Data
            }
          ]
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
};
//email for acknowledgement mail to user
exports.sendMailJobApplicantUser = async (data) => {
  const mailSubject = `Thank you for applying for the ${data.job_name}`;
  let wildduck_mail_id = [];
  let wildduckInboxObj = {};
  let wildduck_mailbox_id = [];
  const response = await axios.get(data.cvUrl, { responseType: 'arraybuffer' });
  const base64Data = Buffer.from(response.data, 'binary').toString('base64');
  let CAREERMAIL = process.env.CAREERMAIL;
  let user_id = process.env.CAREERUSER;
  let careerDisplayName = process.env.CAREERDISPLAYNAME;
  console.log(base64Data, 'base64Data')
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  // if (getCatUser) {
  //get wildduck user mailbox id
  const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${user_id}/mailboxes`;
  const wildDuckMailboxResponse = await axios.get(
    wildDuckApiUrl,
    {
      headers: {
        'X-Access-Token': `${ACCESS_TOKEN}`
      }
    }
  );
  // console.log(wildDuckMailboxResponse?.data)
  if (wildDuckMailboxResponse?.data?.success === true) {
    let mailBoxId = '';
    let initialMailboxId = '';
    let inboxMailboxId = '';
    let results = wildDuckMailboxResponse.data.results;
    //loop for get inbox id
    for (let jk = 0; jk < results.length; jk++) {
      if (results[jk].path == 'Sent Mail') {
        mailBoxId = results[jk].id;
      }
      if (results[jk].path == 'Initial Contact Sent') {
        initialMailboxId = results[jk].id;
      }
      if (results[jk].path == 'INBOX') {
        inboxMailboxId = results[jk].id;
      }
    }
    //send mail to user
    const wildDuckSendMail = await axios.post(
      `${process.env.WILDDUCKAPIBASEURL}/users/${user_id}/submit`,
      {
        mailbox: mailBoxId,
        from: {
          "name": careerDisplayName,
          "address": CAREERMAIL
        },
        to: [
          {
            "name": data.first_name + ' ' + data.last_name,
            "address": data.email
          }
        ],
        subject: mailSubject,
        text: "",
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Job Position</title>
    <style type="text/css">
      img {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
      }
      table,
      td {
        color: #f2f2f2;
      }
      a {
        color: #0000ee;
        text-decoration: underline;
      }
      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }
        .u-row .u-col {
          vertical-align: top;
        }
        .u-row .u-col-100 {
          width: 600px !important;
        }
      }
      @media (max-width: 620px) {
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          margin-top: 0px !important;
        }
        .u-row .u-col {
          min-width: 320px !important;
          max-width: 100% !important;
          display: block !important;
          padding: 40px 10px 30px 10px !important;
        }
        .u-row {
          /* width: calc(100% - 20px) !important; */
        }
        .u-col {
          /* width: 100% !important; */
        }
        .u-col > div {
          margin: 0 auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
      }
      table,
      tr,
      td {
        vertical-align: top;
        border-collapse: collapse;
      }
      p {
        margin: 0;
      }
      .ie-container table,
      .mso-container table {
        table-layout: fixed;
      }
      * {
        line-height: inherit;
      }
      a[x-apple-data-detectors="true"] {
        color: inherit !important;
        text-decoration: none !important;
      }
    </style>
    <link
      href="https://fonts.googleapis.com/css?family=Cabin:400,700"
      rel="stylesheet"
      type="text/css"
    />
  </head>
  <body
    class="clean-body u_body"
    style="
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #262626;
      color: #f2f2f2;
    "
  >
    <table
      style="
        border-collapse: collapse;
        table-layout: fixed;
        border-spacing: 0;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        vertical-align: top;
        min-width: 320px;
        margin: 0 auto;
        background-color: #262626;
        width: 100%;
      "
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr style="vertical-align: top">
          <td
            style="
              word-break: break-word;
              border-collapse: collapse !important;
              vertical-align: top;
            "
          >
            <div
              class="u-row-container"
              style="
                padding: 0px;
                background-color: transparent;
                margin-top: 80px;
              "
            >
              <div
                class="u-row"
                style="
                  margin: 0 auto;
                  min-width: 320px;
                  max-width: 639px;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                  word-break: break-word;
                  background-color: #141414;
                "
              >
                <div
                  style="
                    border-collapse: collapse;
                    display: table;
                    width: 100%;
                    background-color: transparent;
                  "
                >
                  <div
                    class="u-col u-col-100"
                    style="
                      display: table-cell;
                      vertical-align: top;
                      padding: 40px 40px 30px 40px;
                    "
                  >
                    <div style="width: 100% !important">
                      <div
                        style="
                          padding: 0px;
                          border-top: 0px solid transparent;
                          border-left: 0px solid transparent;
                          border-right: 0px solid transparent;
                          border-bottom: 0px solid transparent;
                        "
                      >
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 0px 0px 5px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    text-align: center;
                                    margin: 10px auto 20px auto;
                                    width: 51.54px !important;
                                  "
                                >
                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                  <img
                                    style="width: 51.54px !important"
                                    src="${process.env.APPLOGO}"
                                    alt=""
                                  />
                                  </a>
                                </div>
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: center;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 20px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 600;
                                    "
                                  >
                                    Thank you for contacting us:
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 20px 0px 15px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 16px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                      margin-bottom: 15px;
                                    "
                                  >
                                    Hi ${data.first_name} ${data.last_name}
                                  </p>
                                  <div
                                    style="
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 21.86px;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                        margin-bottom: 12px;
                                      "
                                    >
                                      Thank you for applying for the
                                      ${data.job_name} at Black Jet. We have
                                      received your application and appreciate
                                      your interest in joining our team.
                                    </p>
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 21.86px;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      Our hiring team is currently reviewing all
                                      applications, and we will be in touch if
                                      we determine there’s a potential fit.
                                    </p>
                                  </div>
                                  <div
                                    style="
                                      margin-top: 30px;
                                      line-height: 90%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 14px;
                                        line-height: 160%;
                                        color: #bfbfbf;
                                        font-weight: 600;
                                      "
                                    >
                                      Below is a copy of your enquiry:
                                    </p>
                                    <div>
                                      <table style="width: 100%">
                                        <tr>
                                          <td style="width: 45%">
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 700;
                                                  color: #7a7a7a;
                                                "
                                                >Full legal name:
                                              </span>
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 400;
                                                  color: #7a7a7a;
                                                "
                                              >
                                                ${data.first_name}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 700;
                                                  color: #7a7a7a;
                                                "
                                                >Email:
                                              </span>
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 400;
                                                  color: #7a7a7a;
                                                "
                                              >
                                                ${data.email}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 700;
                                                  color: #7a7a7a;
                                                "
                                                >Contact No:
                                              </span>
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 400;
                                                  color: #7a7a7a;
                                                "
                                              >
                                                ${data.phone_code}-${data.phone}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 5px;
                                              "
                                            >
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 700;
                                                  color: #7a7a7a;
                                                "
                                                >Attached CV:
                                              </span>
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 400;
                                                  color: #7a7a7a;
                                                "
                                              >
                                                ${data.cv}</span
                                              >
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 700;
                                                  color: #7a7a7a;
                                                "
                                                >Current Annual Salary:
                                              </span>
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 400;
                                                  color: #7a7a7a;
                                                "
                                              >
                                                $${data.salary}:</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 700;
                                                  color: #7a7a7a;
                                                "
                                                >Desired Annual Salary:
                                              </span>
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 400;
                                                  color: #7a7a7a;
                                                "
                                              >
                                                $${data.desired_salary}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 700;
                                                  color: #7a7a7a;
                                                "
                                                >Visa Sponsorship Required:
                                              </span>
                                              <span
                                                style="
                                                  font-size: 10px;
                                                  font-weight: 400;
                                                  color: #7a7a7a;
                                                "
                                              >
                                                ${data.is_visa_sponsorship}</span
                                              >
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                    </div>
                                    <div
                                      style="
                                        text-align: left;
                                        margin-top: 10px;
                                        margin-bottom: 12px;
                                      "
                                    >
                                      <span
                                        style="
                                          font-size: 10px;
                                          font-weight: 400;
                                          color: #7a7a7a;
                                          line-height: 13.66px;
                                        "
                                        ><b style="display: block"
                                          >Your Cover Letter:</b
                                        >
                                        ${data.cover_letter}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                    margin-top: 30px;
                                  "
                                >
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      border-top: 1px solid #242424;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #7a7a7a;
                                        font-weight: 400;
                                        text-align: center;
                                        padding-top: 5px;
                                      "
                                    ></p>
                                    <div
                                      style="
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        margin: 0 auto;
                                        width: 100%;
                                      "
                                    >
                                      <ul
                                        style="
                                          font-size: 12px;
                                          line-height: 160%;
                                          color: #7a7a7a;
                                          font-weight: 400;
                                          text-align: center;
                                          padding-top: 5px;
                                          margin: 0;
                                          padding: 0;
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          margin: 0 auto;
                                        "
                                      >
                                      <li style="display: inline-block">
                                        <a
                                          href="${process.env.WEBSITELINK}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          ><span
                                            style="
                                              position: relative;
                                              top: 0px;
                                              margin-right: 1px;
                                            "
                                            >&#169;</span
                                          >
                                          2023 Black Jet Mobility Pty Ltd</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.privacylink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Privacy Policy</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.termlink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Terms of Use</a
                                        >
                                      </li>
                                    </ul>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`
      },
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );

    if (wildDuckSendMail?.data?.success === true) {
      wildduck_mail_id.push({ 'id': wildDuckSendMail.data.message.id });
      wildduck_mailbox_id.push({ 'mailbox': wildDuckSendMail.data.message.mailbox });
      console.log('mail sent to user')
      wildduckInboxObj = {
        "Full Legal Name": data.first_name + ' ' + data.last_name, // enquiry sender first name
        "email": data.email, // enquiry sender email ID
        "Contact No": data.phone_code + data.phone, // enquiry sender phone
        "Attached Cv": data.cv,
        "Current Annual Salary": data.salary, // assuming salary is provided in `data`
        "Desired Annual Salary": data.desired_salary, // assuming desired salary is provided in `data`
        "Visa Sponsorship Required": data.is_visa_sponsorship,
        "Cv": data.cvUrl,
        "Your Cover Letter": data.cover_letter // assuming cover letter is provided in `data`
      };
      //let lastId = 0;
      //getting inbox last id
      // const wildDuckResponse12 = await axios.get(
      //   `${process.env.WILDDUCKAPIBASEURL}/users/${.user_id}/mailboxes/${inboxMailboxId}/messages`,
      //   {
      //     headers: {
      //       'X-Access-Token': `${ACCESS_TOKEN}`
      //     }
      //   }
      // );

      // if (wildDuckResponse12?.data?.success === true) {
      //   if (wildDuckResponse12.data.results.length>0) {
      //     lastId = wildDuckResponse12.data.results[0].id;
      //   }

      // }
      //save mail to inbox
      const wildDuckSendMailToUs = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${user_id}/mailboxes/${inboxMailboxId}/messages`,
        {
          unseen: true,
          flagged: true,
          from: {
            "name": data.first_name + ' ' + data.last_name,
            "address": data.email
          },
          to: [
            {
              "name": careerDisplayName,
              "address": CAREERMAIL
            }
          ],
          subject: data.job_name,
          // text: `${wildduckInboxObj}`,
          html: ` <!DOCTYPE html>
<html>
<head>
</head>
<body>

   <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                >Full legal name:
                                              </span>
                                              <span
                                              >
                                                ${data.first_name}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                >Email:
                                              </span>
                                              <span
                                              >
                                                ${data.email}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                >Contact No:
                                              </span>
                                              <span
                                              >
                                                ${data.phone_code}-${data.phone}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 5px;
                                              "
                                            >
                                              <span
                                                >Attached CV:
                                              </span>
                                              <span
                                              >
                                                ${data.cv}</span
                                              >
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                >Current Annual Salary:
                                              </span>
                                              <span
                                              >
                                                $${data.salary}:</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                >Desired Annual Salary:
                                              </span>
                                              <span
                                              >
                                                $${data.desired_salary}</span
                                              >
                                            </div>
                                            <div
                                              style="
                                                text-align: left;
                                                margin-bottom: 0px;
                                              "
                                            >
                                              <span
                                                >Visa Sponsorship Required:
                                              </span>
                                              <span
                                              >
                                               ${data.is_visa_sponsorship}</span
                                              >
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                    </div>

</body>
</html>
`,
          attachments: [
            {
              filename: `${data.cv}`,
              contentType: 'application/pdf',
              encoding: 'base64',
              contentTransferEncoding: 'base64',
              contentDisposition: 'attachment',
              content: base64Data
            }
          ],
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );
      if (wildDuckSendMailToUs?.data?.success === true) {
        wildduck_mail_id.push({ 'id': wildDuckSendMailToUs.data.message.id });
        wildduck_mailbox_id.push({ 'mailbox': wildDuckSendMailToUs.data.message.mailbox });
        //getting inbox mailbox id
        //getting address id
        // const wildDuckResponse1 = await axios.get(
        //   `${process.env.WILDDUCKAPIBASEURL}/users/${.user_id}/mailboxes/${inboxMailboxId}/messages`,
        //   {
        //     headers: {
        //       'X-Access-Token': `${ACCESS_TOKEN}`
        //     }
        //   }
        // );

        // if (wildDuckResponse1?.data?.success === true) {
        //   if (wildDuckResponse1.data.results.length>0) {
        //     if(lastId == wildDuckResponse1.data.results[0].id){
        //       lastId = lastId + 1;
        //       wildduck_mail_id.push({ 'id': lastId });
        //     }else{
        //       wildduck_mail_id.push({ 'id': wildDuckResponse1.data.results[0].id });
        //     }
        //   }


        //   wildduck_mailbox_id.push({ 'mailbox': wildDuckResponse1.data.results[0].mailbox });
        // }
        console.log('mail sent to ' + data.email)
      } else {
        console.log('mail not sent to' + data.email)
      }

    } else {
      console.log('mail not sent')
    }
  }
  let resultVal = { 'wildduck_mail_id': wildduck_mail_id, 'wildduck_mailbox_id': wildduck_mailbox_id }
  return resultVal;
  // }
}
// exports.sendUpgradeMailInvoice = async (data) => {
//   const mailSubject = 'Upgrade Membership Invoice';
//   //mail options
//   const mailOptions = {
//     from: process.env.SMTP_USERNAME,//username from mail send
//     to: data.email,//to email where email to send
//     subject: mailSubject,//mail subject
//     text: 'Please find the attached invoice.',//text body content
//     attachments: [
//       {
//         filename: 'invoice.pdf',
//         path: data.file,
//       },
//     ],
//   };
//   //send mail
//   transporter.sendMail(mailOptions, function (error, info) {
//     if (error) {
//       console.log("Error while sending mail=", error);
//     } else {
//       console.log("Mail sent!")
//     }
//   })
// };
// exports.sendMailRefundInvoice = async (data) => {
//   const mailSubject = 'Refund Invoice';
//   //mail options
//   const mailOptions = {
//     from: process.env.SMTP_USERNAME,//username from mail send
//     to: data.email,//to email where email to send
//     subject: mailSubject,//mail subject
//     text: 'Please find the attached invoice.',//text body content
//     attachments: [
//       {
//         filename: 'invoice.pdf',
//         path: data.file,
//       },
//     ],
//   };
//   //send mail
//   transporter.sendMail(mailOptions, function (error, info) {
//     if (error) {
//       console.log("Error while sending mail=", error);
//     } else {
//       console.log("Mail sent!")
//     }
//   })
// };
// exports.sendBoutiqueInvoice = async (data) => {
//   const mailSubject = 'Boutique Invoice';
//   //mail options
//   const mailOptions = {
//     from: process.env.SMTP_USERNAME,//username from mail send
//     to: data.email,//to email where email to send
//     subject: mailSubject,//mail subject
//     text: 'Please find the attached invoice.',//text body content
//     attachments: [
//       {
//         filename: 'invoice.pdf',
//         path: data.file,
//       },
//     ],
//   };
//   //send mail
//   transporter.sendMail(mailOptions, function (error, info) {
//     if (error) {
//       console.log("Error while sending mail=", error);
//     } else {
//       console.log("Mail sent!")
//     }
//   })
// };
// exports.sendPetPassInvoice = async (data) => {
//   const mailSubject = 'Pet Pass Invoice';
//   //mail options
//   const mailOptions = {
//     from: process.env.SMTP_USERNAME,//username from mail send
//     to: data.email,//to email where email to send
//     subject: mailSubject,//mail subject
//     text: 'Please find the attached invoice.',//text body content
//     attachments: [
//       {
//         filename: 'invoice.pdf',
//         path: data.file,
//       },
//     ],
//   };
//   //send mail
//   transporter.sendMail(mailOptions, function (error, info) {
//     if (error) {
//       console.log("Error while sending mail=", error);
//     } else {
//       console.log("Mail sent!")
//     }
//   })
// };
//email for membership change
exports.sendMembershipMail = async (data) => {
  const mailSubject = 'Membership Agreement Update';
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "name": data.fullName,
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: data.body,
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title></title>
    <style type="text/css">
      table,
      td {
        color: #f2f2f2;
      }
      a {
        color: #0000ee;
        text-decoration: underline;
      }
      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }
        .u-row .u-col {
          vertical-align: top;
        }
        .u-row .u-col-100 {
          width: 600px !important;
        }
      }
      @media (max-width: 620px) {
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          margin-top: 0px !important;
        }
        .u-row .u-col {
          min-width: 320px !important;
          max-width: 100% !important;
          display: block !important;
          padding: 40px 10px 30px 10px !important;
        }
        .u-row {
          /* width: calc(100% - 20px) !important; */
        }
        .u-col {
          /* width: 100% !important; */
        }
        .u-col > div {
          margin: 0 auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
      }
      table,
      tr,
      td {
        vertical-align: top;
        border-collapse: collapse;
      }
      p {
        margin: 0;
      }
      .ie-container table,
      .mso-container table {
        table-layout: fixed;
      }
      * {
        line-height: inherit;
      }
      a[x-apple-data-detectors="true"] {
        color: inherit !important;
        text-decoration: none !important;
      }
    </style>
    <link
      href="https://fonts.googleapis.com/css?family=Cabin:400,700"
      rel="stylesheet"
      type="text/css"
    />
  </head>
  <body
    class="clean-body u_body"
    style="
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #262626;
      color: #f2f2f2;
    "
  >
    <table
      style="
        border-collapse: collapse;
        table-layout: fixed;
        border-spacing: 0;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        vertical-align: top;
        min-width: 320px;
        margin: 0 auto;
        background-color: #262626;
        width: 100%;
      "
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr style="vertical-align: top">
          <td
            style="
              word-break: break-word;
              border-collapse: collapse !important;
              vertical-align: top;
            "
          >
            <div
              class="u-row-container"
              style="
                padding: 0px;
                background-color: transparent;
                margin-top: 80px;
              "
            >
              <div
                class="u-row"
                style="
                  margin: 0 auto;
                  min-width: 320px;
                  max-width: 639px;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                  word-break: break-word;
                  background-color: #141414;
                "
              >
                <div
                  style="
                    border-collapse: collapse;
                    display: table;
                    width: 100%;
                    background-color: transparent;
                  "
                >
                  <div
                    class="u-col u-col-100"
                    style="
                      display: table-cell;
                      vertical-align: top;
                      padding: 40px 40px 30px 40px;
                    "
                  >
                    <div style="width: 100% !important">
                      <div
                        style="
                          padding: 0px;
                          border-top: 0px solid transparent;
                          border-left: 0px solid transparent;
                          border-right: 0px solid transparent;
                          border-bottom: 0px solid transparent;
                        "
                      >
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 0px 0px 5px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    text-align: center;
                                    margin-top: 10px;
                                    margin-bottom: 20px;
                                  "
                                >
                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                  <img
                                    width="51.54px"
                                    src="${process.env.APPLOGO}"
                                    alt=""
                                  />
                                  </a>
                                </div>
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: center;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 20px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 600;
                                    "
                                  >
                                    Membership Agreement Update
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 20px 0px 15px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 16px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                      margin-bottom: 15px;
                                    "
                                  >
                                    Hi ${data.fullName},
                                  </p>
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      We would like to inform you that our
                                      <a
                                        href="${data.membershiplink}"
                                        style="color: #f2f2f2; margin: 0 2px"
                                        >Membership Agreement
                                      </a>
                                      has been updated. By continuing to use our
                                      app or website, you agree to the new
                                      terms.
                                    </p>
                                  </div>

                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      margin-top: 10px;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      Thank you for your continued support.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                    margin-top: 30px;
                                  "
                                >
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      border-top: 1px solid #242424;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #7a7a7a;
                                        font-weight: 400;
                                        text-align: center;
                                        padding-top: 5px;
                                      "
                                    ></p>
                                    <div
                                      style="
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        margin: 0 auto;
                                        width: 100%;
                                      "
                                    >
                                      <ul
                                        style="
                                          font-size: 12px;
                                          line-height: 160%;
                                          color: #7a7a7a;
                                          font-weight: 400;
                                          text-align: center;
                                          padding-top: 5px;
                                          margin: 0;
                                          padding: 0;
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          margin: 0 auto;
                                        "
                                      >
                                      <li style="display: inline-block">
                                        <a
                                          href="${process.env.WEBSITELINK}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          ><span
                                            style="
                                              position: relative;
                                              top: 0px;
                                              margin-right: 1px;
                                            "
                                            >&#169;</span
                                          >
                                          2023 Black Jet Mobility Pty Ltd</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.privacylink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Privacy Policy</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.termlink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Terms of Use</a
                                        >
                                      </li>
                                    </ul>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}
//email for terms of use change
exports.sendTermOfUseMail = async (data) => {
  const mailSubject = 'Terms of Use Update';

  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "name": data.fullName,
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: data.body,
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title></title>
    <style type="text/css">
      table,
      td {
        color: #f2f2f2;
      }
      a {
        color: #0000ee;
        text-decoration: underline;
      }
      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }
        .u-row .u-col {
          vertical-align: top;
        }
        .u-row .u-col-100 {
          width: 600px !important;
        }
      }
      @media (max-width: 620px) {
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          margin-top: 0px !important;
        }
        .u-row .u-col {
          min-width: 320px !important;
          max-width: 100% !important;
          display: block !important;
          padding: 40px 10px 30px 10px !important;
        }
        .u-row {
          /* width: calc(100% - 20px) !important; */
        }
        .u-col {
          /* width: 100% !important; */
        }
        .u-col > div {
          margin: 0 auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
      }
      table,
      tr,
      td {
        vertical-align: top;
        border-collapse: collapse;
      }
      p {
        margin: 0;
      }
      .ie-container table,
      .mso-container table {
        table-layout: fixed;
      }
      * {
        line-height: inherit;
      }
      a[x-apple-data-detectors="true"] {
        color: inherit !important;
        text-decoration: none !important;
      }
    </style>
    <link
      href="https://fonts.googleapis.com/css?family=Cabin:400,700"
      rel="stylesheet"
      type="text/css"
    />
  </head>
  <body
    class="clean-body u_body"
    style="
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #262626;
      color: #f2f2f2;
    "
  >
    <table
      style="
        border-collapse: collapse;
        table-layout: fixed;
        border-spacing: 0;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        vertical-align: top;
        min-width: 320px;
        margin: 0 auto;
        background-color: #262626;
        width: 100%;
      "
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr style="vertical-align: top">
          <td
            style="
              word-break: break-word;
              border-collapse: collapse !important;
              vertical-align: top;
            "
          >
            <div
              class="u-row-container"
              style="
                padding: 0px;
                background-color: transparent;
                margin-top: 80px;
              "
            >
              <div
                class="u-row"
                style="
                  margin: 0 auto;
                  min-width: 320px;
                  max-width: 639px;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                  word-break: break-word;
                  background-color: #141414;
                "
              >
                <div
                  style="
                    border-collapse: collapse;
                    display: table;
                    width: 100%;
                    background-color: transparent;
                  "
                >
                  <div
                    class="u-col u-col-100"
                    style="
                      display: table-cell;
                      vertical-align: top;
                      padding: 40px 40px 30px 40px;
                    "
                  >
                    <div style="width: 100% !important">
                      <div
                        style="
                          padding: 0px;
                          border-top: 0px solid transparent;
                          border-left: 0px solid transparent;
                          border-right: 0px solid transparent;
                          border-bottom: 0px solid transparent;
                        "
                      >
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 0px 0px 5px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    text-align: center;
                                    margin-top: 10px;
                                    margin-bottom: 20px;
                                  "
                                >
                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                  <img
                                    width="51.54px"
                                    src="${process.env.APPLOGO}"
                                    alt=""
                                  />
                                  </a>
                                </div>
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: center;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 20px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 600;
                                    "
                                  >
                                    Terms of Use Update
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 20px 0px 15px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 16px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                      margin-bottom: 15px;
                                    "
                                  >
                                    Hi ${data.fullName},
                                  </p>
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      We would like to inform you that our
                                      <a
                                        href="${data.termlink}"
                                        style="color: #f2f2f2; margin: 0 2px"
                                        >Terms of Use</a
                                      >
                                      has been updated. By continuing to use our
                                      app or website, you agree to the new
                                      terms.
                                    </p>
                                  </div>

                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      margin-top: 10px;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      Thank you for your continued support.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                    margin-top: 30px;
                                  "
                                >
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      border-top: 1px solid #242424;
                                    "
                                  >
                                    <div
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #7a7a7a;
                                        font-weight: 400;
                                        text-align: center;
                                        padding-top: 5px;
                                      "
                                    ></div>
                                    <div
                                      style="
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        margin: 0 auto;
                                        width: 100%;
                                      "
                                    >
                                      <ul
                                        style="
                                          font-size: 12px;
                                          line-height: 160%;
                                          color: #7a7a7a;
                                          font-weight: 400;
                                          text-align: center;
                                          padding-top: 5px;
                                          margin: 0;
                                          padding: 0;
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          margin: 0 auto;
                                        "
                                      >
                                      <li style="display: inline-block">
                                        <a
                                          href="${process.env.WEBSITELINK}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          ><span
                                            style="
                                              position: relative;
                                              top: 0px;
                                              margin-right: 1px;
                                            "
                                            >&#169;</span
                                          >
                                          2023 Black Jet Mobility Pty Ltd</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.privacylink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Privacy Policy</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.termlink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Terms of Use</a
                                        >
                                      </li>
                                    </ul>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}
//email for referral terms change
exports.sendReferralTermMail = async (data) => {
  const mailSubject = 'Referral Terms & Conditions Update';

  //get category user id
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        if (results[jk].path == 'Initial Contact Sent') {
          initialMailboxId = results[jk].id;
        }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "name": data.fullName,
              "address": data.email
            }
          ],
          subject: mailSubject,
          text: data.body,
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title></title>
    <style type="text/css">
      table,
      td {
        color: #f2f2f2;
      }
      a {
        color: #0000ee;
        text-decoration: underline;
      }
      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }
        .u-row .u-col {
          vertical-align: top;
        }
        .u-row .u-col-100 {
          width: 600px !important;
        }
      }
      @media (max-width: 620px) {
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          margin-top: 0px !important;
        }
        .u-row .u-col {
          min-width: 320px !important;
          max-width: 100% !important;
          display: block !important;
          padding: 40px 10px 30px 10px !important;
        }
        .u-row {
          /* width: calc(100% - 20px) !important; */
        }
        .u-col {
          /* width: 100% !important; */
        }
        .u-col > div {
          margin: 0 auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
      }
      table,
      tr,
      td {
        vertical-align: top;
        border-collapse: collapse;
      }
      p {
        margin: 0;
      }
      .ie-container table,
      .mso-container table {
        table-layout: fixed;
      }
      * {
        line-height: inherit;
      }
      a[x-apple-data-detectors="true"] {
        color: inherit !important;
        text-decoration: none !important;
      }
    </style>
    <link
      href="https://fonts.googleapis.com/css?family=Cabin:400,700"
      rel="stylesheet"
      type="text/css"
    />
  </head>
  <body
    class="clean-body u_body"
    style="
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #262626;
      color: #f2f2f2;
    "
  >
    <table
      style="
        border-collapse: collapse;
        table-layout: fixed;
        border-spacing: 0;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        vertical-align: top;
        min-width: 320px;
        margin: 0 auto;
        background-color: #262626;
        width: 100%;
      "
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr style="vertical-align: top">
          <td
            style="
              word-break: break-word;
              border-collapse: collapse !important;
              vertical-align: top;
            "
          >
            <div
              class="u-row-container"
              style="
                padding: 0px;
                background-color: transparent;
                margin-top: 80px;
              "
            >
              <div
                class="u-row"
                style="
                  margin: 0 auto;
                  min-width: 320px;
                  max-width: 639px;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                  word-break: break-word;
                  background-color: #141414;
                "
              >
                <div
                  style="
                    border-collapse: collapse;
                    display: table;
                    width: 100%;
                    background-color: transparent;
                  "
                >
                  <div
                    class="u-col u-col-100"
                    style="
                      display: table-cell;
                      vertical-align: top;
                      padding: 40px 40px 30px 40px;
                    "
                  >
                    <div style="width: 100% !important">
                      <div
                        style="
                          padding: 0px;
                          border-top: 0px solid transparent;
                          border-left: 0px solid transparent;
                          border-right: 0px solid transparent;
                          border-bottom: 0px solid transparent;
                        "
                      >
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 0px 0px 5px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    text-align: center;
                                    margin-top: 10px;
                                    margin-bottom: 20px;
                                  "
                                >
                                <a href="${process.env.WEBSITELINK}" target="_blank" style="text-decoration:none">
                                  <img
                                    width="51.54px"
                                    src="${process.env.APPLOGO}"
                                    alt=""
                                  />
                                  </a>
                                </div>
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: center;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 20px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 600;
                                    "
                                  >
                                    Referral Terms & Conditions Update
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  padding: 20px 0px 15px 0px;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                  "
                                >
                                  <p
                                    style="
                                      font-size: 16px;
                                      line-height: 160%;
                                      color: #f2f2f2;
                                      font-weight: 400;
                                      margin-bottom: 15px;
                                    "
                                  >
                                    Hi ${data.fullName},
                                  </p>
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      We would like to inform you that our
                                      <a
                                        href="${data.referrallink}"
                                        style="color: #f2f2f2; margin: 0 2px"
                                        >Referral Terms & Conditions
                                      </a>
                                      has been updated. By continuing to use our
                                      app or website, you agree to the new
                                      terms.
                                    </p>
                                  </div>

                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      margin-top: 10px;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 16px;
                                        line-height: 160%;
                                        color: #f2f2f2;
                                        font-weight: 400;
                                      "
                                    >
                                      Thank you for your continued support.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <table
                          style="font-family: 'Cabin', sans-serif"
                          role="presentation"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border="0"
                        >
                          <tbody>
                            <tr>
                              <td
                                style="
                                  overflow-wrap: break-word;
                                  word-break: break-word;
                                  font-family: 'Cabin', sans-serif;
                                "
                                align="left"
                              >
                                <div
                                  style="
                                    line-height: 160%;
                                    text-align: left;
                                    word-wrap: break-word;
                                    margin-top: 30px;
                                  "
                                >
                                  <div
                                    style="
                                      line-height: 160%;
                                      text-align: left;
                                      word-wrap: break-word;
                                      border-top: 1px solid #242424;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 12px;
                                        line-height: 160%;
                                        color: #7a7a7a;
                                        font-weight: 400;
                                        text-align: center;
                                        padding-top: 5px;
                                      "
                                    ></p>
                                    <div
                                      style="
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        margin: 0 auto;
                                        width: 100%;
                                      "
                                    >
                                      <ul
                                        style="
                                          font-size: 12px;
                                          line-height: 160%;
                                          color: #7a7a7a;
                                          font-weight: 400;
                                          text-align: center;
                                          padding-top: 5px;
                                          margin: 0;
                                          padding: 0;
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          margin: 0 auto;
                                        "
                                      >
                                      <li style="display: inline-block">
                                        <a
                                          href="${process.env.WEBSITELINK}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          ><span
                                            style="
                                              position: relative;
                                              top: 0px;
                                              margin-right: 1px;
                                            "
                                            >&#169;</span
                                          >
                                          2023 Black Jet Mobility Pty Ltd</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.privacylink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Privacy Policy</a
                                        >
                                      </li>
                                      <li style="display: inline-block">
                                        <a
                                          href="${data.termlink}"
                                          style="
                                            font-size: 10px;
                                            color: #7a7a7a;
                                            text-decoration: none;
                                            font-weight: normal;
                                          "
                                          >Terms of Use</a
                                        >
                                      </li>
                                    </ul>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}

//email for verify user email
exports.sendFraudMail = async (data) => {
  const mailSubject = data.subject;
  let ACCESS_TOKEN = process.env.WILDDUCK_ACCESS_TOKEN;

  let NOREPLYMAIL = process.env.NOREPLYMAIL;
  //get category user id
  const getCatUser = await contactuscategoriesModal.findOne({ email: NOREPLYMAIL });
  if (getCatUser) {
    //get wildduck user mailbox id
    const wildDuckApiUrl = `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/mailboxes`;
    const wildDuckMailboxResponse = await axios.get(
      wildDuckApiUrl,
      {
        headers: {
          'X-Access-Token': `${ACCESS_TOKEN}`
        }
      }
    );
    // console.log(wildDuckMailboxResponse?.data)
    if (wildDuckMailboxResponse?.data?.success === true) {
      let mailBoxId = '';
      let initialMailboxId = '';
      let results = wildDuckMailboxResponse.data.results;
      //loop for get inbox id
      for (let jk = 0; jk < results.length; jk++) {
        if (results[jk].path == 'Sent Mail') {
          mailBoxId = results[jk].id;
        }
        // if (results[jk].path == 'Initial Contact Sent') {
        //   initialMailboxId = results[jk].id;
        // }
      }
      //send mail to user
      const wildDuckSendMail = await axios.post(
        `${process.env.WILDDUCKAPIBASEURL}/users/${getCatUser.user_id}/submit`,
        {
          mailbox: mailBoxId,
          from: {
            "name": getCatUser.display_name,
            "address": getCatUser.email
          },
          to: [
            {
              "name": 'Rich Liou',
              "address": 'juhi.kumari@techugo.com'
            }
          ],
          subject: mailSubject,
          text: data.message
        },
        {
          headers: {
            'X-Access-Token': `${ACCESS_TOKEN}`
          }
        }
      );

      if (wildDuckSendMail?.data?.success === true) {
        console.log('mail sent to user')
      } else {
        console.log('mail not sent')
      }
    }
  }
  if (!getCatUser) {
    console.log('Noreply category not found.')
  }
}