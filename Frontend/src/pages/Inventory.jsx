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
      
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      // Fetch Products and Menu in parallel for speed
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

    // Real-time subscription for menu updates
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
      
      if (error) {
        if (error.status === 409) {
          console.warn("Item already on menu.");
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

  // --- Filtering ---
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E4B2E] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D4A23A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#FDFCF6] font-medium">Brewing your inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1E4B2E]">
      <Header />

      <main className="flex-grow px-4 py-6 max-w-7xl mx-auto w-full">
        {/* Search Bar */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search our collection..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-4 pl-6 rounded-2xl border-2 border-[#D4A23A]/40 bg-[#FDFCF6] text-[#1E4B2E] placeholder-gray-400 focus:border-[#D4A23A] focus:ring-4 focus:ring-[#D4A23A]/10 transition-all outline-none shadow-inner"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto mb-10 pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-md ${
                activeCategory === cat
                  ? "bg-[#D4A23A] text-[#1E4B2E] ring-2 ring-[#D4A23A] ring-offset-2 ring-offset-[#1E4B2E]"
                  : "bg-[#FDFCF6] text-[#1E4B2E] hover:bg-[#E6CCB2] opacity-90"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => {
            const menuItem = menuItems.find((m) => m.product_id === product.id);
            const isProcessing = processingId === product.id;

            return (
              <div
                key={product.id}
                className="flex flex-col border border-[#D4A23A]/20 rounded-3xl p-6 bg-[#FDFCF6] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="mb-4">
                  <span className="bg-[#1E4B2E]/10 text-[#1E4B2E] text-[10px] px-2 py-1 rounded font-black uppercase">
                    {product.category}
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E4B2E] mt-3 leading-tight">
                    {product.name}
                  </h3>
                </div>

                <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-tighter">Availability</p>
                    <p className="text-sm font-bold text-[#1E4B2E]">{product.quantity} units</p>
                  </div>
                  <p className="text-2xl font-black text-[#D4A23A]">₹{product.price}</p>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={() => menuItem ? handleRemoveFromMenu(menuItem.id, product.id) : handleAddToMenu(product.id)}
                  className={`mt-6 w-full py-3.5 rounded-2xl text-sm font-black transition-all duration-200 active:scale-95 ${
                    menuItem 
                    ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white" 
                    : "bg-[#1E4B2E] text-[#FDFCF6] hover:bg-[#163B23] shadow-md"
                  } disabled:opacity-30`}
                >
                  {isProcessing ? "Working..." : menuItem ? "Remove Item" : "Add to Menu"}
                </button>
              </div>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-32 opacity-40">
            <p className="text-[#FDFCF6] text-xl font-medium italic">No matches found in your inventory.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Inventory;