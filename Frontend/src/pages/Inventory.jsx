import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Footer from "../components/Footer";
import Header from "../components/Header";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-products");
        if (error) throw error;
        setProducts(data.products || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchMenu = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-todays-menu");
        if (error) throw error;
        setMenuItems(data.todays_menu || []);
      } catch (err) {
        console.error("Error fetching today’s menu:", err);
      }
    };

    fetchProducts();
    fetchMenu();

    const channel = supabase
      .channel("realtime-todays-menu")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todays_menu" },
        () => fetchMenu()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) return <p className="text-center mt-6 text-foreground">Loading products...</p>;

  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {});

  const categories = ["All", ...Object.keys(groupedProducts)];

  const filteredProducts = (
    activeCategory === "All"
      ? products
      : groupedProducts[activeCategory] || []
  ).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const addToMenu = async (productId) => {
    try {
      const { data, error } = await supabase.functions.invoke("add-menu", {
        body: { product_id: productId },
      });
      if (error) throw error;

      const newItem = data?.menu_item;
      if (newItem) {
        setMenuItems((prev) => [...prev, newItem]);
      }
    } catch (err) {
      console.error("Error adding to menu:", err);
    }
  };

  const removeFromMenu = async (rowId) => {
    try {
      const { data, error } = await supabase.functions.invoke("remove-menu", {
        body: { id: rowId },
      });
      if (error) throw error;

      const deletedItem = data?.deleted_item;
      if (deletedItem) {
        setMenuItems((prev) => prev.filter((m) => m.id !== deletedItem.id));
      }
    } catch (err) {
      console.error("Error removing from menu:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-grow px-4 py-6 max-w-7xl mx-auto w-full">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-4 rounded-lg border border-border focus:ring-2 focus:ring-accent focus:outline-none bg-card text-foreground placeholder-muted-foreground"
        />

        <div className="flex gap-2 overflow-x-auto mb-6 pb-2 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                activeCategory === cat
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const menuItem = menuItems.find((m) => m.product_id === product.id);

            return (
              <div
                key={product.id}
                className="border border-border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <p className="font-semibold text-base mb-1 text-foreground">
                    {product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {product.quantity}
                  </p>
                  <p className="text-sm font-bold text-accent mt-1">
                    ₹{product.price}
                  </p>
                </div>

                {menuItem ? (
                  <button
                    onClick={() => removeFromMenu(menuItem.id)}
                    className="mt-3 w-full px-3 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => addToMenu(product.id)}
                    className="mt-3 w-full px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>

    </div>
  );
};

export default Inventory;
