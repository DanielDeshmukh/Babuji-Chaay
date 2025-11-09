import React, { useEffect, useState, useMemo,forwardRef } from "react";
import supabase from "../lib/supabaseClient";

const OfferManager = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const NoKeyboardInput = forwardRef(({ value, onClick, placeholder, className }, ref) => (
  <input
    ref={ref}
    value={value || ""}
    onClick={(e) => {
      e.preventDefault();
      onClick?.(e);
    }}
    onFocus={(e) => e.target.blur()}
    readOnly
    data-no-keyboard
    placeholder={placeholder}
    className={className}
  />
));
const filteredProducts = useMemo(() => {
  return products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );
}, [productSearch, products]);

const toggleProduct = (id) => {
  setForm((prev) => {
    const alreadySelected = prev.product_ids.includes(id);
    return {
      ...prev,
      product_ids: alreadySelected
        ? prev.product_ids.filter((pid) => pid !== id)
        : [...prev.product_ids, id],
    };
  });
};

  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    product_ids: [],
    start_date: "",
    end_date: "",
  });

  // Fetch offers
  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("offers").select("*").order("id", { ascending: true });
      if (error) throw error;
      setOffers(data);
    } catch (err) {
      console.error("Error fetching offers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for multi-select
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  // Handle form input
  const handleChange = (e) => {
    const { name, value, type, selectedOptions } = e.target;
    if (name === "product_ids" && type === "select-multiple") {
      const selected = Array.from(selectedOptions).map((o) => Number(o.value));
      setForm((prev) => ({ ...prev, product_ids: selected }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Create or update offer
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        // Update
        const { error } = await supabase
          .from("offers")
          .update({
            name: form.name,
            description: form.description,
            product_ids: form.product_ids,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
          })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("offers")
          .insert([
            {
              name: form.name,
              description: form.description,
              product_ids: form.product_ids,
              start_date: form.start_date || null,
              end_date: form.end_date || null,
            },
          ]);
        if (error) throw error;
      }
      setForm({ id: null, name: "", description: "", product_ids: [], start_date: "", end_date: "" });
      fetchOffers();
    } catch (err) {
      console.error("Error saving offer:", err);
    }
  };

  // Edit offer
  const handleEdit = (offer) => {
    setForm({
      id: offer.id,
      name: offer.name,
      description: offer.description,
      product_ids: offer.product_ids || [],
      start_date: offer.start_date || "",
      end_date: offer.end_date || "",
    });
  };

  // Delete offer
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
      fetchOffers();
    } catch (err) {
      console.error("Error deleting offer:", err);
    }
  };

  const filteredOffers = offers.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col bg-background text-foreground transition-colors duration-300 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Offer Manager</h2>

     {/* Offer Form */}
<form
  onSubmit={handleSubmit}
  className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col gap-3"
>
  <input
    type="text"
    name="name"
    value={form.name}
    onChange={handleChange}
    placeholder="Offer Name"
    className="p-2 rounded border border-border bg-background text-foreground"
    required
  />
  <textarea
    name="description"
    value={form.description}
    onChange={handleChange}
    placeholder="Offer Description"
    className="p-2 rounded border border-border bg-background text-foreground"
    rows={3}
  />

  {/* Product Search */}
  <div>
    <label className="block text-sm mb-2 font-medium">Add Products to Offer</label>
    <input
      type="text"
      placeholder="Search products..."
      value={productSearch}
      onChange={(e) => setProductSearch(e.target.value)}
      className="w-full p-2 mb-2 rounded border border-border bg-background text-foreground focus:ring-2 focus:ring-accent focus:outline-none"
    />

    {/* Filtered Search Results */}
    <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 bg-muted/30">
      {filteredProducts.length > 0 ? (
        filteredProducts.map((product) => (
          <label
            key={product.id}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={form.product_ids.includes(product.id)}
              onChange={() => toggleProduct(product.id)}
              data-no-keyboard
              className="accent-accent"
            />
            <span>
              {product.name}{" "}
              <span className="text-sm text-muted-foreground">₹{product.price}</span>
            </span>
          </label>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">No products found</p>
      )}
    </div>

    {/* Selected Product List */}
    {form.product_ids.length > 0 && (
      <div className="mt-3 border border-border rounded-md p-2 bg-background">
        <h4 className="text-sm font-medium mb-2">Products in Offer:</h4>
        <ul className="flex flex-wrap gap-2">
          {form.product_ids.map((pid) => {
            const product = products.find((p) => p.id === pid);
            return (
              <li
                key={pid}
                className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm flex items-center gap-2"
              >
                {product?.name || `Product ${pid}`}
                <button
                  type="button"
                  onClick={() => toggleProduct(pid)}
                  className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded hover:bg-red-600"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    )}
  </div>

  {/* Start and End Date */}
  <div className="flex gap-2">
    <div className="flex-1">
      <label className="block text-sm mb-1">Start Date</label>
      <input
        type="date"
        name="start_date"
        value={form.start_date}
        onChange={handleChange}
        className="p-2 rounded border border-border bg-background text-foreground w-full"
      />
    </div>
    <div className="flex-1">
      <label className="block text-sm mb-1">End Date</label>
      <input
        type="date"
        name="end_date"
        value={form.end_date}
        onChange={handleChange}
        className="p-2 rounded border border-border bg-background text-foreground w-full"
      />
    </div>
  </div>

  <button
    type="submit"
    className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
  >
    {form.id ? "Update Offer" : "Add Offer"}
  </button>
</form>


      {/* Offers Table */}
{loading ? (
  <p className="text-center mt-6">Loading offers...</p>
) : (
  <div className="overflow-x-auto w-full mt-4">
    <div className="min-w-[1000px] inline-block align-middle">
      <table className="min-w-full border-collapse border border-border rounded-lg bg-card text-foreground">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th className="p-2 text-left whitespace-nowrap">ID</th>
            <th className="p-2 text-left whitespace-nowrap">Name</th>
            <th className="p-2 text-left whitespace-nowrap">Description</th>
            <th className="p-2 text-left whitespace-nowrap">Products</th>
            <th className="p-2 text-left whitespace-nowrap">Duration</th>
            <th className="p-2 text-left whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredOffers.map((offer) => (
            <tr key={offer.id} className="border-b border-border hover:bg-muted/30">
              <td className="p-2">{offer.id}</td>
              <td className="p-2">{offer.name}</td>
              <td className="p-2">{offer.description}</td>
              <td className="p-2">
                {offer.product_ids
                  ?.map((pid) => products.find((p) => p.id === pid)?.name)
                  .filter(Boolean)
                  .join(", ") || "None"}
              </td>
              <td className="p-2">
                {offer.start_time ? new Date(offer.start_time).toLocaleString() : "-"} <br />
                to <br />
                {offer.end_time ? new Date(offer.end_time).toLocaleString() : "-"}
              </td>
              <td className="p-2 flex gap-2 whitespace-nowrap">
                <button
                  onClick={() => handleEdit(offer)}
                  className="px-3 py-1 bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
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
  </div>
)}

    </div>
  );
};

export default OfferManager;
