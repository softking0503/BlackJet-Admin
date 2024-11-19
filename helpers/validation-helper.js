exports.validateSchema = (schema, property) => {
    return (req, res, next) => {
        const params = req.body;
        const { error } = schema.validate(params);
        const valid = error == null;

        if (valid) {
            next();
        } else {
            const { details } = error;
            const message = details.map(i => i.message).join(',');

            console.log("error", message);
            const msg = message.replace(/[^a-zA-Z ]/g, "");
            res.status(422).json({ code: 422, status: false, message: msg });
        }
    }
}

exports.validateSchemaGet = (schema, property) => {
    return (req, res, next) => {
        const params = req.query;
        const { error } = schema.validate(params);
        const valid = error == null;

        if (valid) {
            next();
        } else {
            const { details } = error;
            const message = details.map(i => i.message).join(',');

            console.log("error", message);
            const msg = message.replace(/[^a-zA-Z ]/g, "");
            res.status(422).json({ code: 422, status: false, message: msg });
        }
    }
}
