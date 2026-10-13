import FraudBlock from '../models/FraudBlock.js';
import ApiError from '../utils/ApiError.js';

export const checkFraudBlock = async (req, _res, next) => {
  try {
    const rawIp = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '')
      .toString()
      .split(',')[0]
      .trim()
      .toLowerCase();

    const candidateValues = [];
    if (rawIp) {
      candidateValues.push({ type: 'ip', value: rawIp });
      if (rawIp.startsWith('::ffff:')) {
        candidateValues.push({ type: 'ip', value: rawIp.replace(/^::ffff:/, '') });
      }
    }

    // Check user email if logged in
    if (req.user?.email) {
      candidateValues.push({ type: 'email', value: req.user.email.toLowerCase().trim() });
    }

    // Check user account id if logged in
    if (req.user?._id) {
      candidateValues.push({ type: 'account', value: String(req.user._id).toLowerCase().trim() });
    }

    // Check body email / customer email
    const bodyEmail = req.body?.customer?.email || req.body?.email;
    if (bodyEmail) {
      candidateValues.push({ type: 'email', value: String(bodyEmail).toLowerCase().trim() });
    }

    // Check phone numbers: user profile, body phone, customer phone, senderNumber
    const phones = [
      req.user?.phone,
      req.body?.phone,
      req.body?.customer?.phone,
      req.body?.senderNumber,
    ].filter(Boolean);

    for (const rawPhone of phones) {
      const cleanPhone = String(rawPhone).toLowerCase().trim().replace(/[\s-]/g, '');
      if (cleanPhone) {
        candidateValues.push({ type: 'phone', value: cleanPhone });
        // Handle common BD phone formatting variations (+88017... vs 017...)
        if (cleanPhone.startsWith('+880')) {
          candidateValues.push({ type: 'phone', value: '0' + cleanPhone.slice(4) });
        } else if (cleanPhone.startsWith('880')) {
          candidateValues.push({ type: 'phone', value: '0' + cleanPhone.slice(3) });
        } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
          candidateValues.push({ type: 'phone', value: '+88' + cleanPhone });
        }
      }
    }

    if (!candidateValues.length) return next();

    const matchedBlock = await FraudBlock.findOne({
      isActive: true,
      $or: candidateValues.map((cv) => ({
        type: cv.type,
        value: cv.value,
      })),
      $and: [
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        },
      ],
    });

    if (matchedBlock) {
      matchedBlock.blockedCount = (matchedBlock.blockedCount || 0) + 1;
      await matchedBlock.save().catch(() => {});

      throw new ApiError(
        403,
        `Access restricted: ${matchedBlock.reason || 'Your IP, phone, or account has been restricted due to security violations.'}`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
