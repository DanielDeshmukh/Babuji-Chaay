import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

const InventoryManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [form, setForm] = useState({ id: null, name: "", category: "", quantity: 0, price: 0 });

  // Fetch all products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
      if (error) throw error;
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "quantity" || name === "price" ? Number(value) : value }));
  };

  // Handle creating/updating product
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update({ name: form.name, category: form.category, quantity: form.quantity, price: form.price })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        // Insert new product
        const { error } = await supabase
          .from("products")
          .insert([{ name: form.name, category: form.category, quantity: form.quantity, price: form.price }]);
        if (error) throw error;
      }
      setForm({ id: null, name: "", category: "", quantity: 0, price: 0 });
      fetchProducts();
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };

  // Handle edit button
  const handleEdit = (product) => {
    setForm(product);
  };

  // Handle delete product
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const categories = ["All", ...Object.keys(groupedProducts)];

  // Filter products based on category and search
  const filteredProducts =
    activeCategory === "All"
      ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      : (groupedProducts[activeCategory] || []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col bg-background text-foreground transition-colors duration-300 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Inventory Manager</h2>

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

      {/* Product Form */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col gap-3"
      >
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
        />
        <button
          type="submit"
          className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
        >
          {form.id ? "Update Product" : "Add Product"}
        </button>
      </form>

      {/* Products Table */}
      {loading ? (
        <p className="text-center mt-6">Loading products...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border rounded-lg bg-card text-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Quantity</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-border">
                  <td className="p-2">{product.id}</td>
                  <td className="p-2">{product.name}</td>
                  <td className="p-2">{product.category || "Uncategorized"}</td>
                  <td className="p-2">{product.quantity}</td>
                  <td className="p-2">₹{product.price.toFixed(2)}</td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-3 py-1 bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
