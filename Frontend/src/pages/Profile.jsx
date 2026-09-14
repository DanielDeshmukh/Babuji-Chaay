import { useState, useEffect, useCallback } from "react";
import { useUser } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuthModal from "../components/AuthModal";
import ProfileForm from "../components/ProfileForm";
import supabase from "../lib/supabaseClient";
import { 
  Package, 
  Hash, 
  Trash2, 
  AlertCircle, 
  ChevronDown, 
  X,
  History
} from "lucide-react";

/**
 * LossDumpForm Component - Refined for professional inventory logging
 */
const LossDumpForm = ({ user, loading, setLoading, setMessage, products, closeForm }) => {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState("loss");

  const handleLog = async (e) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) {
      setMessage("⚠️ Selection required.");
      return;
    }

    try {
      setLoading(true);
      // Find the product to get its specific price for this log entry
      const product = products.find((p) => p.id.toString() === selectedProduct);
      if (!product) throw new Error("Invalid product.");

      const { error } = await supabase.from("loss_dump_logs").insert([{
        product_id: product.id,
        quantity: quantity,
        type: type,
        user_id: user.id,
        price_at_time: product.price,
        created_at: new Date().toISOString() // ✅ Key wire: needed for trigger calculation
      }]);
      
      if (error) throw error;

      setMessage(`✅ Recorded: ${quantity} unit(s) of ${product.name} as ${type.toUpperCase()}`);
      closeForm();
    } catch (err) {
      setMessage("❌ Log error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 overflow-hidden border border-destructive/20 rounded-2xl bg-destructive/5 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-destructive/10 px-6 py-4 flex justify-between items-center border-b border-destructive/10">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-destructive" size={20} />
          <h3 className="font-bold text-destructive tracking-tight">Inventory Adjustment</h3>
        </div>
        <button onClick={closeForm} className="text-destructive/60 hover:text-destructive transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleLog} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Product</label>
            <div className="relative">
              <Package className="absolute left-3 top-3 text-muted-foreground" size={18} />
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl appearance-none focus:ring-2 focus:ring-destructive/20 outline-none transition-all"
                disabled={loading}
              >
                <option value="">Choose item...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 text-muted-foreground pointer-events-none" size={18} />
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Quantity</label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 text-muted-foreground" size={18} />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-destructive/20 outline-none transition-all"
                min="1"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Type Selection Tabs */}
        <div className="flex p-1 bg-background border border-border rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setType("loss")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              type === "loss" ? "bg-destructive text-white shadow-lg" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <AlertCircle size={16} /> Loss (Theft/Damage)
          </button>
          <button
            type="button"
            onClick={() => setType("dump")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              type === "dump" ? "bg-destructive text-white shadow-lg" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <Trash2 size={16} /> Dump (Waste/Expired)
          </button>
        </div>

        <button
          type="submit"
          disabled={!selectedProduct || loading}
          className="w-full py-3 bg-destructive text-white rounded-xl font-bold shadow-lg shadow-destructive/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? "Processing..." : "Commit Adjustment"}
        </button>
      </form>
    </div>
  );
};

/**
 * Main Profile Component
 */
const Profile = () => {
  const { user, profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showAuthModalForLossDump, setShowAuthModalForLossDump] = useState(false);
  const [showLossDumpForm, setShowLossDumpForm] = useState(false);
  const [products, setProducts] = useState([]);

  const fetchProducts = useCallback(async () => {
    try {
      if (!user) return;
      // Fetching both name and price to ensure the log is financially accurate
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data);
    } catch (err) {
      setMessage("❌ Product sync error: " + err.message);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  const handleAuthSuccess = () => {
    setShowAuthModalForLossDump(false);
    setShowLossDumpForm(true);
    setMessage("✅ Admin session verified.");
    // Clear message after 3 seconds
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] dark:bg-background transition-colors duration-300">
      <Header />
      
      <main className="flex-grow py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Main Profile Card */}
          <div className="bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border rounded-[2rem] p-6 md:p-12">
            {user ? (
              <>
                <ProfileForm
                  profile={profile}
                  user={user}
                  loading={loading}
                  setLoading={setLoading}
                  setMessage={setMessage}
                  handleLossDumpClick={() => setShowAuthModalForLossDump(true)}
                />

                {showLossDumpForm && (
                  <LossDumpForm
                    user={user}
                    loading={loading}
                    setLoading={setLoading}
                    setMessage={setMessage}
                    products={products}
                    closeForm={() => setShowLossDumpForm(false)}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center py-20 animate-pulse">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {message && (
              <div className="mt-8 flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-xl text-sm font-medium animate-in fade-in duration-500">
                {message}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <AuthModal isOpen={!user} onClose={() => {}} />

      {showAuthModalForLossDump && (
        <AuthModal
          isOpen={showAuthModalForLossDump}
          onClose={() => setShowAuthModalForLossDump(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
};

export default Profile;