const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    role,
    organizationName,
    registrationNumber,
    address,
    vehicleType,
    vehicleNumber
  } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Determine verification status
    const isVerified = role === 'ngo' ? false : true;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      address,
      isVerified
    });

    if (user) {
      let additionalData = {};

      // If role is NGO, create NGO profile
      if (role === 'ngo') {
        await NgoProfile.create({
          user: user._id,
          organizationName,
          registrationNumber,
          address: {
            street: address // Mapping the single address string to street for simplicity
          }
        });
        additionalData = {
          organizationName,
          registrationNumber,
          verificationStatus: 'pending'
        };
      }

      // If role is Volunteer, create Volunteer profile
      if (role === 'volunteer') {
        const volunteerProfile = await VolunteerProfile.create({
          user: user._id,
          vehicleType: vehicleType || 'bike',
          vehicleNumber: vehicleNumber || '',
          address: {
            street: address || ''
          }
        });
        additionalData = {
          vehicleType: volunteerProfile.vehicleType,
          vehicleNumber: volunteerProfile.vehicleNumber,
          availabilityStatus: volunteerProfile.availabilityStatus,
          completedDeliveries: volunteerProfile.completedDeliveries,
          activeDeliveries: volunteerProfile.activeDeliveries,
          rating: volunteerProfile.rating
        };
      }

      // Return same structure as login
      res.status(201).json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          address: user.address,
          isVerified: user.isVerified,
          ...additionalData
        }
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      let additionalData = {};

      if (user.role === 'ngo') {
        const ngoProfile = await NgoProfile.findOne({ user: user._id });
        if (ngoProfile) {
          additionalData = {
            organizationName: ngoProfile.organizationName,
            registrationNumber: ngoProfile.registrationNumber,
            verificationStatus: ngoProfile.verificationStatus
          };
        }
      }

      if (user.role === 'volunteer') {
        let volunteerProfile = await VolunteerProfile.findOne({ user: user._id });
        if (!volunteerProfile) {
          volunteerProfile = await VolunteerProfile.create({
            user: user._id,
            address: { street: user.address || '' }
          });
        }
        additionalData = {
          vehicleType: volunteerProfile.vehicleType,
          vehicleNumber: volunteerProfile.vehicleNumber,
          availabilityStatus: volunteerProfile.availabilityStatus,
          completedDeliveries: volunteerProfile.completedDeliveries,
          activeDeliveries: volunteerProfile.activeDeliveries,
          rating: volunteerProfile.rating
        };
      }

      res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          address: user.address,
          isVerified: user.isVerified,
          ...additionalData
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      let additionalData = {};

      if (user.role === 'ngo') {
        const ngoProfile = await NgoProfile.findOne({ user: user._id });
        if (ngoProfile) {
          additionalData = {
            organizationName: ngoProfile.organizationName,
            registrationNumber: ngoProfile.registrationNumber,
            verificationStatus: ngoProfile.verificationStatus
          };
        }
      }

      if (user.role === 'volunteer') {
        let volunteerProfile = await VolunteerProfile.findOne({ user: user._id });
        if (!volunteerProfile) {
          volunteerProfile = await VolunteerProfile.create({
            user: user._id,
            address: { street: user.address || '' }
          });
        }
        additionalData = {
          vehicleType: volunteerProfile.vehicleType,
          vehicleNumber: volunteerProfile.vehicleNumber,
          availabilityStatus: volunteerProfile.availabilityStatus,
          completedDeliveries: volunteerProfile.completedDeliveries,
          activeDeliveries: volunteerProfile.activeDeliveries,
          rating: volunteerProfile.rating,
          emergencyContact: volunteerProfile.emergencyContact
        };
      }

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        isVerified: user.isVerified,
        ...additionalData
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.email && req.body.email !== user.email) {
        return res.status(400).json({ message: 'Email address cannot be changed.' });
      }

      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      let additionalData = {};

      if (user.role === 'ngo') {
        const ngoProfile = await NgoProfile.findOne({ user: user._id });
        if (ngoProfile) {
          ngoProfile.organizationName = req.body.organizationName || ngoProfile.organizationName;

          // Prevent updating registration number if already verified
          if (req.body.registrationNumber && req.body.registrationNumber !== ngoProfile.registrationNumber) {
            if (ngoProfile.verificationStatus === 'approved') {
              return res.status(400).json({ message: 'Cannot change registration number after NGO is verified.' });
            }
            ngoProfile.registrationNumber = req.body.registrationNumber;
          }

          await ngoProfile.save();

          additionalData = {
            organizationName: ngoProfile.organizationName,
            registrationNumber: ngoProfile.registrationNumber,
            verificationStatus: ngoProfile.verificationStatus
          };
        }
      }

      if (user.role === 'volunteer') {
        let volunteerProfile = await VolunteerProfile.findOne({ user: user._id });
        if (!volunteerProfile) {
          volunteerProfile = new VolunteerProfile({ user: user._id });
        }

        if (req.body.vehicleType) volunteerProfile.vehicleType = req.body.vehicleType;
        if (req.body.vehicleNumber !== undefined) volunteerProfile.vehicleNumber = req.body.vehicleNumber;
        if (req.body.availabilityStatus) volunteerProfile.availabilityStatus = req.body.availabilityStatus;
        if (req.body.emergencyContact) volunteerProfile.emergencyContact = req.body.emergencyContact;

        await volunteerProfile.save();

        additionalData = {
          vehicleType: volunteerProfile.vehicleType,
          vehicleNumber: volunteerProfile.vehicleNumber,
          availabilityStatus: volunteerProfile.availabilityStatus,
          completedDeliveries: volunteerProfile.completedDeliveries,
          activeDeliveries: volunteerProfile.activeDeliveries,
          rating: volunteerProfile.rating,
          emergencyContact: volunteerProfile.emergencyContact
        };
      }

      res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        address: updatedUser.address,
        isVerified: updatedUser.isVerified,
        ...additionalData
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url
    // In production, this should point to your frontend domain
    const resetUrl = `${req.protocol}://${req.get('host').replace('3001', '5173')}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #ea580c; text-align: center;">ShareBite Password Reset</h2>
            <p>You requested a password reset for your ShareBite account.</p>
            <p>Please click the button below to reset your password. This link will expire in 10 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      });

      res.status(200).json({ message: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (!req.body.password || req.body.password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Log the user in and return token
    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
};
