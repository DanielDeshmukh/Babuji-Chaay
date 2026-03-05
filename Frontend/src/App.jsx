import { useState, useEffect, createContext, useContext } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from '@capacitor/app';
import supabase from "@/lib/supabaseClient";
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

export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const isVisibleRoute = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/splashscreen";

  useEffect(() => {
    const setupDeepLink = async () => {
      CapApp.addListener('appUrlOpen', async (event) => {
        console.log('🔗 Deep Link received:', event.url);
        const url = new URL(event.url);
        const hash = url.hash;

        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (!error && data.session) {
              console.log("OAuth Session Manually Set via Deep Link");
              setUser(data.session.user);
              navigate("/home", { replace: true });
            }
          }
        }
      });
    };

    setupDeepLink();

    return () => {
      CapApp.removeAllListeners();
    };
  }, [navigate]);
// Frontend/src/App.jsx
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session?.user) {
          console.log("⚠️ No active session found");
          setUser(null);
          setProfile(null);
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);
        console.log("✅ User Session Found:", currentUser.email);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (!profileError) {
          setProfile(profileData);
          console.log("✅ Profile Loaded:", profileData);
        }
      } catch (err) {
        console.error(" Auth Initialization Error:", err.message);
      }
    };

    fetchUserData();

    // Listen for Auth changes (Sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3️⃣ Navigation Guard: Force move logged-in users away from Auth pages
  useEffect(() => {
    const authRoutes = ["/", "/login", "/splashscreen"];
    if (user && authRoutes.includes(location.pathname)) {
      console.log("🚀 User exists, moving from", location.pathname, "to /home");
      navigate("/home", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Debug Logger
  useEffect(() => {
    console.log("👤 Context Update:", { userPresent: !!user, profilePresent: !!profile });
  }, [user, profile]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <UserContext.Provider value={{ user, profile }}>
        <div className="min-h-screen text-white relative">
          <Background />

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