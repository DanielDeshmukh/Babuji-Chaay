"use client";

import React, { useEffect, useState } from "react";
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

  // ✅ Authenticate user with Supabase
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setMessage("❌ Authentication required to manage inventory.");
      }
    };
    fetchUser();
  }, []);

  // ✅ Fetch all products
 const fetchProducts = async () => {
  if (!userId) return;

  setLoading(true);
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: true });

    if (error) throw error;
    setProducts(data);
  } catch (err) {
    console.error("Error fetching products:", err);
  } finally {
    setLoading(false);
  }
};


useEffect(() => {
  if (userId) {
    fetchProducts();
  }
}, [userId]);


  // ✅ Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "price" ? Number(value) : value,
    }));
  };

  // ✅ Create or update a product
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setMessage("❌ You must be logged in to modify inventory.");
      return;
    }

    try {
      if (form.id) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update({
            name: form.name,
            category: form.category,
            quantity: form.quantity,
            price: form.price,
          })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        // Insert new product
        const { error } = await supabase.from("products").insert([{
  user_id: userId,
  name: form.name,
  category: form.category,
  quantity: form.quantity,
  price: form.price,
}]);

        if (error) throw error;
      }
      setForm({ id: null, name: "", category: "", quantity: 0, price: 0 });
      fetchProducts();
      setMessage("✅ Product saved successfully!");
    } catch (err) {
      console.error("Error saving product:", err);
      setMessage("❌ Failed to save product.");
    }
  };

  // ✅ Edit product
  const handleEdit = (product) => {
    setForm(product);
  };

  // ✅ Delete product
  const handleDelete = async (id) => {
    if (!userId) {
      setMessage("❌ You must be logged in to delete products.");
      return;
    }

    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      fetchProducts();
      setMessage("🗑️ Product deleted successfully.");
    } catch (err) {
      console.error("Error deleting product:", err);
      setMessage("❌ Failed to delete product.");
    }
  };

  // ✅ Group and filter products
  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const categories = ["All", ...Object.keys(groupedProducts)];

  const getFilteredProducts = () => {
    if (search.trim() === "" && activeCategory === "All") {
      return [];
    }

    const baseList =
      activeCategory === "All"
        ? products
        : groupedProducts[activeCategory] || [];

    if (search.trim() === "") {
      return baseList;
    }

    return baseList.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  };

  const filteredProducts = getFilteredProducts();
  const hasFiltered = search.trim() !== "" || activeCategory !== "All";

  // ✅ Render
  return (
    <div className="flex flex-col bg-background text-foreground transition-colors duration-300 p-4 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Inventory Manager</h2>

      {message && (
        <p
          className={`mb-4 text-sm ${
            message.startsWith("❌") ? "text-red-500" : "text-green-500"
          }`}
        >
          {message}
        </p>
      )}

      {/* Product Form */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm"
      >
        <h3 className="text-lg font-semibold mb-4">
          {form.id ? "Edit Product" : "Add New Product"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Product Name"
            className="p-2 rounded border border-border bg-background text-foreground"
            required
          />
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="Category"
            className="p-2 rounded border border-border bg-background text-foreground"
          />
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            placeholder="Quantity"
            className="p-2 rounded border border-border bg-background text-foreground"
            required
            min="0"
          />
          <input
            type="number"
            step="0.01"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="Price"
            className="p-2 rounded border border-border bg-background text-foreground"
            required
            min="0"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            {form.id ? "Update Product" : "Add Product"}
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({
                id: null,
                name: "",
                category: "",
                quantity: 0,
                price: 0,
              })
            }
            className="px-4 py-2 rounded-md bg-muted text-muted-foreground hover:bg-muted/90 transition-colors font-medium"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Search */}
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-4 rounded-lg border border-border focus:ring-2 focus:ring-accent focus:outline-none bg-card text-foreground placeholder-muted-foreground"
      />

      {/* Category Filter */}
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

      {/* Products Table */}
      {loading ? (
        <p className="text-center mt-6">Loading products...</p>
      ) : (
        <div className="overflow-x-auto">
          {!hasFiltered ? (
            <p className="text-center mt-6 text-muted-foreground">
              Please search or select a category to see products.
            </p>
          ) : filteredProducts.length > 0 ? (
            <table className="w-full border-collapse border border-border rounded-lg bg-card text-foreground">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="p-3 text-left font-semibold">ID</th>
                  <th className="p-3 text-left font-semibold">Name</th>
                  <th className="p-3 text-left font-semibold">Category</th>
                  <th className="p-3 text-left font-semibold">Quantity</th>
                  <th className="p-3 text-left font-semibold">Price</th>
                  <th className="p-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border hover:bg-muted"
                  >
                    <td className="p-3">{product.id}</td>
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3">
                      {product.category || "Uncategorized"}
                    </td>
                    <td className="p-3">{product.quantity}</td>
                    <td className="p-3">₹{product.price.toFixed(2)}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="px-3 py-1 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="px-3 py-1 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center mt-6 text-muted-foreground">
              No products match your search or filter.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
