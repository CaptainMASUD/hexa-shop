import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { getSettings } from './settingsService.js';
import { notifyUser } from './notificationService.js';

export const creditWallet = async (userId, amount, source, reference = null, note = '') => {
  const value = Math.max(0, Number(amount || 0)); if (!value) return null;
  const user = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: value } }, { new: true });
  if (!user) return null;
  await WalletTransaction.create({ user: userId, type: 'credit', amount: value, source, reference, note, balanceAfter: user.walletBalance });
  return user;
};

export const debitWallet = async (userId, amount, source, reference = null, note = '') => {
  const value = Math.max(0, Number(amount || 0)); if (!value) return null;
  const user = await User.findOneAndUpdate({ _id: userId, walletBalance: { $gte: value } }, { $inc: { walletBalance: -value } }, { new: true });
  if (!user) return null;
  await WalletTransaction.create({ user: userId, type: 'debit', amount: value, source, reference, note, balanceAfter: user.walletBalance });
  return user;
};

export const awardDeliveredOrder = async (order) => {
  const settings = await getSettings();
  const points = Math.floor((order.total / 100) * Number(settings.loyalty?.pointsPer100BDT || 0));
  if (points > 0 && !order.loyaltyPointsEarned) {
    await User.updateOne({ _id: order.user }, { $inc: { loyaltyPoints: points } });
    order.loyaltyPointsEarned = points;
    await notifyUser(order.user, 'reward', 'Loyalty points earned', `You earned ${points} HEXA points from ${order.orderNumber}.`, `/account/orders/${order._id}`);
  }
  if (!order.referralRewarded) {
    const buyer = await User.findById(order.user).select('referredBy');
    if (buyer?.referredBy) {
      const reward = Number(settings.loyalty?.referralRewardBDT || 0);
      if (reward > 0) {
        await creditWallet(buyer.referredBy, reward, 'referral', order._id, `Referral reward from ${order.orderNumber}`);
        await User.updateOne({ _id: buyer.referredBy }, { $inc: { 'referralStats.rewardedOrders': 1, 'referralStats.earned': reward } });
        await notifyUser(buyer.referredBy, 'referral', 'Referral reward added', `৳${reward} store credit was added to your wallet.`, '/account/rewards');
      }
    }
    order.referralRewarded = true;
  }
};
