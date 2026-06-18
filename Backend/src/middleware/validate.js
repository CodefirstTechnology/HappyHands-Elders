const ApiError = require("../utils/ApiError");

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  });

  if (!result.success) {
    const issues = result.error.issues ?? result.error.errors ?? [];
    const message =
      issues.length > 0
        ? issues.map((e) => e.message).join(", ")
        : "Validation failed";
    return next(new ApiError(400, message));
  }

  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.query = result.data.query;
  if (result.data.params) req.params = result.data.params;

  next();
};

module.exports = validate;
