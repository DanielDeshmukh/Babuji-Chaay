import { Route, Routes, useLocation } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import { ModeToggle } from "./components/ModeToggle";
import AuthModal from "./components/AuthModal";
import { ThemeProvider } from "./components/theme-provider";
import Menu from "./pages/Menu";
import Settings from "./pages/Settings";
import CreationPage from "./pages/CreationPage";
import Login from "./pages/Login";
import "./App.css";
import Background from "./components/Background.jsx";

function App() {
  const location = useLocation();

  // ✅ Just determine visibility, don’t interfere with theme logic
  const isVisibleRoute = location.pathname === "/" || location.pathname === "/login";

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen text-white relative">
        <Background />

        {/* ✅ Keep toggle mounted, only hide visually */}
        <div
          className={`absolute top-4 right-4 z-50 transition-opacity duration-300 ${
            isVisibleRoute ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <ModeToggle />
        </div>

        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/splashscreen" element={<SplashScreen />} />
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/auth" element={<AuthModal />} />
          <Route path="/create" element={<CreationPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/home" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
