import React, { useEffect, useState, useMemo, forwardRef } from "react";
import supabase from "../lib/supabaseClient";

// Helper array for displaying day names
const dayNames = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

// Initial state for the form, used for creation and resetting
const initialFormState = {
  id: null,
  name: "",
  description: "",
  product_ids: [],
  start_date: "",
  end_date: "",
  discount_type: "percentage",
  discount_value: "",
  is_recurring: false,
  day_of_week: "",
  is_active: true,
};

const OfferManager = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [form, setForm] = useState(initialFormState);
  const [userId, setUserId] = useState(null);
  const [message, setMessage] = useState("");

  // ✅ Authenticate user using Supabase getUser
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error:", error);
        setMessage("⚠️ Error verifying user session.");
        return;
      }

      if (user) {
        setUserId(user.id);
      } else {
        setMessage("❌ Authentication required to manage offers.");
      }
    };
    fetchUser();
  }, []);

  // --- NoKeyboardInput (for UI consistency) ---
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

  // Fetch offers
  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("id", { ascending: true });
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
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
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

  // Handle form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Create or update offer
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setMessage("❌ Please log in before creating or editing offers.");
      return;
    }

    try {
      const payload = {
        name: form.name,
        description: form.description,
        product_ids: form.product_ids,
        is_active: form.is_active,
        is_recurring: form.is_recurring,
        discount_type: form.discount_type,
        discount_value: form.discount_value
          ? Number(form.discount_value)
          : null,
        day_of_week: form.is_recurring
          ? form.day_of_week === ""
            ? null
            : Number(form.day_of_week)
          : null,
        start_date: form.is_recurring ? null : form.start_date || null,
        end_date: form.is_recurring ? null : form.end_date || null,
      };

      if (form.id) {
        const { error } = await supabase
          .from("offers")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("offers").insert([payload]);
        if (error) throw error;
      }

      setForm(initialFormState);
      fetchOffers();
    } catch (err) {
      console.error("Error saving offer:", err);
    }
  };

  const handleEdit = (offer) => {
    setForm({
      id: offer.id,
      name: offer.name,
      description: offer.description,
      product_ids: offer.product_ids || [],
      start_date: offer.start_date || "",
      end_date: offer.end_date || "",
      discount_type: offer.discount_type || "percentage",
      discount_value: offer.discount_value || "",
      is_recurring: offer.is_recurring || false,
      day_of_week: offer.day_of_week ?? "",
      is_active: offer.is_active ?? true,
    });
  };

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

  const filteredOffers = offers.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  // --- UI ---
  return (
    <div className="flex flex-col bg-background text-foreground transition-colors duration-300 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Offer Manager</h2>

      {message && (
        <p className="mb-4 text-center text-sm text-red-500">{message}</p>
      )}

      {/* Block actions if not authenticated */}
      {!userId ? (
        <p className="text-center text-muted-foreground">
          Please log in to manage offers.
        </p>
      ) : (
        <>
          {/* --- Offer Form --- */}
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col gap-4"
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

            {/* --- Product Selection --- */}
            <div>
              <label className="block text-sm mb-2 font-medium">
                Add Products to Offer
              </label>
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full p-2 mb-2 rounded border border-border bg-background text-foreground focus:ring-2 focus:ring-accent focus:outline-none"
              />
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
                        <span className="text-sm text-muted-foreground">
                          ₹{product.price}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No products found
                  </p>
                )}
              </div>
            </div>

            {/* --- Discount Section --- */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm mb-1">Discount Type</label>
                <select
                  name="discount_type"
                  value={form.discount_type}
                  onChange={handleChange}
                  className="p-2 rounded border border-border bg-background text-foreground w-full"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm mb-1">Discount Value</label>
                <input
                  type="number"
                  name="discount_value"
                  value={form.discount_value}
                  onChange={handleChange}
                  placeholder="e.g., 50"
                  className="p-2 rounded border border-border bg-background text-foreground w-full"
                  required
                />
              </div>
            </div>

            {/* --- Offer Toggles --- */}
            <div className="flex gap-4 p-3 bg-muted/30 rounded-md">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_recurring"
                  data-no-keyboard
                  checked={form.is_recurring}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_recurring: e.target.checked,
                    }))
                  }
                  className="accent-accent h-4 w-4"
                />
                <span>Recurring Weekly Offer?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  data-no-keyboard
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="accent-accent h-4 w-4"
                />
                <span>Is Active?</span>
              </label>
            </div>

            {form.is_recurring ? (
              <div>
                <label className="block text-sm mb-1">Day of the Week</label>
                <select
                  name="day_of_week"
                  value={form.day_of_week}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      day_of_week: e.target.value,
                    }))
                  }
                  className="p-2 rounded border border-border bg-background text-foreground w-full"
                  required
                >
                  <option value="">Select a day...</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-4">
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
            )}

            <button
              type="submit"
              className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              {form.id ? "Update Offer" : "Add Offer"}
            </button>
          </form>

          {/* --- Offers Table --- */}
          {loading ? (
            <p className="text-center mt-6">Loading offers...</p>
          ) : (
            <div className="overflow-x-auto w-full mt-4">
              <div className="min-w-[1200px] inline-block align-middle">
                <table className="min-w-full border-collapse border border-border rounded-lg bg-card text-foreground">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="p-3 text-left whitespace-nowrap">Name</th>
                      <th className="p-3 text-left whitespace-nowrap">
                        Discount
                      </th>
                      <th className="p-3 text-left whitespace-nowrap">
                        Schedule
                      </th>
                      <th className="p-3 text-left whitespace-nowrap">
                        Status
                      </th>
                      <th className="p-3 text-left whitespace-nowrap">
                        Products
                      </th>
                      <th className="p-3 text-left whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOffers.map((offer) => (
                      <tr
                        key={offer.id}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="p-3 align-top">
                          <div className="font-medium">{offer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {offer.description}
                          </div>
                        </td>
                        <td className="p-3 align-top whitespace-nowrap font-medium">
                          {offer.discount_value}
                          {offer.discount_type === "percentage" ? "%" : "₹"}
                        </td>
                        <td className="p-3 align-top whitespace-nowrap">
                          {offer.is_recurring ? (
                            <span className="font-medium">
                              Every {dayNames[offer.day_of_week]}
                            </span>
                          ) : (
                            <span>
                              {offer.start_date || "Starts immediately"} <br />
                              to {offer.end_date || "No end date"}
                            </span>
                          )}
                        </td>
                        <td className="p-3 align-top">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              offer.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {offer.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-3 align-top max-w-xs">
                          {offer.product_ids
                            ?.map(
                              (pid) =>
                                products.find((p) => p.id === pid)?.name
                            )
                            .filter(Boolean)
                            .join(", ") || (
                            <span className="text-muted-foreground">
                              All Products
                            </span>
                          )}
                        </td>
                        <td className="p-3 align-top flex gap-2 whitespace-nowrap">
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
        </>
      )}
    </div>
  );
};

export default OfferManager;
