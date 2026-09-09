import FraudBlock from '../models/FraudBlock.js';
import ApiError from '../utils/ApiError.js';

export const checkFraudBlock = async (req, _res, next) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '')
      .toString()
      .split(',')[0]
      .trim()
      .toLowerCase();

    const candidateValues = [];
    if (clientIp) candidateValues.push({ type: 'ip', value: clientIp });

    // Check user email if logged in
    if (req.user?.email) {
      candidateValues.push({ type: 'email', value: req.user.email.toLowerCase().trim() });
    }

    // Check body email / username
    if (req.body?.email) {
      candidateValues.push({ type: 'email', value: String(req.body.email).toLowerCase().trim() });
    }

    // Check body phone / customer phone
    const phone = req.body?.customer?.phone || req.body?.phone;
    if (phone) {
      candidateValues.push({ type: 'phone', value: String(phone).toLowerCase().trim().replace(/[\s-]/g, '') });
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
