import Notification from '../models/Notification.js';
export const notifyUser = (user, type, title, message, link = '', metadata = {}) => Notification.create({ user, audience: 'user', type, title, message, link, metadata });
export const notifyAdmins = (type, title, message, link = '', metadata = {}) => Notification.create({ audience: 'admin', type, title, message, link, metadata });
