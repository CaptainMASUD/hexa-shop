import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import WalletCreditPurchase from '../models/WalletCreditPurchase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

const dateFilter = (req) => {
  const createdAt = {};
  if (req.query.from) createdAt.$gte = new Date(req.query.from);
  if (req.query.to) {
    const end = new Date(req.query.to);
    end.setHours(23, 59, 59, 999);
    createdAt.$lte = end;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
};

export const dashboard = asyncHandler(async (_req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [
    revenueAgg,
    todayAgg,
    monthAgg,
    orderCounts,
    customers,
    activeUsers,
    products,
    recentOrders,
    recentUsers,
    dailySalesRaw,
    categoryRaw,
    topProductsRaw,
    walletAgg,
    pendingPurchases,
  ] = await Promise.all([
    Order.aggregate([{ $match: { 'payment.status': 'verified' } }, { $group: { _id: null, value: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { 'payment.status': 'verified', createdAt: { $gte: today } } }, { $group: { _id: null, value: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { 'payment.status': 'verified', createdAt: { $gte: monthStart } } }, { $group: { _id: null, value: { $sum: '$total' } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', isActive: true }),
    Product.find({ status: { $ne: 'archived' } }).select('name stock lowStockThreshold variants thumbnail price').lean(),
    Order.find().select('orderNumber customer total status payment.status createdAt items').sort({ createdAt: -1 }).limit(8).lean(),
    User.find({ role: 'user' }).select('name email avatar createdAt walletBalance').sort({ createdAt: -1 }).limit(6).lean(),
    Order.aggregate([
      { $match: { 'payment.status': 'verified', createdAt: { $gte: fourteenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { 'payment.status': 'verified' } },
      { $unwind: '$items' },
      { $match: { 'items.itemType': { $ne: 'bundle' }, 'items.productId': { $ne: null } } },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$product.category', revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, unitsSold: { $sum: '$items.quantity' } } },
      { $lookup: { from: Category.collection.name, localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { name: '$category.name', revenue: 1, unitsSold: 1 } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    Order.aggregate([
      { $match: { 'payment.status': 'verified' } },
      { $unwind: '$items' },
      { $group: {
        _id: { itemType: { $ifNull: ['$items.itemType', 'product'] }, itemId: { $ifNull: ['$items.bundleId', '$items.productId'] } },
        name: { $first: '$items.productName' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    User.aggregate([{ $group: { _id: null, totalBalance: { $sum: '$walletBalance' }, totalPoints: { $sum: '$loyaltyPoints' } } }]),
    WalletCreditPurchase.countDocuments({ status: 'pending' }),
  ]);

  const dailyMap = new Map(dailySalesRaw.map((d) => [d._id, d]));
  const salesTrends = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const item = dailyMap.get(dateStr);
    const displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    salesTrends.push({
      date: dateStr,
      displayDate: displayLabel,
      sales: item?.sales || 0,
      orders: item?.orders || 0,
    });
  }

  const totalStock = (product) => product.variants?.length ? product.variants.reduce((sum, v) => sum + (v.active ? v.stock : 0), 0) : product.stock;
  const statusCounts = Object.fromEntries(orderCounts.map((item) => [item._id, item.count]));

  return success(res, { data: {
    totalRevenue: revenueAgg[0]?.value || 0,
    revenueToday: todayAgg[0]?.value || 0,
    revenueThisMonth: monthAgg[0]?.value || 0,
    totalOrders: Object.values(statusCounts).reduce((sum, value) => sum + value, 0),
    orderStatus: statusCounts,
    totalCustomers: customers,
    activeUsers,
    totalProducts: products.length,
    lowStockProducts: products.filter((p) => { const stock = totalStock(p); return stock > 0 && stock <= p.lowStockThreshold; }).length,
    outOfStockProducts: products.filter((p) => totalStock(p) <= 0).length,
    recentOrders,
    recentCustomers: recentUsers,
    salesTrends,
    categoryDistribution: categoryRaw,
    topProducts: topProductsRaw.map((p) => ({ name: p.name, unitsSold: p.unitsSold, revenue: p.revenue })),
    walletPulse: {
      totalCreditsInCirculation: walletAgg[0]?.totalBalance || 0,
      totalLoyaltyPoints: walletAgg[0]?.totalPoints || 0,
      pendingPurchasesCount: pendingPurchases,
    },
  } });
});

export const salesReport = asyncHandler(async (req, res) => {
  const match = { 'payment.status': 'verified', ...dateFilter(req) };
  const [summary, daily, profitAgg] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: null, totalSales: { $sum: '$total' }, orders: { $sum: 1 }, averageOrderValue: { $avg: '$total' } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'prod' } },
      { $addFields: {
        itemCost: {
          $ifNull: [
            { $cond: [{ $gt: ['$items.costPrice', 0] }, '$items.costPrice', null] },
            { $arrayElemAt: ['$prod.purchasePrice', 0] },
            0
          ]
        }
      } },
      { $group: {
        _id: null,
        totalCost: { $sum: { $multiply: ['$itemCost', '$items.quantity'] } }
      } }
    ]),
  ]);

  const totalSales = summary[0]?.totalSales || 0;
  const orders = summary[0]?.orders || 0;
  const averageOrderValue = summary[0]?.averageOrderValue || 0;
  const totalCost = profitAgg[0]?.totalCost || 0;
  const grossProfit = Math.max(0, totalSales - totalCost);
  const profitMargin = totalSales > 0 ? Number(((grossProfit / totalSales) * 100).toFixed(1)) : 0;

  return success(res, {
    data: {
      summary: {
        totalSales,
        orders,
        averageOrderValue,
        totalCost,
        grossProfit,
        profitMargin,
      },
      daily,
    }
  });
});

export const productReport = asyncHandler(async (req, res) => {
  const match = { 'payment.status': 'verified', ...dateFilter(req) };
  const data = await Order.aggregate([
    { $match: match }, { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'prod' } },
    { $addFields: {
      itemCost: {
        $ifNull: [
          { $cond: [{ $gt: ['$items.costPrice', 0] }, '$items.costPrice', null] },
          { $arrayElemAt: ['$prod.purchasePrice', 0] },
          0
        ]
      }
    } },
    { $group: {
      _id: { itemType: { $ifNull: ['$items.itemType', 'product'] }, itemId: { $ifNull: ['$items.bundleId', '$items.productId'] } },
      name: { $first: '$items.productName' },
      unitsSold: { $sum: '$items.quantity' },
      revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      totalCost: { $sum: { $multiply: ['$itemCost', '$items.quantity'] } },
    } },
    { $addFields: {
      grossProfit: { $subtract: ['$revenue', '$totalCost'] },
      profitMargin: {
        $cond: [
          { $gt: ['$revenue', 0] },
          { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$totalCost'] }, '$revenue'] }, 100] },
          0
        ]
      }
    } },
    { $project: { _id: '$_id.itemId', itemType: '$_id.itemType', name: 1, unitsSold: 1, revenue: 1, totalCost: 1, grossProfit: 1, profitMargin: { $round: ['$profitMargin', 1] } } },
    { $sort: { revenue: -1 } }, { $limit: 50 },
  ]);
  return success(res, { data });
});

export const categoryReport = asyncHandler(async (req, res) => {
  const match = { 'payment.status': 'verified', ...dateFilter(req) };
  const data = await Order.aggregate([
    { $match: match }, { $unwind: '$items' },
    { $match: { 'items.itemType': { $ne: 'bundle' }, 'items.productId': { $ne: null } } },
    { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } }, { $unwind: '$product' },
    { $group: { _id: '$product.category', revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, unitsSold: { $sum: '$items.quantity' } } },
    { $lookup: { from: Category.collection.name, localField: '_id', foreignField: '_id', as: 'category' } }, { $unwind: '$category' },
    { $project: { name: '$category.name', revenue: 1, unitsSold: 1 } }, { $sort: { revenue: -1 } },
  ]);
  return success(res, { data });
});
