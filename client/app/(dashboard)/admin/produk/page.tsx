"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { api } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Category {
  id: number | string;
  name: string;
}

interface Tenant {
  id: number | string;
  namaTenant?: string;
  outletName?: string;
}

interface Topping {
  namaTopping: string;
  harga: number | string;
}

interface HargaProduk {
  id?: number | string;
  qty: number | string;
  harga: number | string;
}

interface Product {
  id: number | string;
  namaProduk: string;
  categoryId: number | string;
  outletId?: number | string | null;
  outletIds?: string[] | string | null;
  tenantId?: number | string | null;
  keterangan?: string;
  produkImg?: string;
  category?: { name: string };
  outlet?: Tenant;
  tenant?: Tenant;
  tenants?: Tenant[];
  toppings?: Topping[];
  hargaproduks?: HargaProduk[];
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; type: string }>({
    message: "",
    type: "",
  });

  // State Form Kategori
  const [catForm, setCatForm] = useState<{ id: string | number; name: string }>({
    id: "",
    name: "",
  });

  // State Form Produk (Multi Outlet support: outletIds)
  const [prodForm, setProdForm] = useState<{
    id: string | number;
    namaProduk: string;
    categoryId: string | number;
    outletIds: (string | number)[];
    keterangan: string;
    toppings: Topping[];
    hargaproduks: HargaProduk[];
  }>({
    id: "",
    namaProduk: "",
    categoryId: "",
    outletIds: [], // Empty array = Semua Outlet
    keterangan: "",
    toppings: [{ namaTopping: "", harga: "" }],
    hargaproduks: [{ qty: "", harga: "" }],
  });

  // State File Gambar dari Device & Preview
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const showAlert = (message: string, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: "", type: "" }), 3000);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadTenants(), loadProducts()]);
    setLoading(false);
  };

  // ================= TENANT / OUTLET HANDLERS =================
  const loadTenants = async () => {
    try {
      const res = await api.get("/api/outlets/");
      const result = res.data;
      if (result.success) {
        setTenants(result.data);
      } else {
        console.error("Gagal memuat outlet:", result.message);
      }
    } catch (error) {
      console.error("Error pada loadTenants:", error);
    }
  };

  // ================= KATEGORI HANDLERS =================
  const loadCategories = async () => {
    try {
      const res = await api.get("/api/categories");
      const result = res.data;
      if (result.success) {
        setCategories(result.data);
      } else {
        console.error("Gagal memuat kategori:", result.message);
      }
    } catch (error) {
      console.error("Error pada loadCategories:", error);
      showAlert("Gagal memuat data kategori", "error");
    }
  };

  const handleCategorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      showAlert("Nama kategori tidak boleh kosong", "error");
      return;
    }
    setLoading(true);
    try {
      const res = catForm.id
        ? await api.put(`/api/categories/${catForm.id}`, { name: catForm.name })
        : await api.post("/api/categories", { name: catForm.name });
      const result = res.data;

      if (result.success) {
        showAlert(result.message || "Kategori berhasil disimpan");
        resetCatForm();
        loadCategories();
      } else {
        showAlert(result.message || "Gagal menyimpan kategori", "error");
      }
    } catch (error) {
      console.error("Error pada handleCategorySubmit:", error);
      showAlert("Gagal menyimpan kategori", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetCatForm = () => setCatForm({ id: "", name: "" });

  const handleEditCategory = (cat: Category) => {
    setCatForm({ id: String(cat.id), name: cat.name });
  };

  const handleDeleteCategory = async (id: number | string) => {
    if (!confirm("Hapus kategori ini?")) return;
    setLoading(true);
    try {
      const res = await api.delete(`/api/categories/${id}`);
      const result = res.data;
      if (result.success) {
        showAlert("Kategori berhasil dihapus");
        loadCategories();
      } else {
        showAlert(result.message, "error");
      }
    } catch (error) {
      console.error("Error pada handleDeleteCategory:", error);
      showAlert("Gagal menghapus kategori", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= PRODUK HANDLERS =================
  const loadProducts = async () => {
    try {
      const res = await api.get("/api/products/all");
      const result = res.data;
      if (result.success) {
        setProducts(result.data);
      } else {
        console.log("Gagal memuat produk:", result.message);
      }
    } catch (error) {
      console.error("Error pada loadProducts:", error);
      showAlert("Gagal memuat data produk", "error");
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handler Multi-Select Outlet
  const handleOutletToggle = (outletId: string | number) => {
    setProdForm((prev) => {
      const exists = prev.outletIds.includes(String(outletId));
      if (exists) {
        return {
          ...prev,
          outletIds: prev.outletIds.filter((id) => String(id) !== String(outletId)),
        };
      } else {
        return {
          ...prev,
          outletIds: [...prev.outletIds, String(outletId)],
        };
      }
    });
  };

  const handleSelectAllOutlets = () => {
    setProdForm((prev) => ({ ...prev, outletIds: [] }));
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prodForm.categoryId) {
      showAlert("Silakan pilih kategori terlebih dahulu", "error");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      formData.append("namaProduk", prodForm.namaProduk);
      formData.append("categoryId", String(prodForm.categoryId));
      formData.append("keterangan", prodForm.keterangan);

      // Kirim Array outletIds sebagai JSON String
      formData.append("outletIds", JSON.stringify(prodForm.outletIds));

      if (imageFile) {
        formData.append("produkImg", imageFile);
      }

      const formattedToppings = prodForm.toppings
        .filter((t) => t.namaTopping.trim() !== "")
        .map((t) => ({
          namaTopping: t.namaTopping,
          harga: Number(t.harga) || 0,
        }));
      formData.append("toppings", JSON.stringify(formattedToppings));

      const formattedHarga = prodForm.hargaproduks
        .filter((h) => h.qty && h.harga)
        .map((h) => ({
          ...(h.id ? { id: h.id } : {}),
          qty: Number(h.qty),
          harga: Number(h.harga) || 0,
        }));
      formData.append("hargaproduks", JSON.stringify(formattedHarga));

      const res = prodForm.id
        ? await api.put(`/api/products/${prodForm.id}`, formData)
        : await api.post("/api/products", formData);
      const result = res.data;

      if (result.success) {
        showAlert(result.message || "Produk berhasil disimpan");
        resetProdForm();
        loadProducts();
      } else {
        showAlert(result.message || "Gagal menyimpan produk", "error");
      }
    } catch (error) {
      console.error("Error pada handleProductSubmit:", error);
      showAlert("Gagal menyimpan produk", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetProdForm = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setProdForm({
      id: "",
      namaProduk: "",
      categoryId: "",
      outletIds: [],
      keterangan: "",
      toppings: [{ namaTopping: "", harga: "" }],
      hargaproduks: [{ qty: "", harga: "" }],
    });
    setImageFile(null);
    setImagePreview("");
  };

  const handleEditProduct = (prod: Product) => {
    let extractedOutletIds: string[] = [];

    if (prod.outletIds) {
      if (typeof prod.outletIds === "string") {
        try {
          extractedOutletIds = JSON.parse(prod.outletIds).map(String);
        } catch (e) {
          extractedOutletIds = [];
        }
      } else if (Array.isArray(prod.outletIds)) {
        extractedOutletIds = prod.outletIds.map(String);
      }
    } else if (prod.outletId) {
      extractedOutletIds = [String(prod.outletId)];
    } else if (prod.outlet?.id) {
      extractedOutletIds = [String(prod.outlet.id)];
    } else if (prod.tenants && prod.tenants.length > 0) {
      extractedOutletIds = prod.tenants.map((t) => String(t.id));
    }

    setProdForm({
      id: prod.id,
      namaProduk: prod.namaProduk,
      categoryId: prod.categoryId || "",
      outletIds: extractedOutletIds,
      keterangan: prod.keterangan || "",
      toppings: prod.toppings?.length
        ? prod.toppings
        : [{ namaTopping: "", harga: "" }],
      hargaproduks: prod.hargaproduks?.length
        ? prod.hargaproduks
        : [{ qty: "", harga: "" }],
    });
    setImageFile(null);

    if (prod.produkImg) {
      const imgUrl = prod.produkImg.startsWith("http")
        ? prod.produkImg
        : `${API_BASE_URL}/uploads/${prod.produkImg}`;
      setImagePreview(imgUrl);
    } else {
      setImagePreview("");
    }
  };

  const handleDeleteProduct = async (id: number | string) => {
    if (!confirm("Hapus produk ini beserta data relasinya?")) return;
    setLoading(true);
    try {
      const res = await api.delete(`/api/products/${id}`);
      const result = res.data;
      if (result.success) {
        showAlert("Produk berhasil dihapus");
        loadProducts();
      } else {
        showAlert(result.message, "error");
      }
    } catch (error) {
      console.error("Error pada handleDeleteProduct:", error);
      showAlert("Gagal menghapus produk", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicChange = (
    type: "toppings" | "hargaproduks",
    index: number,
    field: string,
    value: string
  ) => {
    if (type === "toppings") {
      const updated = prodForm.toppings.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      setProdForm((prev) => ({ ...prev, toppings: updated }));
    } else {
      const updated = prodForm.hargaproduks.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      setProdForm((prev) => ({ ...prev, hargaproduks: updated }));
    }
  };

  const addDynamicField = (
    type: "toppings" | "hargaproduks",
    defaultObj: Topping | HargaProduk
  ) => {
    if (type === "toppings") {
      setProdForm((prev) => ({
        ...prev,
        toppings: [...prev.toppings, defaultObj as Topping],
      }));
    } else {
      setProdForm((prev) => ({
        ...prev,
        hargaproduks: [...prev.hargaproduks, defaultObj as HargaProduk],
      }));
    }
  };

  const removeDynamicField = (
    type: "toppings" | "hargaproduks",
    index: number
  ) => {
    if (type === "toppings") {
      const updated = prodForm.toppings.filter((_, i) => i !== index);
      setProdForm((prev) => ({ ...prev, toppings: updated }));
    } else {
      const updated = prodForm.hargaproduks.filter((_, i) => i !== index);
      setProdForm((prev) => ({ ...prev, hargaproduks: updated }));
    }
  };

  // Helper Render Badges Outlet di Tabel
  const renderOutletBadges = (prod: Product) => {
    let ids: string[] = [];

    if (prod.outletIds) {
      if (typeof prod.outletIds === "string") {
        try {
          ids = JSON.parse(prod.outletIds).map(String);
        } catch (e) {
          ids = [];
        }
      } else if (Array.isArray(prod.outletIds)) {
        ids = prod.outletIds.map(String);
      }
    } else if (prod.outletId) {
      ids = [String(prod.outletId)];
    }

    if (ids.length === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Semua Outlet
        </span>
      );
    }

    const matchedTenants = tenants.filter((t) => ids.includes(String(t.id)));

    if (matchedTenants.length === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Semua Outlet
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {matchedTenants.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
          >
            {t.outletName || t.namaTenant || `Outlet #${t.id}`}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-2xs">
        <div>
          <h1 className="text-base md:text-xl font-bold text-[#212121]">
            Produk & Kategori
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manajemen produk, outlet, dan kategori
          </p>
        </div>
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("products")}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all ${activeTab === "products"
                ? "bg-white text-[#212121] shadow-xs"
                : "text-zinc-400"
              }`}
          >
            Produk ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all ${activeTab === "categories"
                ? "bg-white text-[#212121] shadow-xs"
                : "text-zinc-400"
              }`}
          >
            Kategori ({categories.length})
          </button>
        </div>
      </div>

      {alert.message && (
        <div
          className={`flex items-center px-4 py-3 rounded-2xl border text-xs font-semibold shadow-2xs ${alert.type === "error"
              ? "bg-red-50 border-red-100 text-[#E52424]"
              : "bg-emerald-50 border-emerald-100 text-emerald-600"
            }`}
        >
          {alert.message}
        </div>
      )}

      {/* TAB PRODUK */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* FORM PRODUK */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#212121]">
                {prodForm.id ? "Edit Data Produk" : "Tambah Produk Baru"}
              </h2>
              {prodForm.id && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600">
                  Mode edit
                </span>
              )}
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">
                  Nama Produk
                </label>
                <input
                  type="text"
                  placeholder="misal: Dimsum Ayam Premium"
                  value={prodForm.namaProduk}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, namaProduk: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424]"
                  required
                />
              </div>

              {/* MULTI-SELECT CHECKBOX OUTLET (TERPERBAIKI KLIK CARD) */}
              <div className="space-y-2 border border-zinc-200 p-3.5 rounded-xl bg-zinc-50/50">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-700">
                    Pilih Outlet / Tenant (Bisa Pilih Banyak)
                  </label>
                  <span className="text-[11px] font-bold text-zinc-500">
                    {prodForm.outletIds.length === 0
                      ? "Semua Outlet"
                      : `${prodForm.outletIds.length} Outlet Terpilih`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {/* OPTION ALL */}
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all select-none ${prodForm.outletIds.length === 0
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={prodForm.outletIds.length === 0}
                      onChange={handleSelectAllOutlets}
                      className="accent-emerald-600 rounded cursor-pointer"
                    />
                    <span>-- Semua Outlet (Umum) --</span>
                  </label>

                  {/* SPECIFIC OUTLETS */}
                  {tenants.map((t) => {
                    const isChecked = prodForm.outletIds.includes(String(t.id));
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all select-none ${isChecked
                            ? "bg-red-50 border-red-300 text-[#E52424] font-bold shadow-2xs"
                            : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleOutletToggle(t.id)}
                          className="accent-[#E52424] rounded cursor-pointer"
                        />
                        <span className="truncate">
                          {t.outletName || t.namaTenant || `Outlet #${t.id}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">
                  Kategori
                </label>
                <select
                  value={prodForm.categoryId}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424] bg-white cursor-pointer"
                  required
                >
                  <option value="">Pilih kategori...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">
                  Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="misal: Isi 5 pcs / porsi"
                  value={prodForm.keterangan}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, keterangan: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">
                  Gambar Produk
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#E52424] cursor-pointer border border-zinc-200 rounded-xl px-1 py-1"
                />
                {imagePreview && (
                  <div className="mt-2 w-20 h-20 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* TOPPING / SAUS */}
              <div className="space-y-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-600">
                    Opsi Topping / Saus
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      addDynamicField("toppings", {
                        namaTopping: "",
                        harga: "",
                      })
                    }
                    className="text-xs font-bold text-[#E52424] hover:underline"
                  >
                    + Tambah
                  </button>
                </div>
                {prodForm.toppings.map((t, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama saus"
                      value={t.namaTopping}
                      onChange={(e) =>
                        handleDynamicChange(
                          "toppings",
                          idx,
                          "namaTopping",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 outline-none focus:border-[#E52424] bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Harga"
                      value={t.harga}
                      onChange={(e) =>
                        handleDynamicChange(
                          "toppings",
                          idx,
                          "harga",
                          e.target.value
                        )
                      }
                      className="w-28 px-3 py-2 text-xs rounded-lg border border-zinc-200 outline-none focus:border-[#E52424] bg-white"
                    />
                    {prodForm.toppings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDynamicField("toppings", idx)}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* HARGA & PORSI */}
              <div className="space-y-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-600">
                    Opsi Harga & Porsi
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      addDynamicField("hargaproduks", { qty: "", harga: "" })
                    }
                    className="text-xs font-bold text-[#E52424] hover:underline"
                  >
                    + Tambah
                  </button>
                </div>
                {prodForm.hargaproduks.map((h, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Qty / pax"
                      value={h.qty}
                      onChange={(e) =>
                        handleDynamicChange(
                          "hargaproduks",
                          idx,
                          "qty",
                          e.target.value
                        )
                      }
                      className="w-24 px-3 py-2 text-xs rounded-lg border border-zinc-200 outline-none focus:border-[#E52424] bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Harga total (Rp)"
                      value={h.harga}
                      onChange={(e) =>
                        handleDynamicChange(
                          "hargaproduks",
                          idx,
                          "harga",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 outline-none focus:border-[#E52424] bg-white"
                    />
                    {prodForm.hargaproduks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDynamicField("hargaproduks", idx)}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#E52424] text-white text-xs font-semibold hover:bg-[#D91F1F] disabled:opacity-60 transition-all"
                >
                  {loading
                    ? "Memproses..."
                    : prodForm.id
                      ? "Simpan Perubahan"
                      : "Tambah Produk"}
                </button>
                {prodForm.id && (
                  <button
                    type="button"
                    onClick={resetProdForm}
                    className="py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-semibold hover:bg-zinc-50 transition-all"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* DAFTAR PRODUK */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-[#212121]">
                Daftar Produk
              </h3>
            </div>
            <div className="overflow-x-auto">
              {products.length === 0 ? (
                <p className="text-xs text-zinc-400 py-8 text-center">
                  {loading
                    ? "Memuat data..."
                    : "Belum ada produk yang tersimpan."}
                </p>
              ) : (
                <table className="w-full min-w-[760px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Produk
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Outlet / Tenant
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Kategori
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Topping
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Harga
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {products.map((prod) => (
                      <tr
                        key={prod.id}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {prod.produkImg ? (
                              <img
                                src={
                                  prod.produkImg.startsWith("http")
                                    ? prod.produkImg
                                    : `${API_BASE_URL}/uploads/${prod.produkImg}`
                                }
                                alt={prod.namaProduk}
                                className="w-10 h-10 rounded-lg object-cover border border-zinc-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 text-[10px]">
                                No img
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[#212121]">
                                {prod.namaProduk}
                              </div>
                              {prod.keterangan && (
                                <div className="text-[11px] text-zinc-400">
                                  {prod.keterangan}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {renderOutletBadges(prod)}
                        </td>
                        <td className="px-3 py-3.5 text-zinc-600">
                          {prod.category?.name || "-"}
                        </td>
                        <td className="px-3 py-3.5 text-zinc-600">
                          {prod.toppings?.length
                            ? prod.toppings.map((t) => t.namaTopping).join(", ")
                            : "-"}
                        </td>
                        <td className="px-3 py-3.5 text-zinc-600">
                          {prod.hargaproduks?.length
                            ? prod.hargaproduks
                              .map(
                                (h) =>
                                  `${h.qty}x: Rp ${Number(
                                    h.harga
                                  ).toLocaleString("id-ID")}`
                              )
                              .join(" | ")
                            : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditProduct(prod)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 font-semibold transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-semibold transition-all"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB KATEGORI */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* FORM KATEGORI */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#212121]">
                {catForm.id ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h2>
              {catForm.id && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600">
                  Mode edit
                </span>
              )}
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  placeholder="misal: Makanan Utama"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({ ...catForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#E52424] text-white text-xs font-semibold hover:bg-[#D91F1F] disabled:opacity-60 transition-all"
                >
                  {loading
                    ? "Memproses..."
                    : catForm.id
                      ? "Simpan Kategori"
                      : "Tambah Kategori"}
                </button>
                {catForm.id && (
                  <button
                    type="button"
                    onClick={resetCatForm}
                    className="py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-semibold hover:bg-zinc-50 transition-all"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* DAFTAR KATEGORI */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-[#212121]">
                Daftar Kategori
              </h3>
            </div>
            <div className="overflow-x-auto">
              {categories.length === 0 ? (
                <p className="text-xs text-zinc-400 py-8 text-center">
                  {loading
                    ? "Memuat data..."
                    : "Belum ada kategori yang tersimpan."}
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Nama Kategori
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-400 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {categories.map((cat) => (
                      <tr
                        key={cat.id}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-semibold text-[#212121]">
                          {cat.name}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 font-semibold transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-semibold transition-all"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}