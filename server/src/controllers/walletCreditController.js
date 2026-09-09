import User from '../models/User.js';
import PaymentMethod from '../models/PaymentMethod.js';
import WalletCreditPackage from '../models/WalletCreditPackage.js';
import WalletCreditPurchase from '../models/WalletCreditPurchase.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { creditWallet } from '../services/rewardService.js';
import { nextSequence } from '../services/sequenceService.js';
import { writeAudit } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';
import {
  sendAdminWalletCreditPurchaseEmail,
  sendCustomerWalletCreditSubmittedEmail,
  sendCustomerWalletCreditApprovedEmail,
  sendCustomerWalletCreditRejectedEmail,
} from '../services/emailService.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

// Default starter packages if none have been created yet
const DEFAULT_PACKAGES = [
  { name: 'Starter Pack', payAmount: 100, creditAmount: 100, bonusCredits: 0, totalCredits: 100, badge: '', sortOrder: 1 },
  { name: 'Plus Value Pack', payAmount: 500, creditAmount: 500, bonusCredits: 25, totalCredits: 525, badge: 'Popular', sortOrder: 2 },
  { name: 'Pro Power Pack', payAmount: 1000, creditAmount: 1000, bonusCredits: 100, totalCredits: 1100, badge: 'Best Value', sortOrder: 3 },
  { name: 'VIP Ultra Pack', payAmount: 2500, creditAmount: 2500, bonusCredits: 300, totalCredits: 2800, badge: '12% Extra', sortOrder: 4 },
];

/**
 * CUSTOMER: List Active Credit Packages
 */
export const listPublicPackages = asyncHandler(async (_req, res) => {
  let packages = await WalletCreditPackage.find({ isActive: true }).sort({ sortOrder: 1, payAmount: 1 }).lean();
  if (!packages || packages.length === 0) {
    // Seed starter packages seamlessly
    const count = await WalletCreditPackage.countDocuments();
    if (count === 0) {
      packages = await WalletCreditPackage.insertMany(DEFAULT_PACKAGES);
    }
  }
  return success(res, { data: packages });
});

/**
 * CUSTOMER: Submit a Wallet Credit Purchase Request
 */
export const createCreditPurchase = asyncHandler(async (req, res) => {
  const { packageId, paymentMethodId, senderNumber, transactionId, customerNote } = req.body;

  const pkg = await WalletCreditPackage.findOne({ _id: packageId, isActive: true });
  if (!pkg) {
    throw new ApiError(404, 'Selected credit package is invalid or currently unavailable.');
  }

  const paymentMethod = await PaymentMethod.findOne({ _id: paymentMethodId, active: true });
  if (!paymentMethod) {
    throw new ApiError(404, 'Selected payment method is invalid or inactive.');
  }

  if (paymentMethod.gatewayType === 'wallet') {
    throw new ApiError(400, 'Cannot purchase wallet credits using wallet store credit.');
  }

  // Validate manual gateway fields if required
  if (paymentMethod.gatewayType === 'manual' && !transactionId && !senderNumber) {
    throw new ApiError(422, 'Please provide your Sender Number and Transaction ID for payment verification.');
  }

  const seq = await nextSequence('wallet_credit_purchase');
  const purchaseNumber = `WCP-${String(seq).padStart(6, '0')}`;

  const purchase = await WalletCreditPurchase.create({
    purchaseNumber,
    user: req.user._id,
    package: pkg._id,
    packageName: pkg.name,
    amount: pkg.payAmount,
    credits: pkg.creditAmount,
    bonusCredits: pkg.bonusCredits || 0,
    totalCredits: pkg.totalCredits || pkg.creditAmount + (pkg.bonusCredits || 0),
    paymentMethod: paymentMethod.name,
    paymentMethodId: paymentMethod._id,
    transactionId: String(transactionId || '').trim(),
    senderNumber: String(senderNumber || '').trim(),
    customerNote: String(customerNote || '').trim(),
    paymentDetails: {
      accountNumber: paymentMethod.accountNumber || '',
      accountType: paymentMethod.accountType || '',
      accountName: paymentMethod.accountName || '',
      branchName: paymentMethod.branchName || '',
    },
    status: 'pending',
  });

  const user = await User.findById(req.user._id).select('name email phone walletBalance');

  // In-app notifications
  await notifyUser(
    req.user._id,
    'wallet_purchase_submitted',
    'Wallet Credit Request Submitted',
    `Your request #${purchase.purchaseNumber} for ${purchase.totalCredits} credits (৳${purchase.amount}) is under verification.`,
    '/account/wallet/credits'
  ).catch(() => {});

  // Email notifications via Resend (fire and log without blocking response)
  sendAdminWalletCreditPurchaseEmail(purchase, user).catch(() => {});
  sendCustomerWalletCreditSubmittedEmail(purchase, user).catch(() => {});

  return success(res, {
    status: 201,
    message: 'Wallet credit purchase request submitted successfully. Awaiting payment verification.',
    data: purchase,
  });
});

/**
 * CUSTOMER: Get My Wallet Credit Purchase History (Cursor-based)
 */
export const myCreditPurchases = asyncHandler(async (req, res) => {
  const result = await paginateWithCursor(WalletCreditPurchase, {
    query: { user: req.user._id },
    cursor: req.query.cursor,
    direction: req.query.direction,
    limit: req.query.limit,
    sortField: '_id',
    sortOrder: -1,
    populate: [
      { path: 'package', select: 'name badge' },
      { path: 'walletTransaction', select: 'balanceAfter createdAt' },
    ],
  });

  return success(res, result);
});

/**
 * CUSTOMER: Get Single Wallet Credit Purchase Details
 */
export const myCreditPurchase = asyncHandler(async (req, res) => {
  const purchase = await WalletCreditPurchase.findOne({ _id: req.params.id, user: req.user._id })
    .populate('package', 'name badge description')
    .populate('walletTransaction', 'balanceAfter createdAt note')
    .lean();

  if (!purchase) {
    throw new ApiError(404, 'Wallet credit purchase request not found.');
  }

  return success(res, { data: purchase });
});

/**
 * CUSTOMER: Get My Wallet Transactions Ledger (Cursor-based)
 */
export const myWalletTransactions = asyncHandler(async (req, res) => {
  const query = { user: req.user._id };

  if (req.query.type && ['credit', 'debit'].includes(req.query.type)) {
    query.type = req.query.type;
  }
  if (req.query.source) {
    query.source = req.query.source;
  }

  const result = await paginateWithCursor(WalletTransaction, {
    query,
    cursor: req.query.cursor,
    direction: req.query.direction,
    limit: req.query.limit,
    sortField: '_id',
    sortOrder: -1,
  });

  return success(res, result);
});

/**
 * ADMIN: List All Wallet Credit Purchases (with Filters & Keyset Cursor Pagination)
 */
export const adminCreditPurchases = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
    query.status = req.query.status;
  }

  if (req.query.search) {
    const term = String(req.query.search).trim();
    const regex = new RegExp(term, 'i');
    query.$or = [
      { purchaseNumber: regex },
      { transactionId: regex },
      { senderNumber: regex },
      { packageName: regex },
    ];
  }

  if (req.query.userId) {
    query.user = req.query.userId;
  }

  const result = await paginateWithCursor(WalletCreditPurchase, {
    query,
    cursor: req.query.cursor,
    direction: req.query.direction,
    limit: req.query.limit,
    sortField: '_id',
    sortOrder: -1,
    populate: [
      { path: 'user', select: 'name email phone avatar walletBalance' },
      { path: 'package', select: 'name badge' },
      { path: 'approvedBy', select: 'name email' },
      { path: 'rejectedBy', select: 'name email' },
      { path: 'walletTransaction', select: 'balanceAfter createdAt' },
    ],
  });

  return success(res, result);
});

/**
 * ADMIN: Get Single Wallet Credit Purchase Detail
 */
export const adminCreditPurchase = asyncHandler(async (req, res) => {
  const purchase = await WalletCreditPurchase.findById(req.params.id)
    .populate('user', 'name email phone avatar walletBalance loyaltyPoints createdAt')
    .populate('package', 'name payAmount creditAmount bonusCredits totalCredits badge')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .populate('walletTransaction', 'amount balanceAfter note createdAt')
    .lean();

  if (!purchase) {
    throw new ApiError(404, 'Wallet credit purchase request not found.');
  }

  return success(res, { data: purchase });
});

/**
 * ADMIN: Approve Wallet Credit Purchase (Atomic Crediting & Duplicate Prevention)
 */
export const approveCreditPurchase = asyncHandler(async (req, res) => {
  // 1. Atomic status transition: pending -> approved (prevents double-approval races)
  const purchase = await WalletCreditPurchase.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    {
      $set: {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!purchase) {
    throw new ApiError(409, 'Wallet credit purchase request is not in pending status or has already been processed.');
  }

  // 2. Atomically credit user's wallet and create WalletTransaction ledger record
  const note = `Wallet credit purchase approved (${purchase.purchaseNumber || purchase._id})`;
  const rewardResult = await creditWallet(
    purchase.user,
    purchase.totalCredits,
    'wallet_credit_purchase',
    purchase._id,
    note
  );

  if (!rewardResult || !rewardResult.user) {
    // Rollback status to pending if user account is missing
    purchase.status = 'pending';
    purchase.approvedBy = null;
    purchase.approvedAt = null;
    await purchase.save();
    throw new ApiError(400, 'Failed to credit user wallet. User account may be missing or invalid.');
  }

  // 3. Link generated transaction to purchase
  purchase.walletTransaction = rewardResult.transaction?._id || null;
  await purchase.save();

  // 4. Audit Log
  await writeAudit(req, 'wallet_credit_purchase_approved', 'WalletCreditPurchase', purchase._id, {
    purchaseNumber: purchase.purchaseNumber,
    user: purchase.user,
    amount: purchase.amount,
    totalCredits: purchase.totalCredits,
    newBalance: rewardResult.user.walletBalance,
  });

  // 5. In-App Notification & Customer Email
  const user = rewardResult.user;
  await notifyUser(
    purchase.user,
    'wallet_credited',
    '💰 Wallet Credits Added!',
    `Your payment of ৳${purchase.amount} was verified. ${purchase.totalCredits} credits have been added to your wallet!`,
    '/account/wallet/credits'
  ).catch(() => {});

  sendCustomerWalletCreditApprovedEmail(purchase, user, user.walletBalance).catch(() => {});

  return success(res, {
    message: 'Wallet credit purchase approved and user wallet credited successfully.',
    data: {
      purchase,
      walletBalance: user.walletBalance,
    },
  });
});

/**
 * ADMIN: Reject Wallet Credit Purchase (With Reason & No Balance Modification)
 */
export const rejectCreditPurchase = asyncHandler(async (req, res) => {
  const reason = String(req.body.rejectionReason || req.body.reason || 'Payment verification failed').trim().slice(0, 500);

  // 1. Atomic status transition: pending -> rejected
  const purchase = await WalletCreditPurchase.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    {
      $set: {
        status: 'rejected',
        rejectedBy: req.user._id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    },
    { new: true }
  );

  if (!purchase) {
    throw new ApiError(409, 'Wallet credit purchase request is not in pending status or has already been processed.');
  }

  // 2. Audit Log
  await writeAudit(req, 'wallet_credit_purchase_rejected', 'WalletCreditPurchase', purchase._id, {
    purchaseNumber: purchase.purchaseNumber,
    user: purchase.user,
    rejectionReason: reason,
  });

  // 3. In-App Notification & Customer Email
  const user = await User.findById(purchase.user).select('name email phone walletBalance');
  if (user) {
    await notifyUser(
      purchase.user,
      'wallet_purchase_rejected',
      'Wallet Credit Request Update',
      `Your request #${purchase.purchaseNumber} could not be verified: ${reason}`,
      '/account/wallet/credits'
    ).catch(() => {});

    sendCustomerWalletCreditRejectedEmail(purchase, user).catch(() => {});
  }

  return success(res, {
    message: 'Wallet credit purchase request rejected.',
    data: purchase,
  });
});

/**
 * ADMIN: Credit Packages Management (CRUD)
 */
export const adminListPackages = asyncHandler(async (_req, res) => {
  const packages = await WalletCreditPackage.find().sort({ sortOrder: 1, payAmount: 1 }).lean();
  return success(res, { data: packages });
});

export const adminCreatePackage = asyncHandler(async (req, res) => {
  const payAmount = Number(req.body.payAmount || 0);
  const creditAmount = Number(req.body.creditAmount || 0);
  const bonusCredits = Math.max(0, Number(req.body.bonusCredits || 0));
  const totalCredits = creditAmount + bonusCredits;

  if (payAmount <= 0 || creditAmount <= 0) {
    throw new ApiError(400, 'Pay amount and credit amount must be greater than 0.');
  }

  const pkg = await WalletCreditPackage.create({
    name: String(req.body.name).trim(),
    payAmount,
    creditAmount,
    bonusCredits,
    totalCredits,
    badge: String(req.body.badge || '').trim(),
    description: String(req.body.description || '').trim(),
    isActive: req.body.isActive !== false,
    sortOrder: Number(req.body.sortOrder || 0),
  });

  await writeAudit(req, 'wallet_package_created', 'WalletCreditPackage', pkg._id, { name: pkg.name, payAmount });
  return success(res, { status: 201, message: 'Credit package created successfully', data: pkg });
});

export const adminUpdatePackage = asyncHandler(async (req, res) => {
  const existing = await WalletCreditPackage.findById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Credit package not found.');
  }

  const payAmount = req.body.payAmount !== undefined ? Number(req.body.payAmount) : existing.payAmount;
  const creditAmount = req.body.creditAmount !== undefined ? Number(req.body.creditAmount) : existing.creditAmount;
  const bonusCredits = req.body.bonusCredits !== undefined ? Math.max(0, Number(req.body.bonusCredits)) : existing.bonusCredits;
  const totalCredits = creditAmount + bonusCredits;

  existing.name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
  existing.payAmount = payAmount;
  existing.creditAmount = creditAmount;
  existing.bonusCredits = bonusCredits;
  existing.totalCredits = totalCredits;
  if (req.body.badge !== undefined) existing.badge = String(req.body.badge).trim();
  if (req.body.description !== undefined) existing.description = String(req.body.description).trim();
  if (req.body.isActive !== undefined) existing.isActive = Boolean(req.body.isActive);
  if (req.body.sortOrder !== undefined) existing.sortOrder = Number(req.body.sortOrder);

  await existing.save();
  await writeAudit(req, 'wallet_package_updated', 'WalletCreditPackage', existing._id, { name: existing.name });

  return success(res, { message: 'Credit package updated successfully', data: existing });
});

export const adminDeletePackage = asyncHandler(async (req, res) => {
  const pkg = await WalletCreditPackage.findByIdAndDelete(req.params.id);
  if (!pkg) {
    throw new ApiError(404, 'Credit package not found.');
  }

  await writeAudit(req, 'wallet_package_deleted', 'WalletCreditPackage', pkg._id, { name: pkg.name });
  return success(res, { message: 'Credit package deleted successfully' });
});

/**
 * ADMIN: User Detailed Wallet Profile & Analytics
 */
export const adminUserWalletDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId)
    .select('name username email phone avatar role isActive walletBalance loyaltyPoints referralCode referralStats createdAt')
    .lean();

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const userId = user._id;

  // Run aggregations in parallel for high speed
  const [
    purchaseStats,
    transactionsSummary,
    recentPurchases,
    recentTransactions,
  ] = await Promise.all([
    // Purchase counts and totals
    WalletCreditPurchase.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCredits: { $sum: '$totalCredits' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]),

    // Ledger breakdown
    WalletTransaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: { type: '$type', source: '$source' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Recent 10 purchases
    WalletCreditPurchase.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .lean(),

    // Recent 15 transactions
    WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
  ]);

  const pMap = new Map(purchaseStats.map((s) => [s._id, s]));
  const approvedPurchases = pMap.get('approved') || { count: 0, totalCredits: 0, totalAmount: 0 };
  const pendingPurchases = pMap.get('pending') || { count: 0, totalCredits: 0, totalAmount: 0 };
  const rejectedPurchases = pMap.get('rejected') || { count: 0, totalCredits: 0, totalAmount: 0 };

  // Calculate breakdown sums
  let totalCreditsUsed = 0;
  let adminCredits = 0;
  let adminDebits = 0;
  let refundCredits = 0;
  let referralCredits = 0;

  for (const item of transactionsSummary) {
    const { type, source } = item._id;
    const amt = item.totalAmount || 0;
    if (type === 'debit' && source === 'order') totalCreditsUsed += amt;
    else if (type === 'credit' && source === 'admin') adminCredits += amt;
    else if (type === 'debit' && source === 'admin') adminDebits += amt;
    else if (type === 'credit' && source === 'refund') refundCredits += amt;
    else if (type === 'credit' && source === 'referral') referralCredits += amt;
  }

  return success(res, {
    data: {
      user,
      metrics: {
        currentBalance: user.walletBalance || 0,
        loyaltyPoints: user.loyaltyPoints || 0,
        totalCreditsPurchased: approvedPurchases.totalCredits || 0,
        totalAmountPaidForCredits: approvedPurchases.totalAmount || 0,
        totalCreditsUsed,
        referralEarnings: user.referralStats?.earned || referralCredits,
        refundCredits,
        adminCredits,
        adminDebits,
        pendingPurchasesCount: pendingPurchases.count,
        approvedPurchasesCount: approvedPurchases.count,
        rejectedPurchasesCount: rejectedPurchases.count,
      },
      recentPurchases,
      recentTransactions,
    },
  });
});

/**
 * ADMIN: Global Wallet Transaction Ledger (with Cursor Pagination)
 */
export const adminWalletTransactions = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.userId) {
    query.user = req.query.userId;
  }

  if (req.query.type && ['credit', 'debit'].includes(req.query.type)) {
    query.type = req.query.type;
  }

  if (req.query.source) {
    query.source = req.query.source;
  }

  const result = await paginateWithCursor(WalletTransaction, {
    query,
    cursor: req.query.cursor,
    direction: req.query.direction,
    limit: req.query.limit,
    sortField: '_id',
    sortOrder: -1,
    populate: [{ path: 'user', select: 'name email phone avatar' }],
  });

  return success(res, result);
});
