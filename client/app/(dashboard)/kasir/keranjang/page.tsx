"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import KasirHeader from "@/components/kasir/KasirHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000";

// =====================================================
// TYPES
// =====================================================

type CartItem = {
  id: string;
  productId: number;
  name: string;
  price: number;
  pcs: number;
  pax: number;
  sauce: string[] | string;
  image?: string | null;
  icon?: string;
};

type PaymentMethod = "Cash" | "QRIS";

type SuccessData = {
  invoice: string;
  totalBayar: number;
  metodePembayaran: string;
} | null;

// =====================================================
// HELPER FORMAT RUPIAH
// =====================================================

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // ===================================================
  // LOAD CART FROM LOCALSTORAGE
  // ===================================================

  useEffect(() => {
    const storedCart = localStorage.getItem("kasir-cart");
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      } catch (error) {
        console.error("Gagal membaca data keranjang:", error);
        localStorage.removeItem("kasir-cart");
      }
    }
    setLoaded(true);
  }, []);

  // ===================================================
  // SAVE CART & EMIT EVENT
  // ===================================================

  const updateCartState = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("kasir-cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  // ===================================================
  // CART ACTIONS
  // ===================================================

  const increasePax = (id: string) => {
    const updated = cart.map((item) =>
      item.id === id ? { ...item, pax: item.pax + 1 } : item
    );
    updateCartState(updated);
  };

  const decreasePax = (id: string) => {
    const updated = cart.map((item) =>
      item.id === id ? { ...item, pax: Math.max(1, item.pax - 1) } : item
    );
    updateCartState(updated);
  };

  const removeItem = (id: string) => {
    const updated = cart.filter((item) => item.id !== id);
    updateCartState(updated);
  };

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  // ===================================================
  // CALCULATIONS
  // ===================================================

  const getItemTotal = (item: CartItem) => item.price * item.pax;

  const subtotal = cart.reduce((acc, item) => acc + getItemTotal(item), 0);
  const tax = 0;
  const total = subtotal + tax;

  // ===================================================
  // CHECKOUT HANDLER
  // ===================================================

  // ===================================================
  // CHECKOUT HANDLER
  // ===================================================

  const handleCheckout = async () => {
    if (cart.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Keranjang masih kosong",
        text: "Tambahkan produk terlebih dahulu sebelum checkout.",
        confirmButtonColor: "#E52424",
      });
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      await Swal.fire({
        icon: "error",
        title: "Sesi kasir tidak ditemukan",
        text: "Silakan login kembali untuk melanjutkan transaksi.",
        confirmButtonColor: "#E52424",
      });
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        totalBayar: total,
        metodePembayaran: paymentMethod,
        items: cart,
      };

      const response = await axios.post(`${API_URL}/api/penjualan/checkout`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setSuccessData({
          invoice: response.data.data.invoice,
          totalBayar: response.data.data.totalBayar,
          metodePembayaran: response.data.data.metodePembayaran,
        });

        setCart([]);
        localStorage.removeItem("kasir-cart");
        window.dispatchEvent(new Event("cart-updated"));
      }
    } catch (error: any) {
      console.error("Checkout gagal:", error);
      const message = error.response?.data?.message || "Gagal memproses transaksi. Coba lagi.";

      const isAbsenceBlocked = message.toLowerCase().includes("absensi");

      const result = await Swal.fire({
        icon: "warning",
        title: isAbsenceBlocked ? "Absensi belum valid" : "Transaksi gagal",
        text: message,
        confirmButtonText: isAbsenceBlocked ? "Ke Halaman Absensi" : "OK",
        showCancelButton: isAbsenceBlocked,
        cancelButtonText: "Tutup",
        confirmButtonColor: "#E52424",
      });

      if (isAbsenceBlocked && result.isConfirmed) {
        router.push("/absen");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================================================
  // LOADING SKELETON
  // ===================================================

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#F8F9FA]">
        <KasirHeader title="Keranjang" showBack />
        <div className="max-w-2xl mx-auto p-4 space-y-4 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-zinc-200" />
          <div className="h-28 bg-white rounded-2xl border border-zinc-200" />
          <div className="h-40 bg-white rounded-2xl border border-zinc-200" />
        </div>
      </main>
    );
  }

  // ===================================================
  // SUCCESS MODAL DISPLAY
  // ===================================================

  if (successData) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-zinc-100 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
            ✓
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Pembayaran Berhasil!</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Transaksi telah tersimpan ke sistem
          </p>

          <div className="bg-zinc-50 rounded-2xl p-4 my-5 text-left space-y-2 border border-zinc-100 text-xs sm:text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>No. Invoice</span>
              <span className="font-mono font-semibold text-zinc-900">
                {successData.invoice}
              </span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Metode</span>
              <span className="font-semibold text-zinc-900">
                {successData.metodePembayaran}
              </span>
            </div>
            <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-sm text-zinc-900">
              <span>Total Bayar</span>
              <span className="text-[#E52424]">
                {formatRupiah(successData.totalBayar)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/kasir")}
            className="w-full py-3.5 bg-[#E52424] text-white rounded-xl font-semibold text-sm hover:bg-[#D91F1F] active:scale-[0.98] transition shadow-md shadow-red-200"
          >
            Kembali ke Menu Kasir
          </button>
        </div>
      </main>
    );
  }

  // ===================================================
  // EMPTY CART STATE
  // ===================================================

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#F8F9FA]">
        <KasirHeader title="Keranjang" showBack />
        <div className="min-h-[75vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-sm">
              🛒
            </div>
            <h2 className="text-xl font-bold text-zinc-900">
              Keranjang Masih Kosong
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2 leading-relaxed">
              Belum ada dimsum lezat yang ditambahkan. Silakan pilih menu favorit
              pelanggan.
            </p>
            <button
              type="button"
              onClick={() => router.push("/kasir")}
              className="mt-6 px-6 py-3 rounded-xl bg-[#E52424] text-white text-sm font-semibold hover:bg-[#D91F1F] active:scale-95 transition shadow-lg shadow-red-200"
            >
              Tambah Pesanan
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // MAIN RENDER
  // ===================================================

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-36">
      <KasirHeader title="Keranjang Pesanan" showBack />

      <div className="w-full max-w-md sm:max-w-xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* LIST PESANAN */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
              Item Pesanan
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#E52424] rounded-full">
              {cart.length} Produk
            </span>
          </div>

          <div className="space-y-3">
            {cart.map((item) => {
              const formattedSauce = Array.isArray(item.sauce)
                ? item.sauce.join(", ")
                : item.sauce;

              const hasImageError = imageErrors[item.id];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex gap-3 sm:gap-4 items-center">
                    {/* GAMBAR PRODUK */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-zinc-100 border border-zinc-100 overflow-hidden flex items-center justify-center text-3xl">
                      {item.image && !hasImageError ? (
                        <img
                          src={`${API_URL}/public/produk/${item.image}`}
                          alt={item.name}
                          onError={() => handleImageError(item.id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        item.icon || "🥟"
                      )}
                    </div>

                    {/* DETAIL ITEM */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate">
                            {item.name}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-zinc-500 font-medium mt-0.5">
                            {item.pcs} PCS per Pax
                          </p>
                          <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
                            Saus:{" "}
                            <span className="text-zinc-700">
                              {formattedSauce || "Tanpa Saus"}
                            </span>
                          </p>
                        </div>

                        <span className="shrink-0 text-sm sm:text-base font-extrabold text-zinc-900">
                          {formatRupiah(getItemTotal(item))}
                        </span>
                      </div>

                      {/* CONTROLS (QUANTITY & DELETE) */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100">
                        <div className="flex items-center gap-1.5 bg-zinc-50 p-1 rounded-xl border border-zinc-200/60">
                          <button
                            type="button"
                            onClick={() => decreasePax(item.id)}
                            disabled={item.pax <= 1}
                            aria-label="Kurangi jumlah"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-zinc-800 font-bold text-sm hover:bg-zinc-200 active:scale-90 disabled:opacity-30 disabled:hover:bg-white transition flex items-center justify-center shadow-sm"
                          >
                            −
                          </button>

                          <span className="w-7 text-center text-xs sm:text-sm font-bold text-zinc-900">
                            {item.pax}
                          </span>

                          <button
                            type="button"
                            onClick={() => increasePax(item.id)}
                            aria-label="Tambah jumlah"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E52424] text-white font-bold text-sm hover:bg-[#D91F1F] active:scale-90 transition flex items-center justify-center shadow-sm"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-xl active:scale-95 transition"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* METODE PEMBAYARAN */}
        <section className="space-y-3">
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
            Metode Pembayaran
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* CASH */}
            <button
              type="button"
              onClick={() => setPaymentMethod("Cash")}
              className={`relative p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] ${paymentMethod === "Cash"
                ? "border-[#E52424] bg-red-50/40 ring-2 ring-[#E52424]/20 shadow-sm"
                : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center text-xl">
                  💵
                </div>
                {paymentMethod === "Cash" && (
                  <span className="w-5 h-5 rounded-full bg-[#E52424] text-white flex items-center justify-center text-xs font-bold animate-in zoom-in-50">
                    ✓
                  </span>
                )}
              </div>
              <p
                className={`text-sm font-bold ${paymentMethod === "Cash"
                  ? "text-[#E52424]"
                  : "text-zinc-800"
                  }`}
              >
                Cash / Tunai
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                Bayar dengan uang fisik
              </p>
            </button>

            {/* QRIS */}
            <button
              type="button"
              onClick={() => setPaymentMethod("QRIS")}
              className={`relative p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] ${paymentMethod === "QRIS"
                ? "border-[#E52424] bg-red-50/40 ring-2 ring-[#E52424]/20 shadow-sm"
                : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center text-xl">
                  📱
                </div>
                {paymentMethod === "QRIS" && (
                  <span className="w-5 h-5 rounded-full bg-[#E52424] text-white flex items-center justify-center text-xs font-bold animate-in zoom-in-50">
                    ✓
                  </span>
                )}
              </div>
              <p
                className={`text-sm font-bold ${paymentMethod === "QRIS"
                  ? "text-[#E52424]"
                  : "text-zinc-800"
                  }`}
              >
                QRIS
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
                Nontunai via E-Wallet/Bank
              </p>
            </button>
          </div>
        </section>

        {/* RINGKASAN PEMBAYARAN */}
        <section className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 shadow-sm space-y-3">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 border-b border-zinc-100 pb-2">
            Ringkasan Biaya
          </h3>

          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal Pesanan</span>
              <span className="font-semibold text-zinc-800">
                {formatRupiah(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Pajak Resto (0%)</span>
              <span className="font-semibold text-zinc-800">
                {formatRupiah(tax)}
              </span>
            </div>

            <div className="border-t border-dashed border-zinc-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-sm sm:text-base text-zinc-900">
                Total Pembayaran
              </span>
              <span className="text-[#E52424] font-extrabold text-base sm:text-xl">
                {formatRupiah(total)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM FLOATING BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-zinc-200 p-3.5 sm:p-4 z-40 shadow-lg">
        <div className="w-full max-w-md sm:max-w-xl lg:max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium">
              Total Akhir
            </p>
            <p className="font-black text-base sm:text-lg text-[#E52424] truncate">
              {formatRupiah(total)}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">
              Metode: <span className="font-bold">{paymentMethod}</span>
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCheckout}
            className="h-12 px-6 sm:px-8 rounded-xl bg-[#E52424] text-white text-xs sm:text-sm font-bold hover:bg-[#D91F1F] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-red-200 shrink-0"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Memproses...</span>
              </>
            ) : (
              <span>Bayar Sekarang</span>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}