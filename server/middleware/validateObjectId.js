const mongoose = require('mongoose');

/**
 * Validates that route parameters are well-formed MongoDB ObjectIds
 * Prevents CastError crashes on malformed/fuzzed URL parameters
 * Compatible with router.param('id', validateObjectId()) or direct route middleware
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next, paramVal) => {
    const id = paramVal !== undefined ? paramVal : req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: `Invalid resource identifier: "${id}"` });
    }
    next();
  };
};

module.exports = validateObjectId;
