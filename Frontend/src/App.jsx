import { useState, useEffect, createContext, useContext } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import  supabase  from "@/lib/supabaseClient"; // ✅ ensure correct path
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
import Background from "./components/Background.jsx";
import "./App.css";

// ✅ Create context for user info
export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const isVisibleRoute = location.pathname === "/" || location.pathname === "/login";

  // ✅ Fetch current user + profile once
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1️⃣ Get session user
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) throw error;
        if (!user) {
          console.log("⚠️ No user logged in");
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(user);
        console.log("✅ Auth User:", user);

        // 2️⃣ Fetch profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        setProfile(profileData);
        console.log("✅ Profile Data:", profileData);

      } catch (err) {
        console.error("❌ Error fetching user/profile:", err.message);
      }
    };

    fetchUserData();

    // 🔁 Listen to session changes (login/logout)
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        console.log("🟢 Session user changed:", session.user);
      } else {
        setUser(null);
        setProfile(null);
        console.log("🔴 User signed out");
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // ✅ Log combined info in dev tools each render
  useEffect(() => {
    console.log("👤 Current User Context:", { user, profile });
  }, [user, profile]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <UserContext.Provider value={{ user, profile }}>
        <div className="min-h-screen text-white relative">
          <Background />

          {/* ✅ Keep toggle mounted, only hide visually */}
          <div
            className={`absolute top-4 right-4 z-50 transition-opacity duration-300 ${
              isVisibleRoute
                ? "opacity-100 visible"
                : "opacity-0 invisible pointer-events-none"
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
      </UserContext.Provider>
    </ThemeProvider>
  );
}

export default App;
