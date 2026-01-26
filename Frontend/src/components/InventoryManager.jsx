"use client";

import React, { useEffect, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";

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

  // AUTHENTICATION
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setMessage("❌ Authentication required to manage inventory.");
      }
    };
    fetchUser();
  }, []);

  // FETCH PRODUCTS
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchProducts();
  }, [userId, fetchProducts]);

  // FORM HANDLING
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "price" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      setMessage("✅ Inventory updated successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("❌ Failed to save product.");
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

  // CATEGORY LOGIC
  const categories = ["All", ...new Set(products.map((p) => p.category || "Uncategorized"))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || (p.category || "Uncategorized") === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-5xl mx-auto p-6 bg-background min-h-screen">
      {/* HEADER */}
      <header className="mb-8 border-b-4 border-primary pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">INVENTORY</h1>
          <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Stock & Catalog Management</p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-3xl font-black text-primary">{products.length}</span>
          <p className="text-[10px] font-bold uppercase">Total SKUs</p>
        </div>
      </header>

      {message && (
        <div className={`mb-6 p-4 font-bold text-center border-2 ${message.includes('❌') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {message}
        </div>
      )}

      {userId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: FORM COLUMN */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="sticky top-6 bg-card border-2 border-border p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-black uppercase mb-4 pb-2 border-b border-border">
                {form.id ? "Update Item" : "New Product"}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Product Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-muted bg-background rounded focus:border-primary outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Category</label>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-muted bg-background rounded outline-none"
                    placeholder="e.g. Beverages"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Stock Qty</label>
                    <input
                      type="number"
                      name="quantity"
                      value={form.quantity}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-muted bg-background rounded outline-none font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-muted bg-background rounded outline-none font-bold text-primary"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <button type="submit" className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded hover:bg-primary/90 transition-all">
                    {form.id ? "Save Changes" : "Add to Stock"}
                  </button>
                  {form.id && (
                    <button 
                      type="button" 
                      onClick={() => setForm({ id: null, name: "", category: "", quantity: 0, price: 0 })}
                      className="w-full py-2 text-xs font-bold text-muted-foreground uppercase border border-transparent hover:border-muted rounded"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT: LIST COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search & Filters */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="SEARCH INVENTORY..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-4 border-2 border-border rounded-xl bg-card font-bold placeholder:text-muted-foreground outline-none focus:border-primary"
              />
              
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border-2 ${
                      activeCategory === cat
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-card border-2 border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-muted border-b-2 border-border">
                    <th className="p-4 font-black uppercase text-[10px]">Product</th>
                    <th className="p-4 font-black uppercase text-[10px]">Category</th>
                    <th className="p-4 font-black uppercase text-[10px] text-center">Stock</th>
                    <th className="p-4 font-black uppercase text-[10px] text-right">Price</th>
                    <th className="p-4 font-black uppercase text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan="5" className="p-10 text-center font-bold animate-pulse">SYNCHRONIZING DATA...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan="5" className="p-10 text-center text-muted-foreground">No items found matching your criteria.</td></tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="p-4">
                          <div className="font-black uppercase">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">ID: {p.id}</div>
                        </td>
                        <td className="p-4 text-xs font-bold uppercase text-muted-foreground">
                          {p.category || "Uncategorized"}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded font-black text-xs ${p.quantity <= 5 ? 'bg-red-100 text-red-700' : 'bg-muted text-foreground'}`}>
                            {p.quantity}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-primary">
                          ₹{p.price.toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(p)} className="p-1 text-primary hover:underline font-bold text-[10px] uppercase">Edit</button>
                            <button onClick={() => handleDelete(p.id)} className="p-1 text-destructive hover:underline font-bold text-[10px] uppercase">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;