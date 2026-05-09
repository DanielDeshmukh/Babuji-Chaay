import { useState, useEffect, createContext, useContext, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
import { initializeMobileAuth } from "./lib/mobileAuth";
import "./App.css";

export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const AUTH_PAGES = new Set(["/", "/login", "/register", "/splashscreen"]);

function RequireAuth({ authReady, user, children }) {
  const location = useLocation();

  if (!authReady) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function GuestOnly({ authReady, user, children }) {
  if (!authReady) {
    return <SplashScreen />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function RootRoute({ authReady, user }) {
  if (!authReady) {
    return <SplashScreen />;
  }

  return user ? <Navigate to="/home" replace /> : <Register />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const syncUserState = async (sessionUser) => {
      if (!isMounted) return;

      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(sessionUser);

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionUser.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") throw profileError;
        if (!isMounted) return;

        setProfile(profileData);
      } catch (err) {
        console.error("Error fetching user/profile:", err.message);
      }
    };

    let removeDeepLinkListener = () => {};
    let subscription;

    const bootstrapAuth = async () => {
      try {
        removeDeepLinkListener = await initializeMobileAuth({
          onSessionEstablished: async () => {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            await syncUserState(session?.user ?? null);
            navigate("/home", { replace: true });
          },
        });

        const {
          data: { session },
        } = await supabase.auth.getSession();

        await syncUserState(session?.user ?? null);
      } catch (err) {
        console.error("Error bootstrapping auth:", err.message);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    bootstrapAuth();

    ({ data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      await syncUserState(session?.user ?? null);

      if (event === "SIGNED_IN" && AUTH_PAGES.has(currentPathRef.current)) {
        navigate("/home", { replace: true });
      }

      if (event === "SIGNED_OUT") {
        navigate("/login", { replace: true });
      }
    }));

    return () => {
      isMounted = false;
      removeDeepLinkListener();
      subscription?.subscription?.unsubscribe();
    };
  }, [navigate]);

  return (
    <UserContext.Provider value={{ user, profile, authReady }}>
      <div className="min-h-screen text-white relative">
        <Background />

        <Routes>
          <Route path="/" element={<RootRoute authReady={authReady} user={user} />} />
          <Route
            path="/register"
            element={
              <GuestOnly authReady={authReady} user={user}>
                <Register />
              </GuestOnly>
            }
          />
          <Route path="/splashscreen" element={<SplashScreen />} />
          <Route
            path="/login"
            element={
              <GuestOnly authReady={authReady} user={user}>
                <Login />
              </GuestOnly>
            }
          />
          <Route
            path="/menu"
            element={
              <RequireAuth authReady={authReady} user={user}>
                <Menu />
              </RequireAuth>
            }
          />
          <Route path="/auth" element={<AuthModal />} />
          <Route
            path="/create"
            element={
              <RequireAuth authReady={authReady} user={user}>
                <CreationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth authReady={authReady} user={user}>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth authReady={authReady} user={user}>
                <Settings />
              </RequireAuth>
            }
          />
          <Route
            path="/home"
            element={
              <RequireAuth authReady={authReady} user={user}>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth authReady={authReady} user={user}>
                <Inventory />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </UserContext.Provider>
  );
}

export default App;
