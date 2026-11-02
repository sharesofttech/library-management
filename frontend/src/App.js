import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/routes/ProtectedRoute";
import PublicRoute from "./components/routes/PublicRoute";
import Register from "./components/Register";
import Login from "./components/Login";
import Home from "./components/Home";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./components/admin/AdminDashboard";
import CategoryList from "./components/admin/CategoryList";
import CategoryForm from "./components/admin/CategoryForm";
import UserList from "./components/admin/UserList";
import UserForm from "./components/admin/UserForm";
import AuthorList from "./components/admin/AuthorList";
import AuthorForm from "./components/admin/AuthorForm";
import BookList from "./components/admin/BookList";
import BookForm from "./components/admin/BookForm";
import BookCopies from "./components/admin/BookCopies";
import Borrowings from "./components/admin/Borrowings";
import FineSettings from "./components/admin/FineSettings";
import FineRecords from "./components/common/FineRecords";
import UserLayout from "./components/user/UserLayout";
import LandingPage from "./components/LandingPage";
import AccountApplications from "./components/admin/AccountApplications";
import RenterList from "./components/admin/RenterList";
import RenterListings from "./components/user/RenterListings";
import RenterListingReview from "./components/admin/RenterListingReview";
import RenterBookDetail from "./components/user/RenterBookDetail";
import MyProfile from "./components/user/MyProfile";
import RoleAccessApplication from "./components/user/RoleAccessApplication";
import RentalRequests from "./components/user/RentalRequests";
import RenterDetails from "./components/admin/RenterDetails";
import RentalCheckout from "./components/admin/RentalCheckout";



export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
       

        <Route
          path="/reset-password/:token"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* User Protected Route (Existing Dashboard UI) */}
        <Route
          path="/home"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/renter/listings"
          element={
            <ProtectedRoute allowedRoles={["user"]} requireRenter>
              <UserLayout>
                <RenterListings />
              </UserLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/renter-book/:id"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserLayout>
                <RenterBookDetail />
              </UserLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/my/rental-requests" element={<ProtectedRoute allowedRoles={["user"]}><UserLayout><RentalRequests /></UserLayout></ProtectedRoute>} />
        <Route path="/renter/requests" element={<ProtectedRoute allowedRoles={["user"]} requireRenter><UserLayout><RentalRequests inbox /></UserLayout></ProtectedRoute>} />
        <Route path="/my/profile" element={<ProtectedRoute allowedRoles={["user"]}><UserLayout><MyProfile /></UserLayout></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={["admin", "librarian"]}><AdminLayout><MyProfile /></AdminLayout></ProtectedRoute>} />
        <Route path="/apply/:requestedRole" element={<ProtectedRoute allowedRoles={["user"]}><UserLayout><RoleAccessApplication /></UserLayout></ProtectedRoute>} />

        {/* Admin Protected Routes */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout>
                <AccountApplications />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/management/renters"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout>
                <RenterList />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/admin/management/renters/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><RenterDetails /></AdminLayout></ProtectedRoute>} />
        <Route
          path="/admin/renter-listings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout>
                <RenterListingReview />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/admin/rental-checkout" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout><RentalCheckout /></AdminLayout></ProtectedRoute>} />

        {/* Category List */}
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <CategoryList />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
         <Route
          path="/admin/borrowings"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <Borrowings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
       


{/* Add Category Form */}
        <Route
          path="/admin/categories/add"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <CategoryForm />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Edit Category Form */}
        <Route
          path="/admin/categories/edit/:id"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <CategoryForm />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Quick redirect alias for /admin/category */}
        <Route
          path="/admin/category"
          element={<Navigate to="/admin/categories" replace />}
        />

        {/* â”€â”€ Management: Users â”€â”€ */}
        <Route
          path="/admin/management/users"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <UserList role="user" />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/management/users/add"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <UserForm role="user" />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/management/users/edit/:id"
          element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>
                <UserForm role="user" />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* â”€â”€ Management: Librarians â”€â”€ */}
        <Route
          path="/admin/management/librarians"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout>
                <UserList role="librarian" />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/management/librarians/add"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout>
                <UserForm role="librarian" />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/management/librarians/edit/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout>
                <UserForm role="librarian" />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        {[['/admin/settings', <FineSettings />], ['/admin/fines', <FineRecords />], ['/admin/fine-payments', <FineRecords payments />]].map(([path, page]) => <Route key={path} path={path} element={<ProtectedRoute allowedRoles={["admin", "librarian"]}><AdminLayout>{page}</AdminLayout></ProtectedRoute>} />)}
        {[["/my/fines", <FineRecords own />], ["/my/fine-payments", <FineRecords own payments />]].map(([path, page]) => <Route key={path} path={path} element={<ProtectedRoute allowedRoles={["user"]}><UserLayout>{page}</UserLayout></ProtectedRoute>} />)}
        {[
          ["/admin/books", <BookList />],
          ["/admin/books/add", <BookForm />],
          ["/admin/books/edit/:id", <BookForm />],
          ["/admin/books/:id/copies", <BookCopies />],
        ].map(([path, page]) => (
          <Route key={path} path={path} element={<ProtectedRoute allowedRoles={["admin", "librarian"]}><AdminLayout>{page}</AdminLayout></ProtectedRoute>} />
        ))}
        {["/admin/management/authors", "/admin/management/authors/add", "/admin/management/authors/edit/:id"].map((path, index) => (
          <Route key={path} path={path} element={
            <ProtectedRoute allowedRoles={["admin", "librarian"]}>
              <AdminLayout>{index === 0 ? <AuthorList /> : <AuthorForm />}</AdminLayout>
            </ProtectedRoute>
          } />
        ))}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  );
}



