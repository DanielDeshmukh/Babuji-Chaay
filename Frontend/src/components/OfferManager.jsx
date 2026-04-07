"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        setMessage("Error verifying session.");
        return;
      }

      if (user) setUserId(user.id);
      else setMessage("Authentication required.");
    };

    fetchUser();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    setProducts(data || []);
  }, [userId]);

  const fetchOffers = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });

    setOffers(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchOffers();
      fetchProducts();
    }
  }, [userId, fetchOffers, fetchProducts]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.name.toLowerCase().includes(productSearch.toLowerCase())
      ),
    [productSearch, products]
  );

  const filteredOffers = useMemo(
    () =>
      offers.filter((offer) =>
        offer.name.toLowerCase().includes(search.toLowerCase())
      ),
    [offers, search]
  );

  const toggleProduct = (id) => {
    setForm((prev) => {
      const exists = prev.product_ids.includes(id);
      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((productId) => productId !== id)
          : [...prev.product_ids, id],
      };
    });
  };

  const selectAllFiltered = () => {
    setForm((prev) => ({
      ...prev,
      product_ids: Array.from(
        new Set([...prev.product_ids, ...filteredProducts.map((product) => product.id)])
      ),
    }));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      day_of_week: form.is_recurring
        ? form.day_of_week === ""
          ? null
          : Number(form.day_of_week)
        : null,
      start_date: form.is_recurring ? null : form.start_date || null,
      end_date: form.is_recurring ? null : form.end_date || null,
    };

    const { error } = form.id
      ? await supabase.from("offers").update(payload).eq("id", form.id)
      : await supabase.from("offers").insert([payload]);

    if (!error) {
      setForm(initialFormState);
      fetchOffers();
      setMessage("Offer saved successfully.");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEdit = (offer) => {
    setForm({
      ...offer,
      discount_value: offer.discount_value || "",
      day_of_week: offer.day_of_week ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this offer?")) return;
    await supabase.from("offers").delete().eq("id", id);
    fetchOffers();
  };

  return (
    <div className="min-h-0 text-foreground">
      <header className="mb-6 flex w-full flex-col gap-4 border-b border-border pb-4">
        <div className="min-w-0 w-full">
          <h1 className="text-2xl font-black tracking-tight text-primary sm:text-3xl">
            Offer Manager
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Campaigns and Promotions
          </p>
        </div>

        {userId && (
          <div className="w-full">
            <Input
              type="text"
              placeholder="Search Offers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        )}
      </header>

      {message && (
        <div className="mb-6 rounded-2xl border border-border bg-background p-4 text-center text-sm font-semibold text-foreground">
          {message}
        </div>
      )}

      {userId && (
        <>
          <section className="mb-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-background px-4 py-4 text-sm font-black uppercase tracking-[0.24em] text-primary sm:px-6">
              {form.id ? "Modify Existing Offer" : "Create New Promotion"}
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-6 p-4 sm:p-5"
            >
              <div className="min-w-0 space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Campaign Name
                  </label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="min-h-28 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Type
                    </label>
                    <select
                      name="discount_type"
                      value={form.discount_type}
                      onChange={handleChange}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="percentage">Percent (%)</option>
                      <option value="fixed">Fixed (Rs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Value
                    </label>
                    <Input
                      name="discount_value"
                      type="number"
                      value={form.discount_value}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-background p-4">
                  <label className="flex h-12 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      name="is_recurring"
                      checked={form.is_recurring}
                      onChange={handleChange}
                      className="accent-primary"
                    />
                    Recurring
                  </label>
                  <label className="flex h-12 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="accent-primary"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Apply to Products
                  </label>

                  <Input
                    placeholder="Filter products..."
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    className="mb-3"
                  />

                  <div className="max-h-56 overflow-y-auto rounded-2xl border border-border bg-card">
                    {filteredProducts.map((product) => (
                      <label
                        key={product.id}
                        className="flex min-h-12 items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={form.product_ids.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="accent-primary"
                        />
                        <span className="min-w-0 text-sm font-medium text-foreground">
                          {product.name}{" "}
                          <span className="font-normal text-primary">
                            Rs {product.price}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={selectAllFiltered}
                    variant="ghost"
                    className="mt-3 uppercase tracking-[0.2em]"
                  >
                    Select All Visible
                  </Button>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Scheduling
                  </label>

                  {form.is_recurring ? (
                    <select
                      name="day_of_week"
                      value={form.day_of_week}
                      onChange={handleChange}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select Day...</option>
                      {dayNames.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <Input
                        type="date"
                        name="start_date"
                        value={form.start_date}
                        onChange={handleChange}
                      />
                      <Input
                        type="date"
                        name="end_date"
                        value={form.end_date}
                        onChange={handleChange}
                      />
                    </div>
                  )}
                </div>

                <Button type="submit" className="uppercase tracking-[0.24em]">
                  {form.id ? "Save Changes" : "Create Offer"}
                </Button>

                {form.id && (
                  <Button
                    type="button"
                    onClick={() => setForm(initialFormState)}
                    variant="ghost"
                    className="uppercase tracking-[0.2em]"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </section>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-primary">
              Existing Campaigns
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                {offers.length}
              </span>
            </h3>

            {loading ? (
              <div className="rounded-3xl border border-border bg-card p-10 text-center font-bold text-muted-foreground animate-pulse">
                Fetching records...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <h4 className="break-words text-lg font-black uppercase text-foreground">
                          {offer.name}
                        </h4>
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                            offer.is_active
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {offer.is_active ? "Active" : "Paused"}
                        </span>
                      </div>

                      <p className="mb-3 break-words text-sm leading-6 text-muted-foreground">
                        {offer.description || "No description provided."}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-primary">
                          {offer.discount_value}
                          {offer.discount_type === "percentage" ? "%" : " Rs"} OFF
                        </span>
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold uppercase text-muted-foreground">
                          {offer.is_recurring
                            ? `Weekly: ${dayNames[offer.day_of_week]}`
                            : `${offer.start_date || "Live"} - ${offer.end_date || "Open"}`}
                        </span>
                      </div>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
                      <Button
                        onClick={() => handleEdit(offer)}
                        variant="secondary"
                        className="uppercase tracking-[0.2em]"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(offer.id)}
                        variant="danger"
                        className="uppercase tracking-[0.2em]"
                      >
                        Delete
                      </Button>
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
