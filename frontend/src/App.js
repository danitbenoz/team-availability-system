import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import "./index.css";

// Component that protects routes - only logged in users can access

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Still checking if user is logged in
  if (loading) {
    return null;
  }

  // If user is logged in, show the page. Otherwise redirect to login
  return user ? children : <Navigate to="/login" />;
};

// Component for login page - redirects to dashboard if already logged in

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Still checking login status
  if (loading) {
    return null;
  }
  // If not logged in, show login page. If already logged in, go to dashboard
  return !user ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <Router>
      <AuthProvider> {/* Provides login state to all components */}
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Login page - only show if not logged in */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Dashboard - only show if logged in */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Default route - go to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* 404 page for any other routes */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                      404
                    </h1>
                    <p className="text-gray-600 mb-8">Page not found</p>
                    <Navigate to="/dashboard" />
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
