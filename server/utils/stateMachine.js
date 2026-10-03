/**
 * Central State Machine for Food Donation Lifecycle
 * Valid state transitions directed graph
 */
const VALID_DONATION_TRANSITIONS = {
  pending: ['accepted', 'cancelled', 'expired'],
  accepted: ['assigned', 'scheduled', 'cancelled', 'expired', 'pending'], // pending if NGO unaccepts/releases
  assigned: ['picked_up', 'accepted', 'cancelled', 'expired'], // accepted if volunteer unassigns/rejects
  scheduled: ['picked_up', 'accepted', 'cancelled', 'expired'],
  picked_up: ['delivered', 'in_transit'], // food physically collected, cannot jump to pending or cancelled without dispute
  in_transit: ['delivered'],
  delivered: [], // Terminal
  cancelled: [], // Terminal
  expired: []    // Terminal
};

/**
 * Validates whether transition from fromStatus to toStatus is legally permitted
 * @param {string} fromStatus Current status
 * @param {string} toStatus Target status
 * @param {boolean} isAdmin Whether caller is admin override
 * @returns {{ valid: boolean, reason?: string }}
 */
const isValidDonationTransition = (fromStatus, toStatus, isAdmin = false) => {
  if (fromStatus === toStatus) {
    return { valid: true, isNoOp: true };
  }

  const allowed = VALID_DONATION_TRANSITIONS[fromStatus] || [];
  if (allowed.includes(toStatus)) {
    return { valid: true };
  }

  // Admin overrides: allow most transitions except resurrecting delivered food or reverting in-transit to pending
  if (isAdmin) {
    if (fromStatus === 'delivered' && toStatus !== 'delivered') {
      return { valid: false, reason: 'Cannot alter a transaction that was already delivered and distributed.' };
    }
    if ((fromStatus === 'picked_up' || fromStatus === 'in_transit') && toStatus === 'pending') {
      return { valid: false, reason: 'Food is currently in transit with a volunteer. Cannot revert to pending.' };
    }
    return { valid: true, isAdminOverride: true };
  }

  return {
    valid: false,
    reason: `Invalid state transition from '${fromStatus}' to '${toStatus}'.`
  };
};

/**
 * Strips sensitive OTPs based on the requesting user's identity and role
 * @param {Object} donation Mongoose document or plain object
 * @param {Object} user Requesting user from req.user
 * @returns {Object} Sanitized donation object
 */
const sanitizeDonationForUser = (donation, user) => {
  if (!donation) return null;
  const d = donation.toObject ? donation.toObject() : { ...donation };

  if (!user) {
    delete d.pickupOtp;
    delete d.deliveryOtp;
    return d;
  }

  // Admins can see full context for auditing
  if (user.role === 'admin') {
    return d;
  }

  const userIdStr = user._id ? user._id.toString() : user.id ? user.id.toString() : '';
  const donorIdStr = d.donor ? (d.donor._id ? d.donor._id.toString() : d.donor.toString()) : '';
  const acceptedByIdStr = d.acceptedBy ? (d.acceptedBy._id ? d.acceptedBy._id.toString() : d.acceptedBy.toString()) : '';
  const volunteerIdStr = d.assignedVolunteer ? (d.assignedVolunteer._id ? d.assignedVolunteer._id.toString() : d.assignedVolunteer.toString()) : '';

  // 1. Volunteer must NEVER see either OTP beforehand (they must ask donor/NGO for the code)
  if (user.role === 'volunteer') {
    delete d.pickupOtp;
    delete d.deliveryOtp;
    return d;
  }

  // 2. Donor should only see pickupOtp (to share with volunteer upon food collection)
  if (userIdStr === donorIdStr) {
    delete d.deliveryOtp; // Donor never needs delivery OTP
    return d;
  }

  // 3. NGO should only see deliveryOtp (to share with volunteer upon food delivery dropoff)
  if (userIdStr === acceptedByIdStr) {
    delete d.pickupOtp; // NGO never needs pickup OTP
    return d;
  }

  // Any other caller: strip all OTPs
  delete d.pickupOtp;
  delete d.deliveryOtp;
  return d;
};

module.exports = {
  VALID_DONATION_TRANSITIONS,
  isValidDonationTransition,
  sanitizeDonationForUser
};
