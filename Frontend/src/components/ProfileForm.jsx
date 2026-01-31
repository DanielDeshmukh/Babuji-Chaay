import { useState } from "react";
import supabase from "../lib/supabaseClient";
import { 
  User, 
  Mail, 
  Lock, 
  Camera, 
  LogOut, 
  Edit3, 
  Save, 
  XCircle, 
  AlertTriangle,
  Loader2
} from "lucide-react";

const ProfileForm = ({
  profile,
  setProfile,
  user,
  loading,
  setLoading,
  setMessage,
  handleLossDumpClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium italic tracking-wide">Synchronizing secure profile...</p>
      </div>
    );
  }

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

      setMessage("✅ Avatar updated successfully");
      setAvatarFile(null);
    } catch (err) {
      setMessage("❌ Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile.full_name?.trim()) {
      setMessage("⚠️ Full name is required.");
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
      setMessage("✅ Changes saved");
      setIsEditing(false);
    } catch (err) {
      setMessage("❌ Save failed: " + err.message);
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
      setMessage("❌ Sign out failed: " + err.message);
    }
  };

  return (
    <div className="w-full bg-card rounded-2xl transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-start gap-10">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative group">
            <div className="w-36 h-36 rounded-full overflow-hidden bg-muted border-4 border-background ring-4 ring-primary/5 shadow-2xl transition-transform duration-500 group-hover:scale-105">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-accent text-accent-foreground">
                  <User size={56} className="opacity-30" />
                </div>
              )}
            </div>
            
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-2 right-2 p-2.5 bg-primary text-primary-foreground rounded-full cursor-pointer shadow-xl hover:scale-110 active:scale-95 transition-all"
              title="Change Photo"
            >
              <Camera size={20} />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files[0])}
                className="hidden"
                id="avatar-upload"
              />
            </label>
          </div>

          {avatarFile && (
            <button
              onClick={uploadAvatar}
              className="mt-6 w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all animate-in zoom-in-95"
              disabled={loading}
            >
              <Save size={14} /> Commit Photo
            </button>
          )}
        </div>

        {/* Info Section */}
        <div className="flex-1 space-y-8">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5 animate-in fade-in slide-in-from-top-4">
              <div className="space-y-4">
                <div className="group relative">
                  <User className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                    placeholder="Full Name"
                    disabled={loading}
                  />
                </div>

                <div className="group relative">
                  <Lock className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="number"
                    value={profile.pin || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, pin: e.target.value.slice(0, 4) }))}
                    className="w-full pl-12 pr-4 py-3 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                    placeholder="4-digit PIN (for admin logs)"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  <Save size={18} /> {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-2xl font-bold hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  {profile.full_name || "Guest User"}
                </h2>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
                    <Mail size={14} />
                    <span className="text-xs font-bold tracking-tight uppercase">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
                    <Lock size={14} />
                    <span className="text-xs font-bold tracking-tight uppercase">
                      PIN: {profile.pin ? "Securely Set" : "Unset"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:flex flex-wrap gap-4 pt-6 border-t border-border/40">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-bold transition-all hover:bg-accent/80 border border-border/50 shadow-sm"
                >
                  <Edit3 size={16} /> Edit Profile
                </button>

                <button
                  onClick={handleLossDumpClick}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold transition-all hover:bg-amber-600 shadow-lg shadow-amber-500/20"
                >
                  <AlertTriangle size={16} /> Inventory Audit
                </button>

                <button
                  onClick={signOut}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-destructive/5 text-destructive border border-destructive/10 rounded-xl text-sm font-bold transition-all hover:bg-destructive hover:text-white"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;