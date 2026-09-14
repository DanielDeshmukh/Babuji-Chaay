"use client";

import React, { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Product {
  id: number;
  name: string;
  category: string;
  quantity: number;
  price: number;
}

interface MenuItem {
  id: number;
  product_id: number;
  name: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: string;
  } | null>(null);

  const notify = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, menuRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/todays-menu"),
      ]);

      const prodData = await prodRes.json();
      const menuData = await menuRes.json();

      setProducts(prodData.products || []);
      setMenuItems(menuData.todays_menu || []);
    } catch (err) {
      notify(
        `Failed to fetch: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addToMenu = async (productId: number, productName: string) => {
    try {
      const res = await fetch("/api/todays-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });

      if (!res.ok) throw new Error("Failed to add");
      const data = await res.json();
      setMenuItems((prev) => [...prev, data.menu_item]);
      notify(`Added ${productName} to menu!`, "success");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Failed to add",
        "error"
      );
    }
  };

  const removeFromMenu = async (rowId: number, productName: string) => {
    try {
      const res = await fetch("/api/todays-menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId }),
      });

      if (!res.ok) throw new Error("Failed to remove");
      setMenuItems((prev) => prev.filter((item) => item.id !== rowId));
      notify(`Removed ${productName}`, "success");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Failed to remove",
        "error"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const grouped = products.reduce(
    (acc, p) => {
      const cat = p.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    },
    {} as Record<string, Product[]>
  );

  const categories = ["All", ...Object.keys(grouped)];

  const filteredProducts = (
    activeCategory === "All"
      ? products
      : grouped[activeCategory] || []
  ).filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      <Header />

      {notification && (
        <div
          className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white transition-opacity duration-300 z-50 ${
            notification.type === "error" ? "bg-red-600" : "bg-green-600"
          } flex items-center justify-between`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-4 font-bold"
          >
            &times;
          </button>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const exists = menuItems.find(
              (m) => m.product_id === p.id
            );

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
                  <p className="text-sm font-bold text-accent mt-1">
                    {p.price}
                  </p>
                </div>

                {exists ? (
                  <button
                    onClick={() =>
                      removeFromMenu(exists.id, p.name)
                    }
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
}
