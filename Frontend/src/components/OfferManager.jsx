"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  forwardRef,
  useCallback,
} from "react";
import supabase from "../lib/supabaseClient";

const dayNames = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

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

  // AUTH
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        setMessage("⚠️ Error verifying session.");
        return;
      }
      if (user) setUserId(user.id);
      else setMessage("❌ Authentication required.");
    };
    fetchUser();
  }, []);

  // FETCH DATA
  const fetchProducts = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", userId).order("name");
    setProducts(data || []);
  }, [userId]);

  const fetchOffers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("offers").select("*").eq("user_id", userId).order("id", { ascending: false });
    setOffers(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) { fetchOffers(); fetchProducts(); }
  }, [userId, fetchOffers, fetchProducts]);

  // LOGIC
  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [productSearch, products]);

  const toggleProduct = (id) => {
    setForm((prev) => {
      const exists = prev.product_ids.includes(id);
      return {
        ...prev,
        product_ids: exists ? prev.product_ids.filter((pid) => pid !== id) : [...prev.product_ids, id],
      };
    });
  };

  const selectAllFiltered = () => {
    setForm((prev) => ({
      ...prev,
      product_ids: Array.from(new Set([...prev.product_ids, ...filteredProducts.map(p => p.id)]))
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const payload = {
      user_id: userId,
      name: form.name,
      description: form.description,
      product_ids: form.product_ids,
      is_active: form.is_active,
      is_recurring: form.is_recurring,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      day_of_week: form.is_recurring ? (form.day_of_week === "" ? null : Number(form.day_of_week)) : null,
      start_date: form.is_recurring ? null : form.start_date || null,
      end_date: form.is_recurring ? null : form.end_date || null,
    };

    const { error } = form.id 
      ? await supabase.from("offers").update(payload).eq("id", form.id)
      : await supabase.from("offers").insert([payload]);

    if (!error) {
      setForm(initialFormState);
      fetchOffers();
      setMessage("✅ Offer saved successfully.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEdit = (offer) => {
    setForm({ ...offer, discount_value: offer.discount_value || "", day_of_week: offer.day_of_week ?? "" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this offer?")) return;
    await supabase.from("offers").delete().eq("id", id);
    fetchOffers();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-background min-h-screen">
      <header className="mb-8 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight">OFFER MANAGER</h1>
          <p className="text-muted-foreground uppercase text-xs tracking-widest mt-1">Campaigns & Promotions</p>
        </div>
        {userId && (
           <div className="text-right">
              <input 
                type="text" 
                placeholder="Search Offers..." 
                className="p-2 border rounded-md text-sm bg-card w-64"
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        )}
      </header>

      {message && (
        <div className={`mb-6 p-4 rounded-md text-center font-bold border ${message.includes('❌') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {message}
        </div>
      )}

      {userId && (
        <>
          {/* FORM CARD */}
          <section className="bg-card border-2 border-primary/10 rounded-xl shadow-xl overflow-hidden mb-10">
            <div className="bg-primary text-primary-foreground p-4 font-bold uppercase tracking-tight">
              {form.id ? "Modify Existing Offer" : "Create New Promotion"}
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Campaign Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-muted bg-background rounded-lg focus:border-primary outline-none transition-all"
                    placeholder="e.g., Happy Hour"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-muted bg-background rounded-lg focus:border-primary outline-none transition-all"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Type</label>
                    <select name="discount_type" value={form.discount_type} onChange={handleChange} className="w-full p-3 border-2 border-muted bg-background rounded-lg outline-none">
                      <option value="percentage">Percent (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Value</label>
                    <input name="discount_value" type="number" value={form.discount_value} onChange={handleChange} className="w-full p-3 border-2 border-muted bg-background rounded-lg outline-none" required />
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-muted rounded-lg border border-border">
                  <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                    <input type="checkbox" name="is_recurring" checked={form.is_recurring} onChange={handleChange} className="w-5 h-5 accent-primary" />
                    RECURRING
                  </label>
                  <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="w-5 h-5 accent-primary" />
                    ACTIVE
                  </label>
                </div>
              </div>

              {/* Right Column: Products & Schedule */}
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <label className="block text-xs font-bold uppercase mb-2">Apply to Products</label>
                  <input
                    placeholder="Filter products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full p-2 border mb-2 rounded bg-background text-sm"
                  />
                  <div className="max-h-32 overflow-y-auto border rounded bg-background">
                    {filteredProducts.map(p => (
                      <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-0">
                        <input type="checkbox" checked={form.product_ids.includes(p.id)} onChange={() => toggleProduct(p.id)} className="accent-primary" />
                        <span className="text-sm font-medium">{p.name} <span className="text-muted-foreground font-normal">₹{p.price}</span></span>
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={selectAllFiltered} className="mt-2 text-[10px] font-bold uppercase text-primary underline">Select All Visible</button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Scheduling</label>
                  {form.is_recurring ? (
                    <select name="day_of_week" value={form.day_of_week} onChange={handleChange} className="w-full p-3 border-2 border-muted bg-background rounded-lg outline-none" required>
                      <option value="">Select Day...</option>
                      {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className="flex-1 p-3 border-2 border-muted bg-background rounded-lg text-sm" />
                      <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className="flex-1 p-3 border-2 border-muted bg-background rounded-lg text-sm" />
                    </div>
                  )}
                </div>

                <button className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity">
                  {form.id ? "Save Changes" : "Create Offer"}
                </button>
                {form.id && (
                  <button type="button" onClick={() => setForm(initialFormState)} className="w-full text-xs font-bold uppercase text-muted-foreground">Cancel Edit</button>
                )}
              </div>
            </form>
          </section>

          {/* LIST SECTION */}
          <div className="space-y-4">
            <h3 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
              Existing Campaigns
              <span className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">{offers.length}</span>
            </h3>

            {loading ? (
              <div className="p-10 text-center animate-pulse font-bold text-muted-foreground">FETCHING RECORDS...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {offers.filter(o => o.name.toLowerCase().includes(search.toLowerCase())).map((offer) => (
                  <div key={offer.id} className="group bg-card border-2 border-border hover:border-primary rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center transition-all shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-black text-lg uppercase">{offer.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          {offer.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{offer.description || "No description provided."}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-md font-bold text-xs">
                          {offer.discount_value}{offer.discount_type === 'percentage' ? '%' : '₹'} OFF
                        </span>
                        <span className="bg-muted border border-border px-3 py-1 rounded-md font-bold text-xs text-foreground uppercase">
                          {offer.is_recurring ? `Weekly: ${dayNames[offer.day_of_week]}` : `${offer.start_date || 'Live'} - ${offer.end_date || '∞'}`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex gap-2">
                      <button onClick={() => handleEdit(offer)} className="p-2 px-4 rounded-lg border-2 border-muted hover:border-primary font-bold text-sm uppercase transition-all">Edit</button>
                      <button onClick={() => handleDelete(offer.id)} className="p-2 px-4 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-bold text-sm uppercase transition-all">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OfferManager;