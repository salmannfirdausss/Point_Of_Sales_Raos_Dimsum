"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import KasirHeader from "@/components/kasir/KasirHeader";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000").replace(/\/$/, "");

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

type PaymentMethod = "Cash" | "QRIS" | "Online";

type SuccessData = {
  invoice: string;
  totalBayar: number;
  metodePembayaran: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data: {
    invoice: string;
    totalBayar: number;
    metodePembayaran: string;
  };
};

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
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
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

      const response = await axios.post<ApiResponse>(
        `${API_URL}/api/penjualan/checkout`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setSuccessData({
          invoice: response.data.data.invoice,
          totalBayar: response.data.data.totalBayar,
          metodePembayaran: response.data.data.metodePembayaran,
        });

        setCart([]);
        localStorage.removeItem("kasir-cart");
        window.dispatchEvent(new Event("cart-updated"));
      }
    } catch (error: unknown) {
      console.error("Checkout gagal:", error);

      let message = "Gagal memproses transaksi. Coba lagi.";
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = error.response.data.message;
      }

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
      <main className="min-h-screen bg-slate-50">
        <KasirHeader title="Keranjang" showBack />
        <div className="max-w-xl mx-auto p-4 space-y-4 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
          <div className="h-44 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
        </div>
      </main>
    );
  }

  // ===================================================
  // SUCCESS MODAL DISPLAY
  // ===================================================

  if (successData) {
    return (
      <main className="min-h-screen bg-slate-50/80 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black ring-8 ring-emerald-50/50">
            ✓
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Pembayaran Berhasil!</h2>
          <p className="text-xs text-slate-500 mt-1">
            Transaksi berhasil dicatat dalam sistem kasir
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 my-5 text-left space-y-2.5 border border-slate-100 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-slate-500">
              <span>No. Invoice</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200/60">
                {successData.invoice}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Metode</span>
              <span className="font-semibold text-slate-900">
                {successData.metodePembayaran}
              </span>
            </div>
            <div className="border-t border-slate-200/80 pt-2.5 flex justify-between items-center font-bold text-sm text-slate-900">
              <span>Total Bayar</span>
              <span className="text-[#E52424] font-extrabold text-base">
                {formatRupiah(successData.totalBayar)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/kasir")}
            className="w-full py-3.5 bg-[#E52424] text-white rounded-xl font-bold text-sm hover:bg-[#D91F1F] active:scale-[0.98] transition-all shadow-md shadow-red-200"
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
      <main className="min-h-screen bg-slate-50">
        <KasirHeader title="Keranjang" showBack />
        <div className="min-h-[75vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-red-50 text-[#E52424] rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm border border-red-100">
              🛒
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Keranjang Masih Kosong
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Belum ada pesanan yang dipilih. Silakan pilih menu untuk melanjutkan transaksi.
            </p>
            <button
              type="button"
              onClick={() => router.push("/kasir")}
              className="mt-6 px-6 py-3 rounded-xl bg-[#E52424] text-white text-xs sm:text-sm font-bold hover:bg-[#D91F1F] active:scale-95 transition-all shadow-lg shadow-red-100"
            >
              + Tambah Pesanan
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
    <main className="min-h-screen bg-slate-50 pb-36">
      <KasirHeader title="Keranjang Pesanan" showBack />

      <div className="w-full max-w-md sm:max-w-xl lg:max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* LIST PESANAN */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
              Item Pesanan
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-red-50 text-[#E52424] rounded-full border border-red-100">
              {cart.length} Produk
            </span>
          </div>

          <div className="space-y-2.5">
            {cart.map((item) => {
              const formattedSauce = Array.isArray(item.sauce)
                ? item.sauce.join(", ")
                : item.sauce;

              const hasImageError = imageErrors[item.id];
              const cleanImage = item.image ? item.image.replace(/^\//, "") : null;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm hover:border-slate-300 transition-all duration-150"
                >
                  <div className="flex gap-3 sm:gap-4 items-center">
                    {/* GAMBAR PRODUK */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center text-2xl sm:text-3xl">
                      {cleanImage && !hasImageError ? (
                        <img
                          src={`${API_URL}/public/produk/${cleanImage}`}
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
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.pcs} PCS / Pax
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-1">
                            Saus:{" "}
                            <span className="font-semibold text-slate-700">
                              {formattedSauce || "Tanpa Saus"}
                            </span>
                          </p>
                        </div>

                        <span className="shrink-0 text-sm sm:text-base font-black text-slate-900">
                          {formatRupiah(getItemTotal(item))}
                        </span>
                      </div>

                      {/* CONTROLS (QUANTITY & DELETE) */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                          <button
                            type="button"
                            onClick={() => decreasePax(item.id)}
                            disabled={item.pax <= 1}
                            aria-label="Kurangi jumlah"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-slate-800 font-bold text-sm hover:bg-slate-200 active:scale-90 disabled:opacity-40 disabled:hover:bg-white transition flex items-center justify-center shadow-xs"
                          >
                            −
                          </button>

                          <span className="w-7 text-center text-xs sm:text-sm font-bold text-slate-900">
                            {item.pax}
                          </span>

                          <button
                            type="button"
                            onClick={() => increasePax(item.id)}
                            aria-label="Tambah jumlah"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E52424] text-white font-bold text-sm hover:bg-[#D91F1F] active:scale-90 transition flex items-center justify-center shadow-xs"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-xl active:scale-95 transition"
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
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
            Metode Pembayaran
          </h2>

          <div className="grid grid-cols-3 gap-2.5">
            {/* CASH */}
            <button
              type="button"
              onClick={() => setPaymentMethod("Cash")}
              className={`relative p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${paymentMethod === "Cash"
                ? "border-[#E52424] bg-red-50/50 ring-2 ring-[#E52424]/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center text-lg">
                  💵
                </div>
                {paymentMethod === "Cash" && (
                  <span className="w-4 h-4 rounded-full bg-[#E52424] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p
                className={`text-xs sm:text-sm font-bold ${paymentMethod === "Cash" ? "text-[#E52424]" : "text-slate-800"
                  }`}
              >
                Tunai
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                Uang fisik
              </p>
            </button>

            {/* QRIS */}
            <button
              type="button"
              onClick={() => setPaymentMethod("QRIS")}
              className={`relative p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${paymentMethod === "QRIS"
                ? "border-[#E52424] bg-red-50/50 ring-2 ring-[#E52424]/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center text-lg">
                  📱
                </div>
                {paymentMethod === "QRIS" && (
                  <span className="w-4 h-4 rounded-full bg-[#E52424] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p
                className={`text-xs sm:text-sm font-bold ${paymentMethod === "QRIS" ? "text-[#E52424]" : "text-slate-800"
                  }`}
              >
                QRIS
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                E-Wallet/Bank
              </p>
            </button>

            {/* ONLINE */}
            <button
              type="button"
              onClick={() => setPaymentMethod("Online")}
              className={`relative p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${paymentMethod === "Online"
                ? "border-[#E52424] bg-red-50/50 ring-2 ring-[#E52424]/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center text-lg">
                  🛵
                </div>
                {paymentMethod === "Online" && (
                  <span className="w-4 h-4 rounded-full bg-[#E52424] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p
                className={`text-xs sm:text-sm font-bold ${paymentMethod === "Online" ? "text-[#E52424]" : "text-slate-800"
                  }`}
              >
                Online
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                Grab/GoSend
              </p>
            </button>
          </div>
        </section>

        {/* RINGKASAN PEMBAYARAN */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
            Ringkasan Biaya
          </h3>

          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal Pesanan</span>
              <span className="font-bold text-slate-800">
                {formatRupiah(subtotal)}
              </span>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-sm sm:text-base text-slate-900">
                Total Pembayaran
              </span>
              <span className="text-[#E52424] font-black text-base sm:text-xl">
                {formatRupiah(total)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM FLOATING BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/80 p-3.5 sm:p-4 z-40 shadow-xl">
        <div className="w-full max-w-md sm:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Total Akhir
            </p>
            <p className="font-black text-lg sm:text-xl text-[#E52424] truncate">
              {formatRupiah(total)}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Metode: <span className="font-bold text-slate-800">{paymentMethod}</span>
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCheckout}
            className="h-12 px-6 sm:px-8 rounded-xl bg-[#E52424] text-white text-xs sm:text-sm font-bold hover:bg-[#D91F1F] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-red-200 shrink-0"
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