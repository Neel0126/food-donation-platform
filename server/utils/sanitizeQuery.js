/**
 * Sanitizes input strings before embedding into regular expressions
 * Prevents ReDoS and NoSQL Injection where query operators like $regex, $gt are supplied
 * @param {string} text Input text
 * @returns {string} Escaped string safe for RegExp
 */
const escapeRegex = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Ensures parameter is a safe scalar string, discarding objects or arrays that could represent NoSQL operators
 * @param {*} val Any input value
 * @param {string} fallback Default fallback value
 * @returns {string}
 */
const safeString = (val, fallback = '') => {
  if (typeof val === 'string') return val.trim();
  return fallback;
};

module.exports = {
  escapeRegex,
  safeString
};
