import {User, Menu as MenuIcon, X } from "lucide-react";
import { IoSettingsOutline } from "react-icons/io5";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Logo from "../assets/Logo.png";
import AuthModal from "../components/AuthModal";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  const getUserAvatar = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (!error) setAvatarUrl(data?.avatar_url || null);
    } catch (error) {
      console.error("Avatar fetch error:", error.message);
    }
  };
  const handleSetttingsClick = () => {
    navigate("/settings");
  }

  useEffect(() => {
    // A listener to refetch avatar if profile changes (e.g., after update)
    // This is optional but good practice
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "USER_UPDATED" || event === "SIGNED_IN") {
          getUserAvatar();
        }
      }
    );

    getUserAvatar(); // Initial fetch

    return () => {
      authListener.subscription.unsubscribe(); // Cleanup listener
    };
  }, []);

  // Updated to use theme colors (primary for active, foreground for inactive)
  const linkClasses = ({ isActive }) =>
    isActive
      ? "text-primary font-semibold transition-colors border-b-2 border-primary"
      : "text-foreground hover:text-primary transition-colors";

  const handleCreateClick = (e) => {
    e.preventDefault();
    setShowAuthModal(true);
  };

  return (
    // Use a React Fragment to return multiple root-level elements
    <>
      <header className="backdrop-blur-md bg-background/90 border-b border-border shadow-xl sticky top-0 z-50 text-foreground">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <NavLink
            to="/home"
            className="flex items-center space-x-2 sm:space-x-3"
          >
            <img
              className="h-10 sm:h-12 rounded-md"
              src={Logo}
              alt="Babuji Chaay"
            />
            {/* Replaced hardcoded yellow text with text-secondary */}
            <span className="text-lg sm:text-xl font-semibold tracking-wide text-primary">
              Brewing Happiness
            </span>
          </NavLink>

          <nav className="hidden md:flex space-x-6 lg:space-x-8">
            <NavLink to="/home" className={linkClasses}>
              Dashboard
            </NavLink>
            <NavLink to="/inventory" className={linkClasses}>
              Inventory
            </NavLink>
            <NavLink to="/menu" className={linkClasses}>
              Menu
            </NavLink>
            {/* Replaced hardcoded text/hover with theme classes */}
            <a
              href="/create"
              onClick={handleCreateClick}
              className="text-foreground hover:text-secondary transition-colors"
            >
              Create
            </a>
          </nav>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Replaced hardcoded text/hover with theme classes */}
            < IoSettingsOutline className="w-5 h-5 text-foreground hover:text-primary cursor-pointer transition-colors" onClick={handleSetttingsClick}/>
            <NavLink
              to="/profile"
              // Replaced hardcoded ring color with primary
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:ring-2 hover:ring-primary transition"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="User Avatar"
                  // Replaced hardcoded border color with primary
                  className="w-full h-full rounded-full border-2 border-primary object-cover"
                />
              ) : (
                // Replaced hardcoded icon color with primary
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              )}
            </NavLink>

            <button
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {/* Replaced hardcoded text color with foreground */}
              {mobileOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <MenuIcon className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          // Replaced bg-black/60 and border-white/10 with theme-aware classes
          <nav className="md:hidden bg-background/90 backdrop-blur-sm border-t border-border shadow-xl px-6 py-4 flex flex-col space-y-3">
            <NavLink
              to="/home"
              className={linkClasses}
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/inventory"
              className={linkClasses}
              onClick={() => setMobileOpen(false)}
            >
              Inventory
            </NavLink>
            <NavLink
              to="/menu"
              className={linkClasses}
              onClick={() => setMobileOpen(false)}
            >
              Menu
            </NavLink>
            <a
              href="/create"
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                setShowAuthModal(true);
              }}
              // Replaced hardcoded text/hover with theme classes
              className="text-foreground hover:text-secondary transition-colors"
            >
              Create
            </a>
          </nav>
        )}

        {/* The AuthModal was here, causing the bug. It has been moved outside the <header> tag. */}
      </header>

      {/* FIX: AuthModal is now a sibling to <header>.
        Its `position: fixed` will now be relative to the viewport, not the header.
      */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          navigate("/create");
        }}
      />
    </>
  );
};

export default Header;