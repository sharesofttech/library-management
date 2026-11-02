import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { selectIsAuthenticated, selectUser } from "../../store/authSlice";

export default function PublicRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  if (isAuthenticated) {
    if (user?.role === "admin" || user?.role === "librarian") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}
