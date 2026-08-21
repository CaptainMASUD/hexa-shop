import Product from '../models/Product.js';
import InventoryItem from '../models/InventoryItem.js';
import Notification from '../models/Notification.js';
const recentCutoff=()=>new Date(Date.now()-12*3600000);
const createOnce=async(type,title,message,link,metadata,key,value)=>{
  const exists=await Notification.exists({audience:'admin',type,[`metadata.${key}`]:value,createdAt:{$gte:recentCutoff()}}); if(exists)return;
  await Notification.create({audience:'admin',type,title,message,link,metadata});
};
export const ensureAdminOperationalAlerts=async()=>{
  const products=await Product.find({status:'active'}).select('name stock variants lowStockThreshold').lean();
  for(const p of products){const stock=p.variants?.some(v=>v.active)?p.variants.filter(v=>v.active).reduce((s,v)=>s+Number(v.stock||0),0):Number(p.stock||0);if(stock<=Number(p.lowStockThreshold||5))await createOnce(stock<=0?'out_of_stock':'low_stock',stock<=0?'Product out of stock':'Low stock alert',`${p.name} has ${stock} unit(s) available.`,'/admin/inventory',{productId:p._id,stock},'productId',p._id);}
  const soon=new Date(Date.now()+7*86400000);const expiring=await InventoryItem.find({status:'available',expiresAt:{$ne:null,$gte:new Date(),$lte:soon}}).populate('product','name').limit(50).lean();
  for(const item of expiring)await createOnce('inventory_expiry','Digital inventory expires soon',`${item.product?.name||'Inventory item'} expires on ${new Date(item.expiresAt).toLocaleDateString()}.`,'/admin/inventory',{inventoryItemId:item._id,productId:item.product?._id},'inventoryItemId',item._id);
};
