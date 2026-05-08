"use client";

import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Footer from "../components/Footer";
import Header from "../components/Header";
import useCurrentUser from "@/hooks/useCurrentUser";

// ==========================
// Notification Component
// ==========================
const Notification = ({ message, type, onClose }) => {
  if (!message) return null;

  const baseClasses =
    "fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white transition-opacity duration-300 z-50";
  const typeClasses = type === "error" ? "bg-red-600" : "bg-green-600";

  useEffect(() => {
    const timer = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className={`${baseClasses} ${typeClasses} flex items-center justify-between`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 font-bold">
        &times;
      </button>
    </div>
  );
};

// ==========================
// MAIN INVENTORY COMPONENT
// ==========================
const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState(null);

  const { user, loading: userLoading } = useCurrentUser();

  // ==========================
  // Helpers
  // ==========================
  const getSessionToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const notify = (message, type) => {
    setNotification({ message, type });
  };

  // ==========================
  // FETCH ALL DATA (Products + Menu)
  // ==========================
  const fetchAll = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const token = await getSessionToken();

      console.log("🔐 Using token:", token);

      // ------------------------------
      // GET PRODUCTS
      // ------------------------------
      const { data: prodResponse, error: prodError } =
        await supabase.functions.invoke("get-products", {
          body: { user_id: user.id },
          headers: { Authorization: `Bearer ${token}` },
        });

      if (prodError) throw new Error(prodError.message);
      setProducts(prodResponse?.products || []);
      console.log("📦 Products:", prodResponse?.products?.length);

      // ------------------------------
      // GET TODAY’S MENU
      // ------------------------------
      const { data: menuResponse, error: menuError } =
        await supabase.functions.invoke("get-todays-menu", {
          headers: { Authorization: `Bearer ${token}` },
        });

      console.log("📥 Raw menu response:", menuResponse);

      if (menuError) throw new Error(menuError.message);

      setMenuItems(menuResponse?.todays_menu || []);
      console.log("🍽️ Menu items:", menuResponse?.todays_menu?.length);
    } catch (err) {
      console.error("❌ FetchAll Error:", err.message);
      notify(`Failed to fetch: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // useEffect → initial load + realtime
  // ==========================
  useEffect(() => {
    if (userLoading) return;
    if (!user) return;

    fetchAll();

    const channel = supabase
      .channel("realtime-todays-menu")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todays_menu",
        },
        () => setTimeout(fetchAll, 200)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, userLoading]);

  // ==========================
  // MENU ACTIONS
  // ==========================
  const addToMenu = async (productId, productName) => {
    try {
      const token = await getSessionToken();

      const { data, error } = await supabase.functions.invoke("add-menu", {
        body: { product_id: productId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw new Error(error.message);

      setMenuItems((prev) => [...prev, data.menu_item]);

      notify(`Added ${productName} to menu!`, "success");
    } catch (err) {
      console.error("❌ Add Menu Error:", err.message);
      notify(err.message, "error");
    }
  };

  const removeFromMenu = async (rowId, productName) => {
    try {
      const token = await getSessionToken();

      const { data, error } = await supabase.functions.invoke("remove-menu", {
        body: { id: rowId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw new Error(error.message);

      setMenuItems((prev) => prev.filter((item) => item.id !== rowId));

      notify(`Removed ${productName}`, "success");
    } catch (err) {
      console.error("❌ Remove Menu Error:", err.message);
      notify(err.message, "error");
    }
  };

  // ==========================
  // UI RENDER
  // ==========================
  if (loading || userLoading) {
    return <p className="text-center mt-6 text-foreground">Loading...</p>;
  }

  const grouped = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const categories = ["All", ...Object.keys(grouped)];

  const filteredProducts = (
    activeCategory === "All" ? products : grouped[activeCategory] || []
  ).filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      <Header />

      <Notification
        message={notification?.message}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />

      {user && (
        <div className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs px-3 py-1 rounded-md shadow-lg">
          Dev: {user.name || "Unknown"} (ID: {user.id})
        </div>
      )}

      <main className="flex-grow px-4 py-6 max-w-7xl mx-auto w-full">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-4 rounded-lg border border-border bg-card text-foreground"
        />

        {/* CATEGORY FILTER */}
        <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-accent text-accent-foreground"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const exists = menuItems.find((m) => m.product_id === p.id);

            return (
              <div
                key={p.id}
                className="border border-border rounded-lg p-4 bg-card shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <p className="font-semibold mb-1">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {p.quantity}
                  </p>
                  <p className="text-sm font-bold text-accent mt-1">₹{p.price}</p>
                </div>

                {exists ? (
                  <button
                    onClick={() => removeFromMenu(exists.id, p.name)}
                    className="mt-3 w-full px-3 py-2 rounded-md text-sm bg-red-500 text-white"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => addToMenu(p.id, p.name)}
                    className="mt-3 w-full px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Inventory;
