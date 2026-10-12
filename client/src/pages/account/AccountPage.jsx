import { useEffect,useState } from 'react'
import { Link,NavLink,Route,Routes,useNavigate,useParams } from 'react-router-dom'
import { FaBell,FaBoxOpen,FaClock,FaCoins,FaHeadset,FaKey,FaLock,FaReceipt,FaSignOutAlt,FaTicketAlt,FaUser } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useCart } from '../../contexts/CartContext'
import { getMyOrder,getMyOrders } from '../../api/order.api'
import { changePassword } from '../../api/auth.api'
import { apiErrorMessage } from '../../api/client'
import { cancelOrder,createRefund,createTicket,getActivity,getInvoice,getReferral,getRefunds,getSessions,getSubscriptions,getTickets,getWallet,getMyWalletTransactions,replyTicket,revokeSession,setAutoRenew,getAffiliatePayouts,requestAffiliatePayout } from '../../api/features.api'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import DeliveryDetailsViewer from '../../components/DeliveryDetailsViewer'
import Modal from '../../components/Modal'
import AvatarUploader from '../../components/AvatarUploader'
import AdminCursorPagination from '../../components/AdminCursorPagination'
import WalletCreditsPage from './WalletCreditsPage'

const tabs = [
  ['Overview', '/account', FaUser, true],
  ['Orders', '/account/orders', FaBoxOpen],
  ['Subscriptions', '/account/subscriptions', FaKey],
  ['Buy Credits', '/account/wallet/credits', FaCoins],
  ['Rewards & Payouts', '/account/rewards', FaReceipt],
  ['Support', '/account/support', FaHeadset],
  ['Refunds', '/account/refunds', FaReceipt],
  ['Security', '/account/security', FaLock],
  ['Activity', '/account/activity', FaClock],
]
export default function AccountPage(){const{user,logout}=useAuth();const navigate=useNavigate();return <div className="hexa-container py-12"><div className="grid gap-8 lg:grid-cols-[250px_1fr]"><aside><div className="hexa-card p-5 lg:sticky lg:top-28"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 overflow-hidden shrink-0 font-extrabold text-xl">{user?.avatar?.url ? <img src={user.avatar.url} alt={user.name} className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" loading="lazy" /> : (user?.name ? user.name.charAt(0).toUpperCase() : <FaUser size={18} />)}</div><h2 className="mt-3 font-semibold text-[var(--hexa-text)]">{user?.name}</h2><p className="mt-0.5 truncate text-xs text-[var(--hexa-muted)]">{user?.email}</p><nav className="mt-6 space-y-1">{tabs.map(([label,path,Icon,end])=><NavLink end={end} key={path} to={path} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive?'bg-[var(--hexa-accent-soft)] text-[var(--hexa-text)] ring-1 ring-inset ring-[var(--hexa-border)]':'text-[var(--hexa-muted)] hover:bg-[var(--hexa-surface)] hover:text-[var(--hexa-text)]'}`}><Icon/>{label}</NavLink>)}</nav><button onClick={async()=>{await logout();navigate('/')}} className="mt-4 flex w-full items-center gap-3 border-t border-white/10 px-3 pt-4 text-sm text-gray-500 hover:text-rose-400"><FaSignOutAlt/>Sign out</button></div></aside><main><Routes><Route index element={<Overview/>}/><Route path="orders" element={<Orders/>}/><Route path="orders/:id" element={<OrderDetail/>}/><Route path="subscriptions" element={<Subscriptions/>}/><Route path="wallet" element={<WalletCreditsPage/>}/><Route path="wallet/credits" element={<WalletCreditsPage/>}/><Route path="rewards" element={<Rewards/>}/><Route path="support" element={<Support/>}/><Route path="refunds" element={<Refunds/>}/><Route path="security" element={<Security/>}/><Route path="activity" element={<Activity/>}/></Routes></main></div></div>}
function Overview(){const{user,updateProfile}=useAuth(),{notify}=useToast(),{format}=useCurrency();const[form,setForm]=useState({name:user?.name||'',phone:user?.phone||''}),[orders,setOrders]=useState([]),[wallet,setWallet]=useState(null);useEffect(()=>{Promise.all([getMyOrders({limit:5}),getWallet()]).then(([o,w])=>{setOrders(o.data);setWallet(w)}).catch(()=>{})},[]);const save=async e=>{e.preventDefault();try{await updateProfile(form);notify('Profile updated successfully','success')}catch(err){notify(apiErrorMessage(err),'error')}};return <div><p className="hexa-section-kicker">Your HEXA</p><h1 className="mt-3 text-3xl font-bold">Account overview</h1><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Recent orders" value={orders.length}/><Stat label="Wallet" value={format(wallet?.walletBalance||0)}/><Stat label="Loyalty points" value={wallet?.loyaltyPoints||0}/><Stat label="Referral code" value={wallet?.referralCode||'—'}/></div><div className="mt-6 grid gap-6 xl:grid-cols-2"><div className="hexa-card p-6"><h2 className="font-semibold text-lg text-[var(--hexa-text)] mb-4">Profile Photo</h2><AvatarUploader size="lg" /><form onSubmit={save} className="mt-6 border-t border-[var(--hexa-border)] pt-5"><h3 className="font-semibold text-sm text-[var(--hexa-text)] mb-3">Personal Information</h3><div className="space-y-4"><Field label="Display Name"><input className="hexa-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Email Address"><input disabled className="hexa-input opacity-60 cursor-not-allowed" value={user?.email||''}/></Field><Field label="Phone Number"><input className="hexa-input" placeholder="01XXXXXXXXX" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><button className="hexa-btn !mt-2">Save Profile Changes</button></div></form></div><div className="hexa-card p-6"><h2 className="font-semibold text-lg text-[var(--hexa-text)]">Latest orders</h2><div className="mt-4 space-y-3">{orders.length?orders.map(o=><Link key={o._id} to={`/account/orders/${o._id}`} className="flex items-center justify-between rounded-xl border border-white/10 p-3 hover:border-purple-500/30"><div><p className="text-sm font-medium">{o.orderNumber}</p><p className="text-xs text-gray-500">{format(o.total)}</p></div><StatusBadge value={o.status}/></Link>):<p className="text-sm text-gray-500">No orders yet.</p>}</div></div></div></div>}
function Orders(){const[orders,setOrders]=useState([]),[loading,setLoading]=useState(true);const{format}=useCurrency();useEffect(()=>{getMyOrders({limit:50}).then(r=>setOrders(r.data)).finally(()=>setLoading(false))},[]);return <Page title="My orders" subtitle="Track verification, fulfillment, delivery, cancellation and refunds.">{loading?<Skeleton/>:orders.length?<div className="space-y-3">{orders.map(o=><Link key={o._id} to={`/account/orders/${o._id}`} className="hexa-card flex flex-col gap-3 p-5 transition hover:border-purple-500/30 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{o.orderNumber}</p><p className="mt-1 text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()} · {o.items.length} item(s)</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="font-bold">{format(o.total)}</p><p className="text-xs text-gray-500">{o.payment.methodName}</p></div><StatusBadge value={o.status}/></div></Link>)}</div>:<EmptyState title="No orders yet"/>}</Page>}
function OrderDetail(){
  const{id}=useParams(),[order,setOrder]=useState(null),[loading,setLoading]=useState(true)
  const{notify}=useToast(),{format}=useCurrency()
  const load=()=>getMyOrder(id).then(setOrder).finally(()=>setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{load()},[id])
  if(loading)return <Skeleton/>
  if(!order)return <EmptyState title="Order not found"/>

  const bundleSavings=(order.bundles||[]).reduce((sum,bundle)=>sum+Number(bundle.savings||0),0)
  const promotionDiscount=Number(order.promotion?.discount||0)
  const couponDiscount=Number(order.coupon?.discount||0)
  const deliveredIds=new Set((order.deliveries||[]).map(delivery=>String(delivery.orderItemId)))

  const cancel=async()=>{
    try{await cancelOrder(order._id);notify('Order cancelled');load()}
    catch(error){notify(apiErrorMessage(error),'error')}
  }
  const invoice=async()=>{
    try{
      const data=await getInvoice(order._id)
      const win=window.open('','_blank')
      if(!win)throw new Error('Please allow pop-ups to print your receipt')
      win.document.write(invoiceHtml(data,format))
      win.document.close()
      win.focus()
      win.print()
    }catch(error){notify(apiErrorMessage(error),'error')}
  }

  return <div>
    <Link to="/account/orders" className="text-sm text-[var(--hexa-muted)] transition hover:text-[var(--hexa-accent)]">← Back to orders</Link>
    <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row">
      <div><h1 className="text-3xl font-bold">{order.orderNumber}</h1><p className="mt-2 text-sm text-[var(--hexa-muted)]">Placed {new Date(order.createdAt).toLocaleString()}</p></div>
      <div className="flex flex-wrap items-center gap-2.5"><StatusBadge value={order.payment?.status || 'pending'}/><StatusBadge value={order.status}/></div>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="hexa-card p-6">
          <h2 className="font-semibold">Order items</h2>
          <div className="mt-4 space-y-4">
            {order.items.map(item=><div key={item._id} className="border-b border-[var(--hexa-border)] pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.productName}</p>
                    {item.itemType==='bundle'&&<span className="rounded-full bg-[var(--hexa-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--hexa-accent)]">Bundle</span>}
                    {deliveredIds.has(String(item._id))&&<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">Delivered</span>}
                  </div>
                  <p className="mt-1 text-xs text-[var(--hexa-muted)]">{item.itemType==='bundle'?'Bundle package':item.variantName||item.productType} × {item.quantity}</p>
                  {item.customerInputs && Object.keys(item.customerInputs).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(item.customerInputs).filter(([, v]) => v).map(([k, v]) => (
                        <span key={k} className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-400">
                          <span className="capitalize text-[var(--hexa-muted)]">{k.replace(/([A-Z])/g, ' $1')}:</span> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="shrink-0 font-semibold">{format(item.price*item.quantity)}</p>
              </div>
              {item.itemType==='bundle'&&item.components?.length>0&&<div className="mt-3 rounded-xl bg-[var(--hexa-surface)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--hexa-muted)]">Included in this bundle</p>
                <div className="mt-2 grid gap-1.5 text-xs text-[var(--hexa-muted)] sm:grid-cols-2">
                  {item.components.map((component,index)=><span key={`${component.productId}-${component.variantId||'base'}-${index}`}>
                    {component.productName}{component.variantName?` · ${component.variantName}`:''} × {Number(component.quantityPerBundle||1)*Number(item.quantity||1)}
                  </span>)}
                </div>
              </div>}
            </div>)}
          </div>
          <div className="mt-4 space-y-2 border-t border-[var(--hexa-border)] pt-4 text-sm">
            <Row label="Subtotal" value={format(order.subtotal)}/>
            {bundleSavings>0&&<Row label="Bundle savings included" value={format(bundleSavings)}/>} 
            {promotionDiscount>0&&<Row label="Campaign discount" value={`-${format(promotionDiscount)}`}/>} 
            {couponDiscount>0&&<Row label={`Coupon ${order.coupon.code}`} value={`-${format(couponDiscount)}`}/>} 
            {order.walletApplied>0&&<Row label="Wallet" value={`-${format(order.walletApplied)}`}/>} 
            {order.loyaltyPointsRedeemed>0&&<Row label="Loyalty points" value={`${order.loyaltyPointsRedeemed} points`}/>} 
            <div className="flex justify-between border-t border-[var(--hexa-border)] pt-3 text-xl font-black"><span>Total</span><span>{format(order.total)}</span></div>
          </div>
        </section>

        <section className="hexa-card p-6">
          <h2 className="flex items-center gap-2 font-bold text-lg text-[var(--hexa-text)]">
            <FaKey className="text-purple-400" /> Digital Delivery Credentials
          </h2>
          {order.deliveries?.length ? (
            <div className="mt-4 space-y-4">
              {order.deliveries.map((delivery) => (
                <div
                  key={delivery._id}
                  className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.03] p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-[var(--hexa-border)]/60 pb-2.5">
                    <p className="font-bold text-sm text-[var(--hexa-text)]">
                      {delivery.summary || 'Unlocked Digital License / Credentials'}
                    </p>
                    <span className="text-[11px] text-[var(--hexa-muted)]">
                      {new Date(delivery.deliveredAt || order.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <DeliveryDetailsViewer details={delivery.details} summary={delivery.summary} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--hexa-muted)]">
              Your digital credentials, activation keys, or access details will appear right here as soon as payment is verified and fulfilled.
            </p>
          )}
        </section>

        <section className="hexa-card p-6">
          <h2 className="font-semibold">Order timeline</h2>
          <div className="mt-4 space-y-4">{order.timeline?.map(t=><div key={t._id} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--hexa-accent)]"/><div><p className="text-sm font-medium">{t.event}</p><p className="text-xs text-[var(--hexa-muted)]">{new Date(t.createdAt).toLocaleString()} {t.note?`· ${t.note}`:''}</p></div></div>)}</div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="hexa-card p-6">
          <h2 className="font-semibold text-lg text-[var(--hexa-text)]">Payment information</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Method" value={order.payment.methodName} />
            {order.payment.paymentAccountNumber && (
              <Row
                label="Recipient account"
                value={
                  <span className="font-mono text-purple-400 font-semibold">
                    {order.payment.paymentAccountNumber}
                    {order.payment.accountType ? ` (${order.payment.accountType})` : ''}
                  </span>
                }
              />
            )}
            {order.payment.accountName && (
              <Row label="Account holder" value={order.payment.accountName} />
            )}
            {order.payment.branchName && (
              <Row label="Branch / Network" value={order.payment.branchName} />
            )}
            {order.payment.chargeNote && (
              <Row label="Fee note" value={order.payment.chargeNote} />
            )}
            <Row
              label="Sender number"
              value={
                <span className="font-mono text-purple-300 font-medium">
                  {order.payment.senderNumber || '—'}
                </span>
              }
            />
            <Row
              label="Transaction ID"
              value={
                <span className="font-mono font-bold text-[var(--hexa-text)]">
                  {order.payment.transactionId || '—'}
                </span>
              }
            />
            <Row
              label="Payment status"
              value={<StatusBadge value={order.payment.status} />}
            />
          </div>
          {['pending', 'payment_verification'].includes(order.status) && order.payment.instructions && (
            <div className="mt-4 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-3 text-xs leading-5 text-[var(--hexa-muted)] whitespace-pre-line">
              <p className="font-semibold text-[var(--hexa-text)] mb-1">Instructions:</p>
              {order.payment.instructions}
            </div>
          )}
        </section>
        <button onClick={invoice} className="hexa-btn-secondary w-full"><FaReceipt/>Print invoice / receipt</button>
        {['pending','payment_verification'].includes(order.status)&&<button onClick={cancel} className="w-full rounded-xl border border-rose-500/20 p-3 text-sm font-semibold text-rose-500 transition hover:bg-rose-500/5">Cancel order</button>}
        {['confirmed','processing','delivered'].includes(order.status)&&<Link to={`/account/refunds?order=${order._id}`} className="hexa-btn-secondary w-full">Request refund</Link>}
      </aside>
    </div>
  </div>
}
function Subscriptions(){
  const[items,setItems]=useState([]),[loading,setLoading]=useState(true);
  const{notify}=useToast();
  const{addItem}=useCart();
  const navigate=useNavigate();

  const load=()=>getSubscriptions().then(setItems).finally(()=>setLoading(false));
  useEffect(()=>{load()},[]);

  const toggle=async s=>{
    try{
      await setAutoRenew(s._id,!s.autoRenew);
      notify('Renewal preference updated');
      load();
    }catch(err){
      notify(apiErrorMessage(err),'error');
    }
  };

  const handleQuickRenew=(s)=>{
    if(!s.product){
      notify('Product information not available','error');
      return;
    }
    const variantObj = s.variantId ? { _id: s.variantId, name: s.planName } : null;
    addItem(s.product, variantObj, 1);
    notify(`Renewing ${s.productName}. Taking you to checkout...`);
    navigate('/checkout');
  };

  return <Page title="My Subscriptions" subtitle="View active subscriptions, access delivery credentials, track expiry dates, and manage renewal preferences.">
    {loading?<Skeleton/>:items.length?<div className="space-y-6">
      {items.map(s=><div key={s._id} className="hexa-card border border-[var(--hexa-border)] p-6 shadow-sm transition hover:border-purple-500/30">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--hexa-border)]/60 pb-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
              <FaKey className="text-xl"/>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--hexa-text)]">{s.productName}</h3>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400">{s.planName||'Standard Plan'}</span>
              </div>
              {s.orderNumber&&<p className="mt-1 text-xs text-[var(--hexa-muted)]">Order: <Link to={`/account/orders/${s.order}`} className="font-mono text-purple-400 hover:underline">{s.orderNumber}</Link></p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={()=>handleQuickRenew(s)}
              className="hexa-btn !py-1.5 !px-3.5 text-xs font-bold shadow-sm"
            >
              ⚡ 1-Click Renew
            </button>
            <StatusBadge value={s.status}/>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">Access Credentials / Delivery Details</h4>
          {s.delivery?<div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.03] p-4">
            <DeliveryDetailsViewer details={s.delivery.details} summary={s.delivery.summary}/>
          </div>:<div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/50 p-4 text-xs text-[var(--hexa-muted)]">
            Credentials are being processed. They will appear here immediately once fulfilled.
          </div>}
        </div>

        <div className="mt-5 flex flex-col justify-between gap-4 border-t border-[var(--hexa-border)]/60 pt-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="rounded-xl bg-[var(--hexa-surface)] px-3 py-2">
              <span className="text-[var(--hexa-muted)]">Expires: </span>
              <span className="font-bold text-[var(--hexa-text)]">{s.expiresAt?new Date(s.expiresAt).toLocaleDateString():'No fixed expiry'}</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 font-medium text-[var(--hexa-text)]">
              <input type="checkbox" className="accent-purple-600 rounded" checked={Boolean(s.autoRenew)} onChange={()=>toggle(s)}/>
              <span>Auto-renew reminder</span>
            </label>
          </div>
          {s.product?.slug&&<Link to={`/product/${s.product.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:underline">View Product Page →</Link>}
        </div>
      </div>)}
    </div>:<EmptyState title="No active subscriptions" subtitle="Purchased subscriptions and unlocked credentials will appear here."/>}
  </Page>;
}

function Rewards(){
  const[wallet,setWallet]=useState(null);
  const[ref,setRef]=useState(null);
  const[payouts,setPayouts]=useState([]);
  const[showModal,setShowModal]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[form,setForm]=useState({ amount: '', paymentMethod: 'bkash', accountNumber: '', accountType: 'personal' });

  // Wallet Transactions Cursor Pagination State
  const[transactions,setTransactions]=useState([]);
  const[txMeta,setTxMeta]=useState({});
  const[txLimit,setTxLimit]=useState(15);
  const[txLoading,setTxLoading]=useState(false);

  const{format}=useCurrency();
  const{notify}=useToast();

  const load=()=>Promise.all([getWallet(),getReferral(),getAffiliatePayouts().catch(()=>[])])
    .then(([w,r,p])=>{setWallet(w);setRef(r);setPayouts(p);})
    .catch(()=>{});

  const loadTransactions=async(cursor=null,direction='next',limit=txLimit)=>{
    setTxLoading(true);
    try{
      const res=await getMyWalletTransactions({cursor,direction,limit});
      setTransactions(res?.data||[]);
      setTxMeta(res?.meta||{});
    }catch(err){
      console.error(err);
    }finally{
      setTxLoading(false);
    }
  };

  useEffect(()=>{
    load();
    loadTransactions(null,'next',txLimit);
  },[]);

  const handleTxNext=(nextCursor)=>{
    loadTransactions(nextCursor,'next',txLimit);
  };

  const handleTxPrev=(prevCursor)=>{
    loadTransactions(prevCursor,'prev',txLimit);
  };

  const handleTxLimitChange=(newLimit)=>{
    setTxLimit(newLimit);
    loadTransactions(null,'next',newLimit);
  };

  const handleRequestPayout=async(e)=>{
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      notify('Please enter a valid payout amount', 'error');
      return;
    }
    if (amount > (wallet?.walletBalance || 0)) {
      notify('Requested amount exceeds your available wallet balance', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await requestAffiliatePayout(form);
      notify('Affiliate payout request submitted successfully! Admin will process your transfer.');
      setShowModal(false);
      setForm({ amount: '', paymentMethod: 'bkash', accountNumber: '', accountType: 'personal' });
      load();
      loadTransactions(null,'next',txLimit);
    } catch (err) {
      notify(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return <Page title="Wallet, loyalty & affiliate payouts" subtitle="Manage your affiliate referral earnings, wallet credit, and submit withdrawal requests.">
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="hexa-card p-5 relative overflow-hidden">
        <p className="text-xs uppercase tracking-wider text-[var(--hexa-muted)]">Available Wallet Balance</p>
        <p className="mt-2 text-2xl font-black text-[var(--hexa-text)]">{format(wallet?.walletBalance||0)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            to="/account/wallet/credits"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            + Buy Credits
          </Link>
          <button
            type="button"
            onClick={()=>setShowModal(true)}
            disabled={!wallet?.walletBalance || wallet.walletBalance <= 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-purple-700 disabled:opacity-40"
          >
            Withdraw / Payout →
          </button>
        </div>
      </div>
      <Stat label="Loyalty points" value={wallet?.loyaltyPoints||0}/>
      <Stat label="Referral earnings" value={format(ref?.referralStats?.earned||0)}/>
    </div>

    {/* Referral link & stats */}
    <div className="mt-6 hexa-card p-6">
      <h2 className="font-semibold text-lg text-[var(--hexa-text)]">Your Affiliate Referral Code</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code className="rounded-xl bg-purple-500/10 px-4 py-3 font-bold text-purple-400 text-base">{ref?.referralCode||wallet?.referralCode||'—'}</code>
        <button
          onClick={()=>{
            navigator.clipboard?.writeText(ref?.referralCode||'');
            notify('Referral code copied to clipboard!');
          }}
          className="hexa-btn-secondary !py-2.5 text-xs font-semibold"
        >
          Copy code
        </button>
        <button
          onClick={()=>{
            const link = `${window.location.origin}/register?ref=${ref?.referralCode || ''}`;
            navigator.clipboard?.writeText(link);
            notify('Affiliate link copied to clipboard!');
          }}
          className="hexa-btn !py-2.5 text-xs font-semibold"
        >
          Copy share link
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--hexa-muted)]">
        Share your unique referral link with friends. Whenever someone signs up and places an order with your code, you will earn commission rewards credited to your wallet balance.
      </p>
    </div>

    {/* Affiliate Payouts History */}
    <div className="mt-6 hexa-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg text-[var(--hexa-text)]">Affiliate Payout Requests</h2>
        <button
          type="button"
          onClick={()=>setShowModal(true)}
          className="text-xs font-bold text-purple-400 hover:underline"
        >
          + New withdrawal
        </button>
      </div>

      <div className="mt-4 divide-y divide-white/5">
        {payouts.length ? payouts.map(p => (
          <div key={p._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--hexa-text)]">{format(p.amount)}</span>
                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-400 uppercase">
                  {p.paymentMethod} ({p.accountNumber}) · {p.accountType}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--hexa-muted)]">
                Requested on {new Date(p.createdAt).toLocaleString()}
                {p.transactionReference && ` · Ref: ${p.transactionReference}`}
              </p>
              {p.adminNote && (
                <p className="mt-1 text-xs text-amber-400">Note: {p.adminNote}</p>
              )}
            </div>
            <StatusBadge value={p.status}/>
          </div>
        )) : (
          <p className="text-sm text-[var(--hexa-muted)] py-2">No affiliate payout requests yet.</p>
        )}
      </div>
    </div>

    {/* Wallet history with Cursor Pagination */}
    <div className="mt-6 hexa-card overflow-hidden">
      <div className="p-6 pb-3">
        <h2 className="font-semibold text-lg text-[var(--hexa-text)]">Wallet Transaction History</h2>
        <p className="text-xs text-[var(--hexa-muted)] mt-0.5">Audit log of all your credit purchases, checkouts, referral rewards, and adjustments.</p>
      </div>
      <div className="divide-y divide-white/5 px-6">
        {txLoading && transactions.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--hexa-muted)]">Loading wallet transactions...</p>
        ) : transactions.length ? transactions.map(t=><div key={t._id} className="flex items-center justify-between py-3.5 text-sm">
          <div>
            <p className="font-medium text-[var(--hexa-text)]">{t.note||t.source}</p>
            <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
              {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {t.balanceAfter !== undefined && ` · Balance after: ${format(t.balanceAfter)}`}
            </p>
          </div>
          <span className={t.type==='credit'?'text-emerald-400 font-bold text-base':'text-rose-400 font-bold text-base'}>{t.type==='credit'?'+':'-'}{format(t.amount)}</span>
        </div>) : (
          <p className="py-6 text-center text-xs text-[var(--hexa-muted)]">No wallet transactions recorded yet.</p>
        )}
      </div>
      <AdminCursorPagination
        meta={txMeta}
        onNext={handleTxNext}
        onPrev={handleTxPrev}
        limit={txLimit}
        onLimitChange={handleTxLimitChange}
        loading={txLoading}
        pageSizeOptions={[10, 15, 30, 50]}
      />
    </div>

    {/* Payout Request Modal */}
    <Modal
      open={showModal}
      onClose={()=>setShowModal(false)}
      title="Request Affiliate Payout"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleRequestPayout} className="space-y-4">
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3 text-xs">
          <span className="text-[var(--hexa-muted)]">Available Wallet Balance: </span>
          <span className="font-bold text-purple-400">{format(wallet?.walletBalance||0)}</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Withdrawal Amount (BDT)</label>
          <input
            type="number"
            min="50"
            max={wallet?.walletBalance || 0}
            required
            value={form.amount}
            onChange={e=>setForm({...form, amount: e.target.value})}
            placeholder="e.g. 500"
            className="hexa-input text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Payment Method</label>
            <select
              value={form.paymentMethod}
              onChange={e=>setForm({...form, paymentMethod: e.target.value})}
              className="hexa-input text-xs"
            >
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Account Type</label>
            <select
              value={form.accountType}
              onChange={e=>setForm({...form, accountType: e.target.value})}
              className="hexa-input text-xs"
            >
              <option value="personal">Personal</option>
              <option value="agent">Agent</option>
              <option value="merchant">Merchant</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">
            {form.paymentMethod === 'bank' ? 'Bank Name, Branch & Account No.' : 'Mobile Account / Wallet Number'}
          </label>
          <input
            required
            value={form.accountNumber}
            onChange={e=>setForm({...form, accountNumber: e.target.value})}
            placeholder={form.paymentMethod === 'bank' ? 'e.g. City Bank, Dhanmondi Branch, A/C: 123456789' : 'e.g. 01700000000'}
            className="hexa-input text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="hexa-btn !w-full !mt-2 flex items-center justify-center gap-2 text-xs font-bold"
        >
          {submitting ? 'Submitting request...' : 'Confirm & Request Payout'}
        </button>
      </form>
    </Modal>
  </Page>;
}
function Support(){const[tickets,setTickets]=useState([]),[form,setForm]=useState({subject:'',category:'order',priority:'normal',message:''});const{notify}=useToast();const load=()=>getTickets().then(setTickets);useEffect(()=>{load().catch(()=>{})},[]);const submit=async e=>{e.preventDefault();try{await createTicket(form);setForm({subject:'',category:'order',priority:'normal',message:''});notify('Support ticket created. Our AI support assistant will review it shortly!');load()}catch(err){notify(apiErrorMessage(err),'error')}};const reply=async t=>{const message=window.prompt(`Reply to ${t.ticketNumber}`);if(!message?.trim())return;try{await replyTicket(t._id,message.trim());notify('Reply added');load()}catch(err){notify(apiErrorMessage(err),'error')}};return <Page title="Support center" subtitle="Order, product, payment and account help stays inside HEXA with 24/7 AI Assistance."><div className="grid gap-6 xl:grid-cols-[360px_1fr]"><form onSubmit={submit} className="hexa-card p-5"><div className="flex items-center gap-2 mb-3"><span className="text-xl">🤖</span><div><h2 className="font-semibold text-sm">24/7 AI & Admin Support</h2><p className="text-[11px] text-[var(--hexa-muted)]">Autonomous AI answers queries, and escalates to admins when necessary.</p></div></div><Field label="Subject"><input required className="hexa-input" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></Field><div className="mt-4 grid grid-cols-2 gap-3"><Field label="Category"><select className="hexa-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['order','payment','product','account','refund','other'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Priority"><select className="hexa-input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{['low','normal','high','urgent'].map(x=><option key={x}>{x}</option>)}</select></Field></div><Field label="Message"><textarea required rows="5" className="hexa-input" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></Field><button className="hexa-btn mt-4 w-full"><FaTicketAlt/>Create ticket</button></form><div className="space-y-3">{tickets.length?tickets.map(t=><div key={t._id} className="hexa-card p-5"><div className="flex justify-between items-start gap-3"><div><div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-base">{t.subject}</p>{t.aiReport?.needsAdminAction&&<span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">Admin Review Escalated</span>}</div><p className="mt-1 text-xs text-gray-500">{t.ticketNumber} · {t.category} · Priority: {t.priority}</p></div><StatusBadge value={t.status}/></div><div className="mt-4 space-y-2.5">{(t.messages||[]).slice(-5).map((m,i)=>{const isAi=Boolean(m.isAi);return <div key={m._id||i} className={`rounded-xl p-3 text-sm transition ${isAi?'bg-cyan-950/25 border border-cyan-500/30':m.isAdmin?'bg-purple-500/10 border border-purple-500/20':'bg-white/[.03] border border-white/5'}`}><div className="flex items-center justify-between text-xs font-semibold mb-1"><span className={isAi?'text-cyan-300 flex items-center gap-1.5':m.isAdmin?'text-purple-400':'text-gray-300'}>{isAi?'🤖 HEXA AI Support Assistant':(m.isAdmin?'🛡️ HEXA Staff Support':'You')}</span>{m.createdAt&&<span className="text-[10px] text-gray-500">{new Date(m.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}</div><p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{m.message}</p></div>})}</div>{!['resolved','closed'].includes(t.status)&&<div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5"><span className="text-[11px] text-gray-400">{t.aiReport?.needsAdminAction?'Admin team notified with AI action report.':'Replied by HEXA AI Support. Send another message anytime.'}</span><button onClick={()=>reply(t)} className="hexa-btn-secondary !py-1.5 !px-3 text-xs font-bold">Reply</button></div>}</div>):<EmptyState title="No support tickets"/>}</div></div></Page>}function Refunds(){const[rows,setRows]=useState([]),[orders,setOrders]=useState([]),[form,setForm]=useState({orderId:'',reason:'',amount:''});const{notify}=useToast(),{format}=useCurrency();const load=()=>Promise.all([getRefunds(),getMyOrders({limit:50})]).then(([r,o])=>{setRows(r);setOrders(o.data.filter(x=>['confirmed','processing','delivered'].includes(x.status))) });useEffect(()=>{load().catch(()=>{})},[]);const submit=async e=>{e.preventDefault();try{await createRefund(form);setForm({orderId:'',reason:'',amount:''});notify('Refund request submitted');load()}catch(err){notify(apiErrorMessage(err),'error')}};return <Page title="Refund requests" subtitle="Submit eligible orders for administrator review."><form onSubmit={submit} className="hexa-card p-5"><div className="grid gap-4 md:grid-cols-3"><Field label="Order"><select required className="hexa-input" value={form.orderId} onChange={e=>setForm({...form,orderId:e.target.value})}><option value="">Select order</option>{orders.map(o=><option key={o._id} value={o._id}>{o.orderNumber} · {format(o.total)}</option>)}</select></Field><Field label="Requested amount"><input type="number" min="0" className="hexa-input" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></Field><Field label="Reason"><input required className="hexa-input" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></Field></div><button className="hexa-btn mt-4">Submit refund request</button></form><div className="mt-6 space-y-3">{rows.map(r=><div key={r._id} className="hexa-card flex flex-col justify-between gap-3 p-5 sm:flex-row"><div><p className="font-semibold">{r.order?.orderNumber||'Order'}</p><p className="mt-1 text-sm text-gray-500">{r.reason}</p></div><div className="flex items-center gap-3"><span className="font-bold">{format(r.requestedAmount)}</span><StatusBadge value={r.status}/></div></div>)}</div></Page>}
function Security(){const{notify}=useToast();const[form,setForm]=useState({currentPassword:'',newPassword:''}),[sessions,setSessions]=useState([]);const load=()=>getSessions().then(setSessions).catch(()=>{});useEffect(()=>{load()},[]);const password=async e=>{e.preventDefault();try{await changePassword(form);notify('Password changed successfully');setForm({currentPassword:'',newPassword:''})}catch(err){notify(apiErrorMessage(err),'error')}};return <Page title="Security" subtitle="Password controls and active device sessions."><div className="grid gap-6 xl:grid-cols-2"><form onSubmit={password} className="hexa-card p-6"><h2 className="font-semibold text-lg">Change password</h2><div className="mt-5 space-y-4"><Field label="Current password"><input required type="password" className="hexa-input" value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})}/></Field><Field label="New password"><input required type="password" className="hexa-input" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})}/></Field><button className="hexa-btn">Change password</button></div></form><div className="hexa-card p-6"><h2 className="font-semibold text-lg">Account Protection</h2><p className="mt-2 text-sm text-[var(--hexa-muted)] leading-6">Your account is secured with encrypted passwords and isolated device sessions. You can review and revoke active logins on other devices below.</p></div></div><div className="mt-6 hexa-card p-6"><h2 className="font-semibold text-lg">Active sessions</h2><div className="mt-4 divide-y divide-white/5">{sessions.map(s=><div key={s._id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row"><div><p className="text-sm font-medium">{s.userAgent||'Unknown device'}</p><p className="mt-1 text-xs text-[var(--hexa-muted)]">{s.ipAddress||'Unknown IP'} · expires {new Date(s.expiresAt).toLocaleString()}</p></div><button onClick={async()=>{await revokeSession(s._id);notify('Session revoked');load()}} className="text-sm text-rose-400 font-semibold hover:underline">Revoke</button></div>)}</div></div></Page>}
function Activity(){const[rows,setRows]=useState([]);useEffect(()=>{getActivity().then(setRows).catch(()=>{})},[]);return <Page title="Activity history" subtitle="Recent account and shopping activity."><div className="hexa-card divide-y divide-white/5 p-2">{rows.length?rows.map(a=><div key={a._id} className="flex items-center gap-4 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400"><FaBell/></span><div><p className="text-sm font-medium">{String(a.type).replaceAll('_',' ')}</p><p className="mt-1 text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</p></div></div>):<p className="p-6 text-sm text-gray-500">No activity recorded yet.</p>}</div></Page>}
function Page({title,subtitle,children}){return <div><h1 className="text-3xl font-bold">{title}</h1>{subtitle&&<p className="mt-2 text-sm text-gray-500">{subtitle}</p>}<div className="mt-6">{children}</div></div>}
function Stat({label,value}){return <div className="hexa-card p-5"><p className="text-xs uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>}
function Field({label,children}){return <label className="mt-4 block"><span className="hexa-label">{label}</span>{children}</label>}
function Row({label,value}){return <div className="flex justify-between gap-3"><span className="text-gray-500">{label}</span><span className="break-all text-right">{value}</span></div>}
function Skeleton(){return <div className="hexa-card h-48 animate-pulse"/>}
function invoiceHtml(data,format){
  const o=data.order
  const bundleSavings=(o.bundles||[]).reduce((sum,bundle)=>sum+Number(bundle.savings||0),0)
  const promotionDiscount=Number(o.promotion?.discount||0)
  const couponDiscount=Number(o.coupon?.discount||0)
  const discountRows=[
    bundleSavings>0?`<div class="row muted"><span>Bundle savings included</span><span>${format(bundleSavings)}</span></div>`:'',
    promotionDiscount>0?`<div class="row"><span>Campaign discount</span><span>-${format(promotionDiscount)}</span></div>`:'',
    couponDiscount>0?`<div class="row"><span>Coupon ${o.coupon?.code||''}</span><span>-${format(couponDiscount)}</span></div>`:'',
    Number(o.walletApplied||0)>0?`<div class="row"><span>Wallet</span><span>-${format(o.walletApplied)}</span></div>`:'',
  ].join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${data.invoiceNumber}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:40px;max-width:850px;margin:auto}h1{margin:0}.muted{color:#666}.row{display:flex;justify-content:space-between;gap:24px;padding:8px 0;border-bottom:1px solid #eee}.total{font-size:22px;font-weight:bold;margin-top:18px}.badge{display:inline-block;padding:6px 10px;background:#f1e8ff;border-radius:999px;color:#6b21a8}.kind{font-size:10px;text-transform:uppercase;letter-spacing:.08em;background:#f1e8ff;color:#6b21a8;padding:3px 7px;border-radius:999px;margin-right:6px}.components{font-size:11px;color:#666;margin:4px 0 0}</style></head><body><span class="badge">HEXA RECEIPT</span><h1 style="margin-top:16px">${data.store.name}</h1><p class="muted">${data.invoiceNumber} · ${new Date(data.issuedAt).toLocaleString()}</p><p><strong>Customer:</strong> ${o.customer.name}<br>${o.customer.email}<br>${o.customer.phone}</p><h3>Order ${o.orderNumber}</h3>${o.items.map(i=>`<div class="row"><span>${i.itemType==='bundle'?'<span class="kind">Bundle</span>':''}${i.productName} ${i.variantName?`(${i.variantName})`:''} × ${i.quantity}${i.itemType==='bundle'&&i.components?.length?`<div class="components">${i.components.map(c=>`${c.productName}${c.variantName?` (${c.variantName})`:''} × ${Number(c.quantityPerBundle||1)*Number(i.quantity||1)}`).join(' · ')}</div>`:''}</span><span>${format(i.price*i.quantity)}</span></div>`).join('')}<div class="row"><span>Subtotal</span><span>${format(o.subtotal)}</span></div>${discountRows}<div class="row total"><span>Total</span><span>${format(o.total)}</span></div><p class="muted">Payment: ${o.payment.methodName} · ${o.payment.status}</p></body></html>`
}

