import { Bell, User, Menu as MenuIcon, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Logo from "../assets/Logo.png";
import AuthModal from "../components/AuthModal"; // ✅ Import the modal

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false); // modal state
  const navigate = useNavigate();

  const getUserAvatar = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("No user is currently logged in.");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user avatar:", error.message);
        return;
      }

      setAvatarUrl(data?.avatar_url || null);
    } catch (error) {
      console.error("An unexpected error occurred:", error.message);
    }
  };

  useEffect(() => {
    getUserAvatar();
  }, []);

  const linkClasses = ({ isActive }) =>
    isActive
      ? "text-[#D4A23A] font-semibold transition-colors border-b-2 border-[#D4A23A]"
      : "text-white hover:text-[#D4A23A] transition-colors";

  const handleCreateClick = (e) => {
    e.preventDefault();
    setShowAuthModal(true); // open modal
  };

  return (
    <header className="bg-[#1E4B2E] text-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <NavLink to="/home" className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center justify-center">
            <span className="text-2xl font-serif font-bold">
              <img className="h-10 sm:h-12" src={Logo} alt="Babuji Chaay" />
            </span>
          </div>
          <span className="text-base sm:text-lg font-semibold tracking-wide text-[#D4A23A]">
            Brewing Happiness
          </span>
        </NavLink>

        <nav className="hidden md:flex space-x-6 lg:space-x-8">
          <NavLink to="/dashboard" className={linkClasses}>
            Dashboard
          </NavLink>
          <NavLink to="/inventory" className={linkClasses}>
            Inventory
          </NavLink>
          <NavLink to="/menu" className={linkClasses}>
            Menu
          </NavLink>

          {/* Create → Open AuthModal */}
          <a
            href="/create"
            onClick={handleCreateClick}
            className="text-white hover:text-[#D4A23A] transition-colors"
          >
            Create
          </a>
        </nav>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <Bell className="w-5 h-5 text-white hover:text-[#D4A23A] cursor-pointer" />
          <NavLink
            to="/profile"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-yellow-600 transition-colors"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User Avatar"
                className="w-full h-full rounded-full border-2 border-[#d4a24a] object-cover"
              />
            ) : (
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#1E4B2E]" />
            )}
          </NavLink>

          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <MenuIcon className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden bg-[#1E4B2E] border-t border-[#D4A23A] shadow-xl px-6 py-4 flex flex-row justify-around items-center space-x-4">
          <NavLink
            to="/dashboard"
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
            className="text-white hover:text-[#D4A23A] transition-colors"
          >
            Create
          </a>
        </nav>
      )}

      {/* ✅ Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          navigate("/create"); // redirect after success
        }}
      />
    </header>
  );
};

export default Header;
