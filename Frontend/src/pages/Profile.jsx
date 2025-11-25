import { useState, useEffect, useCallback } from "react";
import { useUser } from "../App"; // ✅ Context from App.jsx
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuthModal from "../components/AuthModal";
import ProfileForm from "../components/ProfileForm";
import supabase from "../lib/supabaseClient";

/**
 * LossDumpForm Component
 */
const LossDumpForm = ({ user, loading, setLoading, setMessage, products, closeForm }) => {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState("loss"); // 'loss' or 'dump'

  const handleLog = async (e) => {
    e.preventDefault();

    if (!selectedProduct || quantity <= 0) {
      setMessage("⚠️ Please select a product and enter a valid quantity.");
      return;
    }

    try {
      setLoading(true);
      const product = products.find((p) => p.id.toString() === selectedProduct);
      if (!product) throw new Error("Invalid product selected.");

      const payload = {
        product_id: product.id,
        quantity,
        type,
        user_id: user.id, // ✅ direct user context id
        product_name: product.name,
      };

      const { error } = await supabase.from("loss_dump_logs").insert([payload]);
      if (error) throw error;

      setMessage(`✅ ${quantity} unit(s) of ${product.name} logged as ${type} successfully!`);
      closeForm();
    } catch (err) {
      setMessage("❌ Failed to log entry: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border border-red-300 rounded-lg bg-red-50 mt-8 space-y-4">
      <h3 className="text-xl font-semibold text-red-700">Log Product Loss or Dump</h3>
      <form onSubmit={handleLog} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="product" className="text-sm font-medium">Product</label>
          <select
            id="product"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="p-3 border border-border rounded-lg bg-card text-foreground"
            disabled={loading}
          >
            <option value="">Select Product...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col space-y-2">
          <label htmlFor="quantity" className="text-sm font-medium">Quantity</label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="p-3 border border-border rounded-lg bg-card text-foreground"
            min="1"
            disabled={loading}
          />
        </div>

        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="type"
              value="loss"
              checked={type === "loss"}
              onChange={() => setType("loss")}
              className="text-red-600 focus:ring-red-500"
              disabled={loading}
            />
            <span>Loss (Damaged/Stolen)</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="type"
              value="dump"
              checked={type === "dump"}
              onChange={() => setType("dump")}
              className="text-red-600 focus:ring-red-500"
              disabled={loading}
            />
            <span>Dump (Expired/Wasted)</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!selectedProduct || quantity <= 0 || loading}
            className="flex-1 px-5 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
          >
            {loading ? "Logging..." : "Log Entry"}
          </button>
          <button
            type="button"
            onClick={closeForm}
            disabled={loading}
            className="px-5 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium text-muted-foreground transition disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * --- Main Profile Component ---
 */
const Profile = () => {
  const { user, profile } = useUser(); // ✅ Directly use context
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showAuthModalForLossDump, setShowAuthModalForLossDump] = useState(false);
  const [showLossDumpForm, setShowLossDumpForm] = useState(false);
  const [products, setProducts] = useState([]);

  // ✅ Fetch only this user's products
  const fetchProducts = useCallback(async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data);
      console.log("🟢 Products for user:", user.id, data);
    } catch (err) {
      setMessage("❌ Error fetching products: " + err.message);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  const handleLossDumpClick = () => {
    setShowAuthModalForLossDump(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModalForLossDump(false);
    setShowLossDumpForm(true);
    setMessage("✅ Admin access granted. You can now log inventory changes.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="flex-grow py-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto bg-card shadow-xl rounded-2xl p-6 md:p-10">
          {user ? (
            <>
              <ProfileForm
                profile={profile}
                user={user}
                loading={loading}
                setLoading={setLoading}
                setMessage={setMessage}
                handleLossDumpClick={handleLossDumpClick}
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
            <p className="text-center text-foreground">Loading user data...</p>
          )}
          {message && (
            <p className="mt-4 text-center text-sm text-foreground">{message}</p>
          )}
        </div>
      </main>
      <Footer />

      {/* AuthModal for initial login/no user */}
      <AuthModal isOpen={!user} onClose={() => {}} />

      {/* AuthModal for Loss/Dump authentication */}
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
