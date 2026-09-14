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
    <div className="max-w-5xl mx-auto p-6 bg-background min-h-screen text-foreground">
      {/* HEADER */}
      <header className="mb-8 border-b-4 border-primary pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">INVENTORY</h1>
          <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">
            Stock & Catalog Management
          </p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-3xl font-black text-primary">
            {products.length}
          </span>
          <p className="text-[10px] font-bold uppercase">Total SKUs</p>
        </div>
      </header>

      {/* MESSAGE */}
      {message && (
        <div className="mb-6 p-4 font-bold text-center border-2 border-border bg-secondary text-secondary-foreground rounded">
          {message}
        </div>
      )}

      {userId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FORM */}
          <div className="lg:col-span-1">
            <form
              onSubmit={handleSubmit}
              className="sticky top-6 bg-card border-2 border-border p-6 rounded-xl shadow-sm"
            >
              <h3 className="text-lg font-black uppercase mb-4 pb-2 border-b border-border">
                {form.id ? "Update Item" : "New Product"}
              </h3>

              <div className="space-y-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Product Name"
                  className="w-full p-3 border-2 border-muted bg-background rounded focus:border-primary outline-none"
                  required
                />

                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Category"
                  className="w-full p-3 border-2 border-muted bg-background rounded outline-none"
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="Qty"
                    className="w-full p-3 border-2 border-muted bg-background rounded outline-none font-bold"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="₹ Price"
                    className="w-full p-3 border-2 border-muted bg-background rounded outline-none font-bold text-primary"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded hover:opacity-90 transition-all"
                >
                  {form.id ? "Save Changes" : "Add to Stock"}
                </button>
              </div>
            </form>
          </div>

          {/* LIST */}
          <div className="lg:col-span-2 space-y-6">
            <input
              type="text"
              placeholder="SEARCH INVENTORY..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-4 border-2 border-border rounded-xl bg-card font-bold outline-none focus:border-primary"
            />

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase border-2 transition-all ${
                    activeCategory === cat
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase">Product</th>
                    <th className="p-4 text-[10px] font-black uppercase">Category</th>
                    <th className="p-4 text-[10px] font-black uppercase text-center">Stock</th>
                    <th className="p-4 text-[10px] font-black uppercase text-right">Price</th>
                    <th className="p-4 text-[10px] font-black uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-4 font-black uppercase">{p.name}</td>
                      <td className="p-4 text-xs text-muted-foreground uppercase">
                        {p.category || "Uncategorized"}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded text-xs font-black ${
                            p.quantity <= 5
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {p.quantity}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-primary">
                        ₹{p.price.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-primary text-[10px] font-black uppercase mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-destructive text-[10px] font-black uppercase"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
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