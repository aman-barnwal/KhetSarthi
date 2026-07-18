import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "./lib/i18n";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import { Spinner } from "./components/Shared";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import KrishiAI from "./pages/KrishiAI";
import WeatherPage from "./pages/WeatherPage";
import CropScanner from "./pages/CropScanner";
import Crops from "./pages/Crops";
import DemandSupply from "./pages/DemandSupply";
import Market from "./pages/Market";
import VendorsDir from "./pages/VendorsDir";
import MandiPrices from "./pages/MandiPrices";
import Schemes from "./pages/Schemes";
import Expenses from "./pages/Expenses";
import Notifications from "./pages/Notifications";
import SearchPage from "./pages/SearchPage";
import About from "./pages/About";
import Help from "./pages/Help";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Legal from "./pages/Legal";

function Protected({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <Spinner />;
  if (user === false) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (!user.onboarded && user.role !== "admin" && location.pathname !== "/onboarding")
    return <Navigate to="/onboarding" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="/legal/:page" element={<Legal />} />
            <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
            <Route element={<Protected><AppShell /></Protected>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ai" element={<KrishiAI />} />
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/scanner" element={<CropScanner />} />
              <Route path="/crops" element={<Crops />} />
              <Route path="/demand" element={<DemandSupply />} />
              <Route path="/market" element={<Market />} />
              <Route path="/vendors" element={<VendorsDir />} />
              <Route path="/prices" element={<MandiPrices />} />
              <Route path="/schemes" element={<Schemes />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/help" element={<Help />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Protected roles={["admin"]}><Admin /></Protected>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
