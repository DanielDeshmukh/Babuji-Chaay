import React, { useEffect, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import Footer from "../components/Footer";
import Header from "../components/Header";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); // Tracks which button is "loading"
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  // --- Data Fetching ---
  const fetchMenu = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-todays-menu");
      if (error) throw error;
      setMenuItems(data.todays_menu || []);
    } catch (err) {
      console.error("Error fetching today’s menu:", err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-products");
      if (error) throw error;
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchMenu();

    // Real-time subscription to keep menu synced across devices
    const channel = supabase
      .channel("realtime-todays-menu")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todays_menu" },
        () => fetchMenu()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchProducts, fetchMenu]);

  // --- Handlers ---
  const handleAddToMenu = async (productId) => {
    if (processingId) return;
    setProcessingId(productId);
    try {
      const { data, error } = await supabase.functions.invoke("add-menu", {
        body: { product_id: productId },
      });
      
      // Specifically handle the 409 Conflict if it happens
      if (error) {
        if (error.status === 409) {
          console.warn("Item already exists in menu.");
        } else {
          throw error;
        }
      }

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

  // --- Derived State (Filtering) ---
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E4B2E] flex items-center justify-center">
        <p className="text-[#FDFCF6] animate-pulse text-lg font-medium">Loading Inventory...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1E4B2E]">
      <Header />

      <main className="flex-grow px-4 py-6 max-w-7xl mx-auto w-full">
        {/* Search Input */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-[#D4A23A] bg-[#FDFCF6] text-[#1E4B2E] placeholder-gray-400 focus:ring-4 focus:ring-[#D4A23A]/20 transition-all outline-none"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto mb-8 pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shadow-sm ${
                activeCategory === cat
                  ? "bg-[#D4A23A] text-[#1E4B2E] scale-105"
                  : "bg-[#FDFCF6] text-[#1E4B2E] hover:bg-[#E6CCB2]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const menuItem = menuItems.find((m) => m.product_id === product.id);
            const isProcessing = processingId === product.id;

            return (
              <div
                key={product.id}
                className="group relative border border-[#D4A23A]/30 rounded-2xl p-5 bg-[#FDFCF6] shadow-md hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="flex-grow">
                  <span className="text-[10px] uppercase tracking-widest text-[#D4A23A] font-bold">
                    {product.category}
                  </span>
                  <h3 className="text-lg font-bold text-[#1E4B2E] mt-1 group-hover:text-[#D4A23A] transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Stock: {product.quantity}
                    </p>
                    <p className="text-xl font-black text-[#1E4B2E]">₹{product.price}</p>
                  </div>
                </div>

                <div className="mt-6">
                  {menuItem ? (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleRemoveFromMenu(menuItem.id, product.id)}
                      className="w-full py-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      {isProcessing ? "Removing..." : "Remove from Menu"}
                    </button>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleAddToMenu(product.id)}
                      className="w-full py-3 rounded-xl text-sm font-bold bg-[#1E4B2E] text-[#FDFCF6] hover:bg-[#163B23] shadow-lg shadow-[#1E4B2E]/20 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? "Adding..." : "Add to Today's Menu"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#FDFCF6]/60 text-lg italic">No products found matching your criteria.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Inventory;