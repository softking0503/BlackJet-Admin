
exports.errorResponse = (err, res) => {
    console.log('server error', err.message);
    return res.status(400).json({ status_code: 400, success: false, message: err.message, data: [] });
}

exports.successResponse = (result, message, res) => {
    return res.status(200).json({ status_code: 200, success: true, message, data: result });
}

exports.successResponseWithoutData = (message, res) => {
    return res.status(200).json({ status_code: 200, success: true, message });
}

exports.successResponseWithPagination = (result, totalItems, message, res) => {
    return res.status(200).json({ status_code: 200, success: true, message, data: result, totalItems: (totalItems || 0) });
}

exports.successResponseWithPaginationPoll = (result, countRef, totalItems, message, res) => {
    return res.status(200).json({ status_code: 200, success: true, message, data: result, totalItems: (totalItems || 0), countRef });
}

exports.emptyResponse = (result, res) => {
    let response = {};
    if (Array.isArray(result)) {
        response = [];
    }
    return res.status(200).json({ status_code: 200, success: false, message: 'No data found', response });
}

exports.failMessage = (err, res) => {
    return res.status(400).json({ status_code: 400, success: false, message: err, data: [] });
}


exports.errorServer = (err, res, status) => {
    const matchEmail = err.message.match('email_1 dup key');
    const matchPhone = err.message.match('phone_1 dup key');
    const matchName = err.message.match('name_1 dup key');
    const matchAssets = err.message.match('assets_1 dup key');

    let message = err.message;
    if (!!matchEmail) {
        message = 'Email already exist';
    } else if (!!matchPhone) {
        message = 'Phone already exist';
    } else if (!!matchName) {
        message = 'Name already exist';
    } else if (!!matchAssets) {
        message = 'Assets already used';
    }
    console.log('server error', message);
    return res.status(status).json({ status_code: status, success: false, message, data: [] });
}

exports.tokenError = (message, res) => {
    return res.status(200).json({ status_code: 200, success: false, message, data: {} });
}

exports.requiredIdResponse = (message, res) => {
    return res.status(422).json({ status_code: 422, success: false, message, data: {} });
}

exports.customResponse = (message, res) => {
    return res.status(201).json({ status_code: 201, success: false, message, data: {} });
}

exports.NotAcceptable = (message, res) => {
    return res.status(406).json({ status_code: 406, success: false, message });
}

exports.Forbidden = (message, res) => {
    return res.status(403).json({ status_code: 403, success: false, message });
}

exports.internalServerError = (message, res) => {
    return res.status(500).json({ status_code: 500, success: false, message });
}

exports.randomResponse = (message, res) => {
    return res.status(401).json({ status_code: 401, success: false, message });
}

exports.verifyParams = (requestParams, schema, res) => {
    result = schema.validate(requestParams, {
        abortEarly: true
    });
    if (result.error) {
        let message;
        if (result.error.details && result.error.details[0].message) {
            message = result.error.details[0].message
        } else {
            message = result.error.message;
        }

        let response = {
            "message": message,
            "response": {}
        };
        return { status: false, response };
    } else {
        return { status: true }
    }
}

exports.trimParams = (obj) => {
    var trimmed = JSON.stringify(obj, (key, value) => {
        if (typeof value === 'string') {
            return value.trim();
        }
        return value;
    });
    return JSON.parse(trimmed);
}

exports.notFoundResponse = (message, res) => {
    return res.status(404).json({ status_code: 404, success: false, message });
};