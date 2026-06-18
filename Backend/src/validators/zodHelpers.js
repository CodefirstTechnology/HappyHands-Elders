const { z } = require("zod");

const emptyToUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
};

const optionalNumber = (schema = z.number()) =>
  z.preprocess(
    emptyToUndefined,
    z
      .union([z.undefined(), z.coerce.number().pipe(schema)])
      .optional()
  );

const optionalInt = () => optionalNumber(z.number().int());
const optionalPositiveInt = () => optionalNumber(z.number().int().positive());

module.exports = {
  emptyToUndefined,
  optionalNumber,
  optionalInt,
  optionalPositiveInt
};
