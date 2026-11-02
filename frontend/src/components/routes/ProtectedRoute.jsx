import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { selectIsAuthenticated, selectUser } from "../../store/authSlice";

export default function ProtectedRoute({ children, allowedRoles, requireRenter = false }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role || "user";
    if (!allowedRoles.includes(userRole)) {
      // Redirect based on role
      if ((userRole === "admin" || userRole === "librarian")) {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/home" replace />;
    }
  }

  if (requireRenter && !user?.isRenter) {
    return <Navigate to="/home" replace state={{ message: "Approved Renter access is required." }} />;
  }

  return children;
}
