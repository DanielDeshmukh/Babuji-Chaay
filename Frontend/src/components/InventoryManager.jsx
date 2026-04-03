"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const InventoryManager = () => {
  const [userId, setUserId] = useState(null);
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [form, setForm] = useState({
    id: null,
    name: "",
    category: "",
    quantity: 0,
    price: 0,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      } else {
        setMessage("Authentication required to manage inventory.");
      }
    };

    fetchUser();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchProducts();
    }
  }, [userId, fetchProducts]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "price" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId) return;

    try {
      const payload = {
        user_id: userId,
        name: form.name,
        category: form.category || "Uncategorized",
        quantity: form.quantity,
        price: form.price,
      };

      const { error } = form.id
        ? await supabase.from("products").update(payload).eq("id", form.id)
        : await supabase.from("products").insert([payload]);

      if (error) throw error;

      setForm({ id: null, name: "", category: "", quantity: 0, price: 0 });
      fetchProducts();
      setMessage("Inventory updated successfully.");
      window.setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error(error);
      setMessage("Failed to save product.");
    }
  };

  const handleEdit = (product) => {
    setForm(product);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product from inventory?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) fetchProducts();
  };

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category || "Uncategorized"))],
    [products]
  );

  const normalizedSearch = search.trim().toLowerCase();
  const shouldShowResults = normalizedSearch.length > 0;

  const filteredProducts = useMemo(() => {
    if (!shouldShowResults) return [];

    return products.filter((product) => {
      const category = product.category || "Uncategorized";
      const matchesSearch =
        product.name.toLowerCase().includes(normalizedSearch) ||
        category.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        activeCategory === "All" || category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, normalizedSearch, products, shouldShowResults]);

  return (
    <div className="min-h-0 text-amber-50">
      <header className="mb-6 flex flex-col gap-3 border-b border-emerald-900/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-amber-200 sm:text-3xl">
            Inventory
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-100/60">
            Stock and Catalog Management
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 sm:text-right">
          <span className="text-2xl font-black text-amber-300 sm:text-3xl">
            {products.length}
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-100/55">
            Total SKUs
          </p>
        </div>
      </header>

      {message && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm font-semibold text-amber-100">
          {message}
        </div>
      )}

      {userId && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="min-w-0">
            <form
              onSubmit={handleSubmit}
              className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-5 xl:sticky xl:top-6"
            >
              <h3 className="border-b border-emerald-900/70 pb-3 text-sm font-black uppercase tracking-[0.24em] text-amber-200">
                {form.id ? "Update Item" : "New Product"}
              </h3>

              <div className="space-y-4">
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Product Name"
                  required
                />

                <Input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Category"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="Qty"
                    className="font-semibold"
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="Rs Price"
                    className="font-semibold text-amber-200"
                    required
                  />
                </div>

                <Button type="submit" className="mt-2 uppercase tracking-[0.24em]">
                  {form.id ? "Save Changes" : "Add to Stock"}
                </Button>
              </div>
            </form>
          </div>

          <div className="min-w-0 space-y-4">
            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">
                    Find Inventory
                  </p>
                  <p className="mt-1 text-sm text-emerald-100/60">
                    Search to reveal matching products. The list stays hidden until you type.
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-amber-100/75">
                  {shouldShowResults ? `${filteredProducts.length} matches` : "Search to show"}
                </div>
              </div>

              <div className="mt-4">
                <Input
                  type="text"
                  placeholder="Search Inventory..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
                      activeCategory === category
                        ? "border-amber-400 bg-amber-400 text-slate-950"
                        : "border-white/10 bg-slate-900 text-emerald-100/70 hover:border-amber-400/50"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-4">
              {loading ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm font-semibold text-emerald-100/65">
                  Loading inventory...
                </div>
              ) : !shouldShowResults ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-emerald-900/70 bg-slate-900/70 p-6 text-center">
                  <div>
                    <p className="text-sm font-semibold text-amber-100">
                      Start typing in the search box to view inventory results.
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-emerald-100/45">
                      Search-to-show keeps long catalogs manageable on mobile.
                    </p>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm font-semibold text-emerald-100/65">
                  No products match your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredProducts.map((product) => (
                    <article
                      key={product.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/90 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black uppercase tracking-wide text-amber-100">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald-100/50">
                            {product.category || "Uncategorized"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                              product.quantity <= 5
                                ? "bg-rose-500/20 text-rose-200"
                                : "bg-emerald-500/15 text-emerald-100"
                            }`}
                          >
                            Stock: {product.quantity}
                          </span>
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-200">
                            Rs {product.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleEdit(product)}
                          className="uppercase tracking-[0.2em]"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleDelete(product.id)}
                          className="uppercase tracking-[0.2em]"
                        >
                          Delete
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
