import { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuthModal from "../components/AuthModal";

const ProfileForm = ({ profile, setProfile, user, loading, setLoading, setMessage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    try {
      setLoading(true);
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrl.publicUrl;

      setProfile((p) => ({ ...p, avatar_url: avatarUrl }));

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date() })
        .eq("id", user.id);

      if (error) throw error;

      setMessage("✅ Avatar updated");
      setAvatarFile(null);
    } catch (err) {
      setMessage("❌ Error uploading avatar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile.full_name.trim()) {
      setMessage("⚠️ Full name cannot be empty.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        pin: profile.pin || null,
        updated_at: new Date(),
      });
      if (error) throw error;
      setMessage("✅ Profile updated successfully");
      setIsEditing(false);
    } catch (err) {
      setMessage("❌ Failed to update profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/";
    } catch (err) {
      setMessage("❌ Error signing out: " + err.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:space-x-8 text-foreground">
      {/* Avatar Section */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-28 h-28 rounded-full overflow-hidden bg-muted border-2 border-primary">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No Avatar
            </div>
          )}
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files[0])}
            className="hidden"
            id="avatar-upload"
          />
          <label
            htmlFor="avatar-upload"
            className="cursor-pointer text-sm px-3 py-1 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90"
          >
            Change
          </label>
          {avatarFile && (
            <button
              onClick={uploadAvatar}
              className="ml-2 text-sm px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              disabled={loading}
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Profile Details Section */}
      <div className="flex-1 mt-6 md:mt-0">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Edit Profile</h3>

            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              className="w-full border border-border rounded-lg p-3 bg-card text-foreground"
              placeholder="Enter your full name"
              disabled={loading}
            />

            <input
              type="number"
              value={profile.pin || ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  pin: e.target.value.slice(0, 4),
                }))
              }
              className="w-full border border-border rounded-lg p-3 bg-card text-foreground"
              placeholder="Set 4-digit PIN"
              disabled={loading}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-5 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium text-primary-foreground"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 px-5 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {profile.full_name || "Your Name"}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-muted-foreground">
              <span className="font-semibold">PIN:</span>{" "}
              {profile.pin ? "****" : "Not set"}
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium text-primary-foreground"
              >
                Edit
              </button>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const [profile, setProfile] = useState({ full_name: "", avatar_url: "", pin: "" });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          setMessage("⚠️ User not logged in.");
          return;
        }
        setUser(user);

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, pin")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (!data) {
          await supabase.from("profiles").insert({ id: user.id });
          setProfile({ full_name: "", avatar_url: "", pin: "" });
        } else {
          setProfile({
            full_name: data.full_name || "",
            avatar_url: data.avatar_url || "",
            pin: data.pin || "",
          });
        }
      } catch (err) {
        setMessage("❌ " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="flex-grow py-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto bg-card shadow-xl rounded-2xl p-6 md:p-10">
          {user ? (
            <ProfileForm
              profile={profile}
              setProfile={setProfile}
              user={user}
              loading={loading}
              setLoading={setLoading}
              setMessage={setMessage}
            />
          ) : (
            <p className="text-center text-foreground">Loading user data...</p>
          )}
          {message && (
            <p className="mt-4 text-center text-sm text-foreground">{message}</p>
          )}
        </div>
      </main>
      <AuthModal isOpen={!user} onClose={() => {}} />
    </div>
  );
}
export default Profile;