"use client";

import React, { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import Footer from "../components/Footer";
import Header from "../components/Header";
import useCurrentUser from "@/hooks/useCurrentUser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Notification = ({ message, onClose }) => {
  if (!message) return null;

  useEffect(() => {
    const timer = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-foreground shadow-lg">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-primary"
      >
        &times;
      </button>
    </div>
  );
};

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState(null);

  const { user, loading: userLoading } = useCurrentUser();

  const getSessionToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const notify = (message) => {
    setNotification(message);
  };

  const fetchAll = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const token = await getSessionToken();

      const { data: prodResponse, error: prodError } =
        await supabase.functions.invoke("get-products", {
          body: { user_id: user.id },
          headers: { Authorization: `Bearer ${token}` },
        });

      if (prodError) throw new Error(prodError.message);
      setProducts(prodResponse?.products || []);

      const { data: menuResponse, error: menuError } =
        await supabase.functions.invoke("get-todays-menu", {
          headers: { Authorization: `Bearer ${token}` },
        });

      if (menuError) throw new Error(menuError.message);

      setMenuItems(menuResponse?.todays_menu || []);
    } catch (error) {
      console.error("FetchAll Error:", error.message);
      notify(`Failed to fetch: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading || !user) return;

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

  const addToMenu = async (productId, productName) => {
    try {
      const token = await getSessionToken();

      const { data, error } = await supabase.functions.invoke("add-menu", {
        body: { product_id: productId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw new Error(error.message);

      setMenuItems((prev) => [...prev, data.menu_item]);
      notify(`Added ${productName} to menu.`);
    } catch (error) {
      console.error("Add Menu Error:", error.message);
      notify(error.message);
    }
  };

  const removeFromMenu = async (rowId, productName) => {
    try {
      const token = await getSessionToken();

      const { error } = await supabase.functions.invoke("remove-menu", {
        body: { id: rowId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw new Error(error.message);

      setMenuItems((prev) => prev.filter((item) => item.id !== rowId));
      notify(`Removed ${productName}.`);
    } catch (error) {
      console.error("Remove Menu Error:", error.message);
      notify(error.message);
    }
  };

  const grouped = useMemo(
    () =>
      products.reduce((acc, product) => {
        const category = product.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      }, {}),
    [products]
  );

  const categories = useMemo(() => ["All", ...Object.keys(grouped)], [grouped]);
  const normalizedSearch = search.trim().toLowerCase();
  const shouldShowResults = normalizedSearch.length > 0;

  const filteredProducts = useMemo(() => {
    if (!shouldShowResults) return [];

    return (activeCategory === "All" ? products : grouped[activeCategory] || []).filter(
      (product) =>
        product.name?.toLowerCase().includes(normalizedSearch) ||
        (product.category || "").toLowerCase().includes(normalizedSearch)
    );
  }, [activeCategory, grouped, normalizedSearch, products, shouldShowResults]);

  if (loading || userLoading) {
    return <p className="mt-6 text-center text-foreground">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <Notification
        message={notification}
        onClose={() => setNotification(null)}
      />

      <main className="px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-4 lg:gap-6">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-primary sm:text-3xl">
                  Inventory
                </h1>
                <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Search and manage today&apos;s menu-ready products
                </p>
              </div>

              {user && (
                <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                  Dev: {user.name || "Unknown"} (ID: {user.id})
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row">
              <div className="w-full lg:flex-1">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 lg:max-w-[55%]">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`h-12 whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${
                      activeCategory === category
                        ? "bg-primary text-primary-foreground border-border"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            {!shouldShowResults ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-background p-6 text-center">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Search to reveal inventory items.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The list stays hidden by default so long product catalogs remain usable on mobile.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const exists = menuItems.find((item) => item.product_id === product.id);

                  return (
                    <div
                      key={product.id}
                      className="flex flex-col justify-between rounded-2xl border border-border bg-background p-4"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Qty: {product.quantity}
                        </p>
                        <p className="mt-2 text-sm font-bold text-primary">
                          Rs {product.price}
                        </p>
                      </div>

                      {exists ? (
                        <Button
                          onClick={() => removeFromMenu(exists.id, product.name)}
                          variant="danger"
                          className="mt-4"
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          onClick={() => addToMenu(product.id, product.name)}
                          className="mt-4"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Inventory;
