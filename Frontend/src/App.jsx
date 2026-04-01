import { useState, useEffect, createContext, useContext } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import SplashScreen from "./pages/SplashScreen";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AuthModal from "./components/AuthModal";
import Menu from "./pages/Menu";
import Settings from "./pages/Settings";
import CreationPage from "./pages/CreationPage";
import Login from "./pages/Login";
import Background from "./components/Background.jsx";
import "./App.css";

export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) throw error;
        if (!user) {
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        setProfile(profileData);
      } catch (err) {
        console.error("Error fetching user/profile:", err.message);
      }
    };

    fetchUserData();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const titles = {
      "/": "Register | Babuji Chaay",
      "/login": "Login | Babuji Chaay",
      "/home": "Dashboard | Babuji Chaay",
      "/menu": "Menu Billing | Babuji Chaay",
      "/inventory": "Inventory | Babuji Chaay",
      "/settings": "Settings | Babuji Chaay",
      "/profile": "Profile | Babuji Chaay",
      "/create": "Create | Babuji Chaay",
      "/auth": "Authentication | Babuji Chaay",
      "/splashscreen": "Welcome | Babuji Chaay",
    };

    document.title = titles[location.pathname] || "Babuji Chaay";
  }, [location.pathname]);

  return (
    <UserContext.Provider value={{ user, profile }}>
      <div className="min-h-screen text-white relative">
        <Background />

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
  );
}

export default App;
