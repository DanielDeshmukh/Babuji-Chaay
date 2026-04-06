import React, { useEffect, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import Footer from "../components/Footer";
import Header from "../components/Header";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  // --- Data Fetching ---
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const [productsRes, menuRes] = await Promise.all([
        supabase.functions.invoke("get-products", {
          body: { user_id: user.id },
        }),
        supabase.functions.invoke("get-todays-menu", {
          body: { user_id: user.id },
        })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (menuRes.error) throw menuRes.error;

      setProducts(productsRes.data?.products || []);
      setMenuItems(menuRes.data?.todays_menu || []);
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel("realtime-todays-menu")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todays_menu" },
        () => fetchInitialData() 
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchInitialData]);

  // --- Handlers ---
  const handleAddToMenu = async (productId) => {
    if (processingId) return;
    setProcessingId(productId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("add-menu", {
        body: { 
          product_id: productId,
          user_id: user?.id 
        },
      });
      
      if (error) throw error;

      if (data?.menu_item) {
        setMenuItems((prev) => [...prev, data.menu_item]);
      }
    } catch (err) {
      console.error("Failed to add item:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFromMenu = async (rowId, productId) => {
    if (processingId) return;
    setProcessingId(productId);
    try {
      const { data, error } = await supabase.functions.invoke("remove-menu", {
        body: { id: rowId },
      });
      
      if (error) throw error;

      if (data?.deleted_item) {
        setMenuItems((prev) => prev.filter((m) => m.id !== data.deleted_item.id));
      }
    } catch (err) {
      console.error("Failed to remove item:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // --- Filtering ---
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1F12] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D4A23A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A1F12] text-white font-sans">
      <Header />

      <main className="flex-grow px-6 py-8 max-w-[1400px] mx-auto w-full">
        {/* Search Bar - Matches Screenshot Style */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#0F2D1C] border border-[#1A4D30] text-[#E0E0E0] placeholder-[#4A6D58] focus:outline-none focus:border-[#D4A23A] transition-all"
          />
        </div>

        {/* Categories - Matches Pill Style */}
        <div className="flex gap-3 overflow-x-auto mb-10 pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-[#D4A23A] text-[#0A1F12]"
                  : "bg-[#0F2D1C] text-[#A0B0A6] hover:bg-[#1A4D30]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid - Matches 4-column Screenshot Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const menuItem = menuItems.find((m) => m.product_id === product.id);
            const isProcessing = processingId === product.id;

            return (
              <div
                key={product.id}
                className="flex flex-col rounded-xl bg-[#0F2D1C] border border-[#1A4D30] overflow-hidden shadow-lg"
              >
                <div className="p-6 text-center flex-grow flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-[#A0B0A6] mb-1">
                    Qty: {product.quantity}
                  </p>
                  <p className="text-lg font-bold text-[#D4A23A]">
                    ₹{product.price}
                  </p>
                </div>

                <div className="px-4 pb-4 mt-auto">
                  <button
                    disabled={isProcessing}
                    onClick={() => menuItem ? handleRemoveFromMenu(menuItem.id, product.id) : handleAddToMenu(product.id)}
                    className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                      menuItem 
                      ? "bg-[#EF4444] text-white hover:bg-[#DC2626]" 
                      : "bg-[#D4A23A] text-[#0A1F12] hover:bg-[#C2922F]"
                    } disabled:opacity-50`}
                  >
                    {isProcessing ? "..." : menuItem ? "Remove" : "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-[#4A6D58]">
            No products found.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Inventory;