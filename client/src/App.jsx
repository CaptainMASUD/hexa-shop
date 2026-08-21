import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import StoreLayout from './layouts/StoreLayout'
import AdminLayout from './layouts/AdminLayout'
import PageLoader from './components/PageLoader'
import { AdminRoute, GuestRoute, ProtectedRoute } from './routes/Guards'

const HomePage = lazy(() => import('./pages/public/HomePage'))
const ProductsPage = lazy(() => import('./pages/public/ProductsPage'))
const ProductDetailsPage = lazy(() => import('./pages/public/ProductDetailsPage'))
const CartPage = lazy(() => import('./pages/public/CartPage'))
const OffersPage = lazy(() => import('./pages/public/OffersPage'))
const BundleDetailsPage = lazy(() => import('./pages/public/BundleDetailsPage'))
const WishlistPage = lazy(() => import('./pages/public/WishlistPage'))
const CheckoutPage = lazy(() => import('./pages/public/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('./pages/public/OrderSuccessPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const AdminLoginPage = lazy(() => import('./pages/auth/AdminLoginPage'))
const AdminRegisterPage = lazy(() => import('./pages/auth/AdminRegisterPage'))
const AccountPage = lazy(() => import('./pages/account/AccountPage'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'))
const AdminPaymentMethods = lazy(() => import('./pages/admin/AdminPaymentMethods'))
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'))
const AdminGrowthFeatures = lazy(() => import('./pages/admin/AdminGrowthFeatures'))
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'))

export default function App() {
  return <Suspense fallback={<PageLoader />}><Routes>
    <Route element={<StoreLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/category/:slug" element={<ProductsPage />} />
      <Route path="/product/:slug" element={<ProductDetailsPage />} />
      <Route path="/streaming" element={<Navigate to="/category/streaming" replace />} />
      <Route path="/gaming" element={<Navigate to="/category/gaming" replace />} />
      <Route path="/tools" element={<Navigate to="/category/tools" replace />} />
      <Route path="/software" element={<Navigate to="/category/software" replace />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/offers" element={<OffersPage />} />
      <Route path="/bundle/:slug" element={<BundleDetailsPage />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:id" element={<OrderSuccessPage />} />
        <Route path="/account/*" element={<AccountPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>

    <Route element={<GuestRoute />}>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/register" element={<AdminRegisterPage />} />
    </Route>
    <Route element={<AdminRoute />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payment-methods" element={<AdminPaymentMethods />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="growth" element={<AdminGrowthFeatures />} />
      </Route>
    </Route>
  </Routes></Suspense>
}
