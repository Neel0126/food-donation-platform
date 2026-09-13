const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes — verify JWT token from Authorization header
 * Attaches the user object to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // If user is an NGO, attach their profile's verification status
      if (req.user.role === 'ngo') {
        const NgoProfile = require('../models/NgoProfile');
        const profile = await NgoProfile.findOne({ user: req.user._id });
        if (profile) {
          // If user.isVerified is true, ensure profile is also approved
          if (req.user.isVerified && profile.verificationStatus !== 'approved') {
            profile.verificationStatus = 'approved';
            await profile.save();
          }
          req.user.verificationStatus = profile.verificationStatus;
        } else if (req.user.isVerified) {
          req.user.verificationStatus = 'approved';
        }
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

/**
 * Restrict access to specific roles
 * Usage: authorize('admin', 'ngo')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
