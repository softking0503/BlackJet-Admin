const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const AWS = require('aws-sdk');
const fs = require('fs');
const secretManagerAws = require('../helpers/secretManagerAws');
// yourFile.js
const { generateInvoiceNumber } = require('../helpers/v2/common');
const path = require('path');
// Load variables from .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load variables from .envs
dotenv.config({ path: path.resolve(__dirname, '../config', '.envs') });

const S3_REGION = process.env.S3_REGION;
const BUCKET_NAME = process.env.INVOICE_CONTRACT_FILE_BUCKET;
//genrating membership invoice PDF from HTML 
let generateMembershipInvoicePdf = async (transaction, user) => {

    try {
        // const credentials = new AWS.SharedIniFileCredentials({ profile: "s3" });
        // AWS.config.credentials = credentials;
        // Set your AWS credentials and region
        // AWS.config.update({
        //     region: S3_REGION // s3 region
        // });
        //membership invoice HTML content
        const htmlContent = `<!DOCTYPE HTML
    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Invoice Blackjet</title>
    <style type="text/css">
        table,
        td {
            color: #242424;
        }
        a {
            color: #0000ee;
            text-decoration: underline;
        }
        @media only screen and (min-width: 620px) {
            .u-row {
                width: 1000px !important;
                padding: 50px 60px;
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
            }
            .u-row .u-col {
                min-width: 320px !important;
                max-width: 100% !important;
                display: block !important;
            }
            .u-row {
                width: calc(100% - 40px) !important;
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
  style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #FFFFFF;color: #242424; max-width: 874px;height: 900px;margin:0 auto;padding: 20px 20px;">
    <table
        style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #FFFFFF;width:100%"
        cellpadding="0" cellspacing="0">
        <tbody>
            <tr style="vertical-align: top">
                <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                    <div class="u-row-container" style="padding: 0px;background-color: transparent; padding-top: 30px;">
                        <div class="u-row"
                            style="Margin: 0 auto;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;border: 1px solid gray;border-radius: 4px;padding : 20px 30px">
                            <div
                                style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
                                <div class="u-col u-col-100" style="display: table-cell;vertical-align: top;">
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
                                                                style="text-align:right;margin-top: 10px; margin-bottom: 50px;">
                                                                <img width="100px" src="${process.env.APPLOGOBLACK}" alt="">
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td width="60%"
                                                            style="overflow-wrap:break-word;word-break:break-word;padding:10px 0px 20px 0px;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="background-color: #FFFFFF;padding: 24px 20px 24px 0px;border-radius: 12px;font-size: 50px;line-height: 20.03px;font-weight: 400;text-align: center;width: max-content;">
                                                                TAX INVOICE </div>
                                                            <div
                                                                style="background-color: #FFFFFF;padding: 5px 10px 5px 0px;border-radius: 12px;font-size: 16px;line-height: 20.03px;font-weight: 400;text-align: right;width: 47%;">
                                                                ${transaction.businessName} </div>
                                                            <div
                                                                style="background-color: #FFFFFF;padding: 5px 10px 5px 0px;border-radius: 12px;font-size: 16px;line-height: 20.03px;font-weight: 400;text-align: right;width: 47%;">
                                                                ABN: ${transaction.abn} </div>
                                                            <div
                                                                style="background-color: #FFFFFF;padding: 5px 10px 5px 0px;border-radius: 12px;font-size: 16px;line-height: 20.03px;font-weight: 400;text-align: right;width: 47%;">
                                                                ${user.fullName} </div>
                                                            <div
                                                                style="background-color: #FFFFFF;padding: 5px 10px 5px 0px;border-radius: 12px;font-size: 16px;line-height: 20.03px;font-weight: 400;text-align: right;width: 47%;">
                                                                ${user.email} </div>
                                                        </td>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px 0px 20px 0px;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <table style="font-family:'Cabin',sans-serif;"
                                                                role="presentation" cellpadding="0" cellspacing="0"
                                                                width="100%" border="0">
                                                                <tbody>
                                                                    <tr>
                                                                        <td width="40%"
                                                                            style="overflow-wrap:break-word;word-break:break-word;padding:5px 0px 5px 0px;font-family:'Cabin',sans-serif;"
                                                                            align="left">
                                                                            <table
                                                                                style="font-family:'Cabin',sans-serif;"
                                                                                role="presentation" cellpadding="0"
                                                                                cellspacing="0" width="100%" border="0">
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 0px 7.5px 0px;font-family:'Cabin',sans-serif;"
                                                                                            align="left">
                                                                                            <div
                                                                                                style="text-align: left; word-wrap: break-word;font-weight: bold;font-size: 18px;margin-bottom: 5px;">
                                                                                                Invoice Date
                                                                                            </div>
                                                                                            <div
                                                                                                style="text-align: left; word-wrap: break-word;font-weight: normal;font-size: 18px;">
                                                                                                ${transaction.currdate}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 0px 7.5px 0px;font-family:'Cabin',sans-serif;"
                                                                                            align="left">
                                                                                            <div
                                                                                                style="text-align: left; word-wrap: break-word;font-weight: bold;font-size: 18px;margin-bottom: 5px;">
                                                                                                Invoice Number
                                                                                            </div>
                                                                                            <div
                                                                                                style="text-align: left; word-wrap: break-word;font-weight: normal;font-size: 18px;">
                                                                                                ${transaction.invoiceNo}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 0px 7.5px 0px;font-family:'Cabin',sans-serif;"
                                                                                            align="left">
                                                                                            <div
                                                                                                style="text-align: left; word-wrap: break-word;font-weight: bold;font-size: 18px;margin-bottom: 5px;">
                                                                                                ABN
                                                                                            </div>
                                                                                            <div
                                                                                                style="text-align: left; word-wrap: break-word;font-weight: normal;font-size: 18px;">
                                                                                                27 656 996 244
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>
                                                                        </td>
                                                                        <td width="60%"
                                                                            style="overflow-wrap:break-word;word-break:break-word;padding:5px 0px 5px 0px;font-family:'Cabin',sans-serif;"
                                                                            align="left">
                                                                            <div
                                                                                style="text-align: left; word-wrap: break-word;">
                                                                                BLACK JET MOBILITY PTY LTD
                                                                                Suite 302, 13-15 Wentworth Ave <br>
                                                                                Sydney, NSW 2000 <br>
                                                                                AUSTRALIA
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div style="margin-top: 80px;">
                                                <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <th style="text-align: left;font-size: 16px;font-weight: bold;border-bottom: 3px solid #000;padding:7.5px 5px;">Description </th>
                                                        <th style="text-align: right;font-size: 16px;font-weight: bold;border-bottom: 3px solid #000;padding:7.5px 5px;">Quantity </th>
                                                        <th style="text-align: right;font-size: 16px;font-weight: bold;border-bottom: 3px solid #000;padding:7.5px 5px;">Unit Price </th>
                                                        <th style="text-align: right;font-size: 16px;font-weight: bold;border-bottom: 3px solid #000;padding:7.5px 5px;">Amount AUD </th>
                                                    </tr>
                                                    <tr>
                                                        <td style="text-align: left;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">One-Time Initiation and Verification Fee </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">1 </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">${transaction.initiationFee} </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">${transaction.initiationFee} </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="text-align: left;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">DISCOUNT: One-Time Initiation and Verification Fee </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">1 </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">(${transaction.initiationFees}) </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">(${transaction.initiationFees}) </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="text-align: left;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">${transaction.name} Membership - ${transaction.currdate} to ${transaction.renewalDateInfo} </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">1 </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">${transaction.priceValue} </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">${transaction.priceValue} </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="text-align: left;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">DISCOUNT: ${transaction.name} Membership - ${transaction.currdate} to ${transaction.renewalDateInfo} </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">1 </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">(${transaction.discountPriceVal}) </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-bottom: 1px solid #000;">(${transaction.discountPriceVal}) </td>
                                                    </tr>
                                                    <tr>
                                                        <td> </td>
                                                        <td> </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;">GST 10% Included</td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;">${transaction.gst}</td>
                                                    </tr>
                                                    <tr>
                                                        <td> </td>
                                                        <td> </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-top: 3px solid #000;font-weight: bold;">Total </td>
                                                        <td style="text-align: right;font-size: 16px;padding:5px 5px 5px 5px;border-top: 3px solid #000;font-weight: bold;">${transaction.latest_Price} </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            </div>
                                            <table style="font-family:'Cabin',sans-serif;" role="presentation"
                                                cellpadding="0" cellspacing="0" width="100%" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td style="overflow-wrap:break-word;word-break:break-word;font-family:'Cabin',sans-serif;"
                                                            align="left">
                                                            <div
                                                                style="line-height: 160%; text-align: left; word-wrap: break-word;margin-top: 30px;">
                                                                <div
                                                                    style="line-height: 160%; text-align: left; word-wrap: break-word;margin-top: 50px;">
                                                                    <div style="font-size: 16px;text-align: left;"> Payment</div>
                                                                    <p
                                                                        style="font-size: 14px;color: #242424;font-weight:500;text-align: left;padding-top: 0px;">
                                                                        We've processed your payment using your saved payment method in the app. 
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
</html>`;

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: '/snap/bin/chromium', // Path to ARM-compatible Chromium
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for running in EC2 environment
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent); //setting html 
        const pdfBuffer = await page.pdf({ format: 'A4' }); // genrating pdf buffer
        await browser.close();

        let date = new Date();
        // Call the generateInvoiceNumber function from the common file
        const invoiceNumber = await generateInvoiceNumber();
        // Construct the URL using the generated invoice number
        let filename = `Invoice${invoiceNumber}.pdf`;
        // let filename = date.getTime() + '.pdf';//pdf filename
        //S3 upload 
        const s3 = new AWS.S3();
        const params = {
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
        };
        await s3.upload(params).promise();
        //let fileUrl = "https://" + BUCKET_NAME + ".s3.ap-southeast-2.amazonaws.com/" + filename;
        let fileUrl = filename;
        console.log('PDF uploaded successfully.');
        return fileUrl;

    } catch (error) {
        console.error('Error PDF:', error);
        return error;
    }
}


module.exports = {
    generateMembershipInvoicePdf
}

