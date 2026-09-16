"use client";

import React, { useEffect, useState, useCallback } from "react";

interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  quantity: number;
  price: number;
}

const InventoryManager = () => {
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [form, setForm] = useState({
    id: null as number | null,
    name: "",
    category: "",
    description: "",
    quantity: 0,
    price: 0,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "quantity" || name === "price" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        id: form.id,
        name: form.name,
        category: form.category || "Uncategorized",
        description: form.description || "",
        quantity: form.quantity,
        price: form.price,
      };

      const res = await fetch("/api/products", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      setForm({ id: null, name: "", category: "", description: "", quantity: 0, price: 0 });
      fetchProducts();
      setMessage("Inventory updated successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Failed to save product.");
    }
  };

  const handleEdit = (product: Product) => {
    setForm(product);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product from inventory?")) return;
    const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchProducts();
  };

  const categories = [
    "All",
    ...new Set(products.map((p) => p.category || "Uncategorized")),
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "All" ||
      (p.category || "Uncategorized") === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-background min-h-screen text-foreground">
      <header className="mb-8 border-b-4 border-primary pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">INVENTORY</h1>
          <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">
            Stock &amp; Catalog Management
          </p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-3xl font-black text-primary">
            {products.length}
          </span>
          <p className="text-[10px] font-bold uppercase">Total SKUs</p>
        </div>
      </header>

      {message && (
        <div className="mb-6 p-4 font-bold text-center border-2 border-border bg-secondary text-secondary-foreground rounded">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

              <textarea
                name="description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description (optional)"
                rows={2}
                className="w-full p-3 border-2 border-muted bg-background rounded outline-none text-sm resize-none"
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
                  placeholder="Price"
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

        <div className="lg:col-span-2 space-y-6">
          <input
            type="text"
            placeholder="Search products to edit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-4 border-2 border-border rounded-xl bg-card font-bold outline-none focus:border-primary"
          />

          {search && (
            <>
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
                      <th className="p-4 text-[10px] font-black uppercase text-left">
                        Product
                      </th>
                      <th className="p-4 text-[10px] font-black uppercase text-left">
                        Category
                      </th>
                      <th className="p-4 text-[10px] font-black uppercase text-right">
                        Price
                      </th>
                      <th className="p-4 text-[10px] font-black uppercase text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="p-4 font-black uppercase">{p.name}</td>
                        <td className="p-4 text-xs text-muted-foreground uppercase">
                          {p.category || "Uncategorized"}
                        </td>
                        <td className="p-4 text-right font-black text-primary">
                          {p.price.toFixed(2)}
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
            </>
          )}

          {!search && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Type in the search bar to find and edit products</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;
