"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

import KasirHeader from "@/components/kasir/KasirHeader";
import BottomNavigation from "@/components/kasir/BottomNavigation";

type Category = {
  id: number;
  name: string;
};

type HargaProduk = {
  id: number;
  qty: number;
  harga: number;
};

type Tenant = {
  id: number | string;
  namaTenant?: string;
  outletName?: string;
};

type Product = {
  id: number;
  namaProduk: string;
  keterangan: string | null;
  harga?: number;
  categoryId: number;
  outletId?: number | string | null;
  outletIds?: (number | string)[] | string | null;
  tenants?: Tenant[];
  produkImg: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  hargaproduks?: HargaProduk[];
};

export default function CategoryPage() {
  // =========================
  // PARAMS
  // =========================
  const params = useParams();

  const category = Array.isArray(params?.category)
    ? params.category[0]
    : params?.category;

  // =========================
  // STATE
  // =========================
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // API URL
  // =========================
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000";

  // =========================
  // HELPER: GET OUTLET ID
  // =========================
  const getStoredOutletId = (): number | null => {
    if (typeof window === "undefined") return null;

    // 1. Cek langsung dari key localStorage "outletId"
    const directOutlet = localStorage.getItem("outletId");
    if (directOutlet && directOutlet !== "null" && directOutlet !== "undefined") {
      const parsed = Number(directOutlet);
      if (!isNaN(parsed)) return parsed;
    }

    // 2. Jika tidak ada, cek dari objek "user" di localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const userOutlet = parsedUser?.outletId ?? parsedUser?.karyawan?.outletId;
        if (userOutlet !== undefined && userOutlet !== null) {
          const parsed = Number(userOutlet);
          if (!isNaN(parsed)) return parsed;
        }
      } catch (e) {
        console.error("Gagal parse data user dari localStorage", e);
      }
    }

    return null;
  };

  // =========================
  // GET PRODUCTS
  // =========================
  const getProducts = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      const activeOutletId = getStoredOutletId();

      if (!token) {
        console.error("GET PRODUCTS ERROR: Token tidak ditemukan");
        setProducts([]);
        return;
      }

      // Request API dengan query parameter outletId jika ada
      const response = await axios.get(
        `${API_URL}/api/products/category/${category}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: activeOutletId !== null ? { outletId: activeOutletId } : {},
        }
      );

      const productData: Product[] = response.data?.data || [];

      // Filter Client-side berdasarkan Multi-Outlet / Tenant
      const filteredData = productData.filter((item) => {
        if (activeOutletId === null) return true;

        let parsedOutletIds: string[] = [];

        // Parsing field outletIds jika bertipe stringified JSON
        if (item.outletIds) {
          if (typeof item.outletIds === "string") {
            try {
              parsedOutletIds = JSON.parse(item.outletIds).map(String);
            } catch (e) {
              parsedOutletIds = [];
            }
          } else if (Array.isArray(item.outletIds)) {
            parsedOutletIds = item.outletIds.map(String);
          }
        }

        // Cek tenant relasi array
        const tenantIds = item.tenants ? item.tenants.map((t) => String(t.id)) : [];

        // Produk dianggap UMUM/GLOBAL jika semua field outlet kosong
        const isGlobalProduct =
          parsedOutletIds.length === 0 &&
          tenantIds.length === 0 &&
          (item.outletId === null || item.outletId === undefined);

        if (isGlobalProduct) return true;

        // Cek kecocokan activeOutletId terhadap seluruh tempat kemungkinan outlet terdaftar
        const activeStr = String(activeOutletId);
        return (
          parsedOutletIds.includes(activeStr) ||
          tenantIds.includes(activeStr) ||
          String(item.outletId) === activeStr
        );
      });

      setProducts(filteredData);
    } catch (error) {
      console.error("========== GET PRODUCTS ERROR ==========", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }

      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, category]);

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }

    getProducts();
  }, [category, getProducts]);

  // =========================
  // FORMAT RUPIAH
  // =========================
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Helper mengambil harga display produk
  const getDisplayPrice = (product: Product): number => {
    if (product.harga !== undefined && product.harga !== null) {
      return product.harga;
    }
    if (product.hargaproduks && product.hargaproduks.length > 0) {
      return product.hargaproduks[0].harga;
    }
    return 0;
  };

  // Helper URL Gambar Produk
  const getImageUrl = (imgName: string) => {
    if (imgName.startsWith("http")) return imgName;
    return `${API_URL}/uploads/${imgName}`;
  };

  // =========================
  // CATEGORY NAME
  // =========================
  const categoryName =
    products.length > 0 && products[0]?.category?.name
      ? products[0].category.name
      : "Produk";

  // =========================
  // LOADING STATE
  // =========================
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] pb-20">
        <KasirHeader title="Produk" showBack />

        <div className="max-w-md mx-auto px-4 py-5">
          <div className="mb-5">
            <div className="w-16 h-3 bg-zinc-200 rounded animate-pulse" />
            <div className="w-32 h-6 bg-zinc-200 rounded mt-2 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="bg-white rounded-2xl border border-zinc-200 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-zinc-200" />

                <div className="p-3">
                  <div className="w-3/4 h-4 bg-zinc-200 rounded" />
                  <div className="w-full h-3 bg-zinc-200 rounded mt-2" />
                  <div className="w-1/2 h-4 bg-zinc-200 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <BottomNavigation />
      </main>
    );
  }

  // =========================
  // EMPTY STATE
  // =========================
  if (products.length === 0) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] pb-20">
        <KasirHeader title="Produk" showBack />

        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <div className="text-5xl mb-4">🍽️</div>

          <h2 className="text-lg font-bold text-[#212121]">
            Belum ada produk
          </h2>

          <p className="text-sm text-zinc-400 mt-2">
            Produk untuk kategori ini belum tersedia di outlet Anda.
          </p>
        </div>

        <BottomNavigation />
      </main>
    );
  }

  // =========================
  // MAIN VIEW
  // =========================
  return (
    <main className="min-h-screen bg-[#F5F5F5] pb-20">
      <KasirHeader title={categoryName} showBack />

      <div className="max-w-md mx-auto px-4 py-5">
        {/* Header Section */}
        <div className="mb-5">
          <p className="text-xs text-zinc-400">Kategori</p>

          <h2 className="text-xl font-bold text-[#212121] mt-1">
            {categoryName}
          </h2>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/kasir/${category}/${product.id}`}
              className="block"
            >
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden transition-all hover:border-[#E52424] hover:shadow-md flex flex-col h-full">
                {/* IMAGE */}
                <div className="aspect-square bg-[#F5F5F5] overflow-hidden">
                  {product.produkImg ? (
                    <img
                      src={getImageUrl(product.produkImg)}
                      alt={product.namaProduk}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      🥟
                    </div>
                  )}
                </div>

                {/* PRODUCT INFORMATION */}
                <div className="p-3 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-semibold text-sm text-[#212121] line-clamp-1">
                      {product.namaProduk}
                    </h3>

                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                      {product.keterangan || "Tidak ada keterangan"}
                    </p>
                  </div>

                  <p className="text-sm font-bold text-[#E52424] mt-3">
                    {formatRupiah(getDisplayPrice(product))}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNavigation />
    </main>
  );
}