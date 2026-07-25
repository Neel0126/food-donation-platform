const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NgoProfile = require('../models/NgoProfile');

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  const { name, email, password, phone, role, organizationName, registrationNumber, address } = req.body;

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
      // If role is NGO, create NGO profile
      if (role === 'ngo') {
        await NgoProfile.create({
          user: user._id,
          organizationName,
          registrationNumber,
          address: {
            street: address // Mapping the single address string to street for simplicity right now
          }
        });
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
          ...(role === 'ngo' && { 
            organizationName, 
            registrationNumber,
            verificationStatus: 'pending' 
          })
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
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};
