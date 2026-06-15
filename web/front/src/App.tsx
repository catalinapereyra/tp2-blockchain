import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useWallet } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Pending from "./pages/Pending";
import AdminDashboard from "./pages/AdminDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

function ProtectedRoute({ children, condition }: { children: React.ReactElement; condition: boolean }) {
  const { address, loading } = useWallet();
  if (loading) return <div style={{ textAlign: "center", padding: 60 }}>Cargando...</div>;
  if (!address) return <Navigate to="/" />;
  if (!condition) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { address, isAdmin, isRegistered, isApproved, role } = useWallet();

  return (
    <>
      {address && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={
          <ProtectedRoute condition={!!address && !isRegistered}>
            <Register />
          </ProtectedRoute>
        } />
        <Route path="/pending" element={
          <ProtectedRoute condition={!!address && isRegistered && !isApproved && !isAdmin}>
            <Pending />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute condition={isAdmin}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/patient" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 0}>
            <PatientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/doctor" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role !== null && role !== 0}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
