import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useWallet } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Pending from "./pages/Pending";
import AdminDashboard from "./pages/AdminDashboard";
import PatientDashboard from "./pages/patient/PatientDashboard";
import MisEstudiosPage from "./pages/patient/MisEstudiosPage";
import SubirEstudioPage from "./pages/patient/SubirEstudioPage";
import SolicitarRecetaPage from "./pages/patient/SolicitarRecetaPage";
import MisMedicosPage from "./pages/patient/MisMedicosPage";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import RecetasPage from "./pages/doctor/RecetasPage";
import PacientesPage from "./pages/doctor/PacientesPage";
import PacienteDetailPage from "./pages/doctor/PacienteDetailPage";
import LaboratoryDashboard from "./pages/LaboratoryDashboard";

function ProtectedRoute({ children, condition }: { children: React.ReactElement; condition: boolean }) {
  const { address, loading } = useWallet();
  if (loading) return <div style={{ textAlign: "center", padding: 60 }}>Cargando...</div>;
  if (!address) return <Navigate to="/" />;
  if (!condition) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { address, isAdmin, isRegistered, isApproved, role } = useWallet();
  const location = useLocation();
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
        <Route path="/patient/estudios" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 0}>
            <MisEstudiosPage />
          </ProtectedRoute>
        } />
        <Route path="/patient/subir" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 0}>
            <SubirEstudioPage />
          </ProtectedRoute>
        } />
        <Route path="/patient/recetas" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 0}>
            <SolicitarRecetaPage />
          </ProtectedRoute>
        } />
        <Route path="/patient/medicos" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 0}>
            <MisMedicosPage />
          </ProtectedRoute>
        } />
        <Route path="/doctor" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 1}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/doctor/recetas" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 1}>
            <RecetasPage />
          </ProtectedRoute>
        } />
        <Route path="/doctor/pacientes" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 1}>
            <PacientesPage />
          </ProtectedRoute>
        } />
        <Route path="/doctor/pacientes/:address" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role === 1}>
            <PacienteDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/lab" element={
          <ProtectedRoute condition={!isAdmin && isRegistered && isApproved && role !== null && role !== 0 && role !== 1}>
            <LaboratoryDashboard />
          </ProtectedRoute>
        } />
        <Route path="/laboratory" element={<Navigate to="/lab" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
