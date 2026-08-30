import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";

const HomePage = lazy(() => import("./routes/index"));
const AboutPage = lazy(() => import("./routes/about"));
const CategoriesPage = lazy(() => import("./routes/categories"));
const ShopPage = lazy(() => import("./routes/shop"));
const ProductPage = lazy(() => import("./routes/product.$slug"));
const CartPage = lazy(() => import("./routes/cart"));
const CheckoutPage = lazy(() => import("./routes/checkout"));
const OrderConfirmationPage = lazy(() => import("./routes/order.$orderNumber"));
const LoginPage = lazy(() => import("./routes/login"));
const SignupPage = lazy(() => import("./routes/signup"));
const ProtectedRoute = lazy(() => import("./routes/_authenticated/route"));
const MyOrdersPage = lazy(() => import("./routes/_authenticated/my-orders"));
const AdminLayout = lazy(() => import("./routes/admin"));
const AdminDashboard = lazy(() => import("./routes/admin.index"));
const AdminProducts = lazy(() => import("./routes/admin.products"));
const AdminCategories = lazy(() => import("./routes/admin.categories"));
const AdminCustomers = lazy(() => import("./routes/admin.customers"));
const AdminOrders = lazy(() => import("./routes/AdminOrders"));
const AdminOrderDetails = lazy(() => import("./components/site/AdminOrderDetails"));
const AdminOrdersOverview = lazy(() => import("./components/site/AdminOrdersOverview"));
const PublicRoute = lazy(() => import("./routes/_public/PublicRoute"));

function LoadingPage() {
  return <div className="min-h-screen bg-background" aria-busy="true" />;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-3 font-display text-5xl text-foreground">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link to="/" className="mt-8 inline-flex rounded-sm bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground">
          Return home
        </Link>
      </div>
    </div>
  );
}

/** Centralized React Router route map. */
export default function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/order/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/my-orders" element={<MyOrdersPage />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrdersOverview />} />
          <Route path="orders/:category" element={<AdminOrders />} />
          <Route path="orders/:category/:id" element={<AdminOrderDetails />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="customers" element={<AdminCustomers />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
