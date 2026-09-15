"use client";

import React, { useState, useCallback, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
}

interface Offer {
  id: number;
  name: string;
  description: string;
  product_ids: number[];
  is_active: boolean;
  is_recurring: boolean;
  discount_type: string;
  discount_value: number;
  day_of_week: number | null;
  start_date: string | null;
  end_date: string | null;
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const initialFormState = {
  id: null as number | null,
  name: "",
  description: "",
  product_ids: [] as number[],
  start_date: "",
  end_date: "",
  discount_type: "percentage",
  discount_value: "",
  is_recurring: false,
  day_of_week: "",
  is_active: true,
};

const OfferManager = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [form, setForm] = useState(initialFormState);
  const [message, setMessage] = useState("");

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data.products || []);
  }, []);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/offers");
    const data = await res.json();
    setOffers(data.offers || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, [fetchOffers, fetchProducts]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (id: number) => {
    setForm((prev) => {
      const exists = prev.product_ids.includes(id);
      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((pid) => pid !== id)
          : [...prev.product_ids, id],
      };
    });
  };

  const selectAllFiltered = () => {
    setForm((prev) => ({
      ...prev,
      product_ids: Array.from(
        new Set([...prev.product_ids, ...filteredProducts.map((p) => p.id)])
      ),
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : undefined;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      id: form.id,
      name: form.name,
      description: form.description,
      product_ids: form.product_ids,
      is_active: form.is_active,
      is_recurring: form.is_recurring,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      day_of_week: form.is_recurring
        ? form.day_of_week === ""
          ? null
          : Number(form.day_of_week)
        : null,
      start_date: form.is_recurring ? null : form.start_date || null,
      end_date: form.is_recurring ? null : form.end_date || null,
    };

    const res = await fetch("/api/offers", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setForm(initialFormState);
      fetchOffers();
      setMessage("Offer saved successfully.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEdit = (offer: Offer) => {
    setForm({
      id: offer.id,
      name: offer.name,
      description: offer.description,
      product_ids: offer.product_ids,
      start_date: offer.start_date || "",
      end_date: offer.end_date || "",
      discount_type: offer.discount_type,
      discount_value: String(offer.discount_value || ""),
      is_recurring: offer.is_recurring,
      day_of_week: offer.day_of_week != null ? String(offer.day_of_week) : "",
      is_active: offer.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this offer?")) return;
    await fetch(`/api/offers?id=${id}`, { method: "DELETE" });
    fetchOffers();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-background min-h-screen text-foreground">
      <header className="mb-8 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            OFFER MANAGER
          </h1>
          <p className="text-muted-foreground uppercase text-xs tracking-widest mt-1">
            Campaigns &amp; Promotions
          </p>
        </div>
        <div className="text-right">
          <input
            type="text"
            placeholder="Search Offers..."
            className="p-2 border-2 border-border rounded-md text-sm bg-card w-64 outline-none focus:border-primary"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {message && (
        <div className="mb-6 p-4 rounded-md text-center font-bold border-2 border-border bg-secondary text-secondary-foreground">
          {message}
        </div>
      )}

      <section className="bg-card border-2 border-border rounded-xl shadow-xl overflow-hidden mb-10">
        <div className="bg-primary text-primary-foreground p-4 font-bold uppercase tracking-tight">
          {form.id ? "Modify Existing Offer" : "Create New Promotion"}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Campaign Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full p-3 border-2 border-muted bg-background rounded-lg focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border-2 border-muted bg-background rounded-lg focus:border-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Type
                </label>
                <select
                  name="discount_type"
                  value={form.discount_type}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-muted bg-background rounded-lg outline-none"
                >
                  <option value="percentage">Percent (%)</option>
                  <option value="fixed">Fixed (INR)</option>
                  <option value="bogo">Buy One Get One (BOGO)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Value
                </label>
                <input
                  name="discount_value"
                  type="number"
                  value={form.discount_value}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-muted bg-background rounded-lg outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-muted rounded-lg border border-border">
              <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={form.is_recurring}
                  onChange={handleChange}
                  className="w-5 h-5 accent-primary"
                />
                RECURRING
              </label>
              <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="w-5 h-5 accent-primary"
                />
                ACTIVE
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <label className="block text-xs font-bold uppercase mb-2">
                Apply to Products
              </label>
              <input
                placeholder="Filter products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full p-2 border-2 border-border mb-2 rounded bg-background text-sm outline-none focus:border-primary"
              />
              <div className="max-h-32 overflow-y-auto border border-border rounded bg-background">
                {filteredProducts.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={form.product_ids.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">
                      {p.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        {p.price}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="mt-2 text-[10px] font-bold uppercase text-primary underline"
              >
                Select All Visible
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Scheduling
              </label>
              {form.is_recurring ? (
                <select
                  name="day_of_week"
                  value={form.day_of_week}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-muted bg-background rounded-lg outline-none"
                  required
                >
                  <option value="">Select Day...</option>
                  {dayNames.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="flex-1 p-3 border-2 border-muted bg-background rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className="flex-1 p-3 border-2 border-muted bg-background rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            <button className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-lg hover:opacity-90">
              {form.id ? "Save Changes" : "Create Offer"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={() => setForm(initialFormState)}
                className="w-full text-xs font-bold uppercase text-muted-foreground"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <div className="space-y-4">
        <h3 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
          Existing Campaigns
          <span className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">
            {offers.length}
          </span>
        </h3>

        {loading ? (
          <div className="p-10 text-center animate-pulse font-bold text-muted-foreground">
            FETCHING RECORDS...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {offers
              .filter((o) =>
                o.name.toLowerCase().includes(search.toLowerCase())
              )
              .map((offer) => (
                <div
                  key={offer.id}
                  className="group bg-card border-2 border-border hover:border-primary rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center transition-all shadow-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-black text-lg uppercase">
                        {offer.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          offer.is_active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {offer.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {offer.description || "No description provided."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-md font-bold text-xs">
                        {offer.discount_value}
                        {offer.discount_type === "percentage" ? "%" : ""} OFF
                      </span>
                      <span className="bg-muted border border-border px-3 py-1 rounded-md font-bold text-xs uppercase">
                        {offer.is_recurring
                          ? `Weekly: ${dayNames[offer.day_of_week || 0]}`
                          : `${offer.start_date || "Live"} - ${offer.end_date || "\u221E"}`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex gap-2">
                    <button
                      onClick={() => handleEdit(offer)}
                      className="p-2 px-4 rounded-lg border-2 border-muted hover:border-primary font-bold text-sm uppercase"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="p-2 px-4 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm uppercase hover:opacity-90"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferManager;
