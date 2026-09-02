"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";

import KasirHeader from "@/components/kasir/KasirHeader";
import BottomNavigation from "@/components/kasir/BottomNavigation";

interface ItemPenjualan {
  id: number;
  namaProduk: string;
  pcs: number;
  pax: number;
  saus: string[] | string;
  subtotal: number;
}

interface TransaksiGroup {
  invoice: string;
  totalBayar: number;
  metodePembayaran: string;
  createdAt: string;
  kasir?: {
    nama: string;
    username: string;
  };
  items: ItemPenjualan[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getJakartaDateKey = (dateValue: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateValue));

export default function KasirHistoryPage() {
  const [transaksiList, setTransaksiList] = useState<TransaksiGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<"ALL" | "Cash" | "QRIS">("ALL");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/penjualan/my-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const rawData = response.data.data || [];
        const todayKey = getJakartaDateKey(new Date());
        const todayData = rawData.filter(
          (item: any) => item.createdAt && getJakartaDateKey(item.createdAt) === todayKey,
        );
        const grouped = todayData.reduce(
          (acc: Record<string, TransaksiGroup>, item: any) => {
            const inv = item.invoice;
            if (!acc[inv]) {
              acc[inv] = {
                invoice: item.invoice,
                totalBayar: Number(item.totalBayar || 0),
                metodePembayaran: item.metodePembayaran || "Cash",
                createdAt: item.createdAt,
                kasir: item.kasir,
                items: [],
              };
            }
            acc[inv].items.push({
              id: item.id,
              namaProduk: item.namaProduk,
              pcs: Number(item.pcs || 1),
              pax: Number(item.pax || 1),
              saus:
                typeof item.saus === "string"
                  ? JSON.parse(item.saus)
                  : item.saus || [],
              subtotal: Number(item.subtotal || 0),
            });
            return acc;
          },
          {}
        );

        setTransaksiList(Object.values(grouped));
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal memuat riwayat transaksi."
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtering Logic
  const filteredTransaksi = useMemo(() => {
    return transaksiList.filter((trx) => {
      const matchSearch =
        trx.invoice.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trx.items.some((i) =>
          i.namaProduk.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchPayment =
        selectedPayment === "ALL" || trx.metodePembayaran === selectedPayment;

      return matchSearch && matchPayment;
    });
  }, [transaksiList, searchQuery, selectedPayment]);

  // Calculations for Stats Card
  const totalOmzet = useMemo(() => {
    return filteredTransaksi.reduce((sum, trx) => sum + trx.totalBayar, 0);
  }, [filteredTransaksi]);

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-24 text-zinc-800 antialiased">
      <KasirHeader title="Riwayat Penjualan" />

      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        
        {/* Top Action & Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900">
              Riwayat Transaksi
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pantau laporan penjualan sesi Anda
            </p>
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-400 block uppercase tracking-wider">
              Total Omzet
            </span>
            <p className="text-base font-extrabold text-[#E52424] mt-1">
              Rp {totalOmzet.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="space-y-2.5">
          {/* Payment Method Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(["ALL", "Cash", "QRIS"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setSelectedPayment(method)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedPayment === method
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {method === "ALL" ? "Semua Metode" : method}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          /* Skeleton Loader */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-zinc-200/80 p-4 animate-pulse space-y-3"
              >
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5">
                  <div className="w-24 h-4 bg-zinc-200 rounded-md" />
                  <div className="w-12 h-4 bg-zinc-200 rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 h-3.5 bg-zinc-200 rounded" />
                  <div className="w-1/2 h-3 bg-zinc-200 rounded" />
                </div>
                <div className="pt-2 flex justify-between">
                  <div className="w-16 h-3 bg-zinc-200 rounded" />
                  <div className="w-20 h-4 bg-zinc-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center shadow-xs">
            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
              ⚠️
            </div>
            <p className="text-xs font-semibold text-rose-600">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-3 px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-lg transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredTransaksi.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 text-center shadow-xs">
            <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
              🧾
            </div>
            <p className="text-sm font-bold text-zinc-800">
              Transaksi Tidak Ditemukan
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {searchQuery || selectedPayment !== "ALL"
                ? "Tidak ada data yang cocok dengan filter Anda."
                : "Belum ada riwayat penjualan yang tercatat."}
            </p>
          </div>
        ) : (
          /* Transaction Cards List */
          <div className="space-y-3">
            {filteredTransaksi.map((trx) => (
              <div
                key={trx.invoice}
                className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs hover:border-zinc-300 transition-all"
              >
                {/* Header Card */}
                <div className="bg-zinc-50/80 px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-zinc-800 bg-zinc-200/70 px-2 py-0.5 rounded-md">
                      {trx.invoice}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wide uppercase ${
                        trx.metodePembayaran === "QRIS"
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-200/60"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                      }`}
                    >
                      {trx.metodePembayaran}
                    </span>
                  </div>

                  <span className="text-[11px] font-medium text-zinc-400">
                    {new Date(trx.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    WIB
                  </span>
                </div>

                {/* Items Breakdown */}
                <div className="p-4 space-y-3 divide-y divide-zinc-100">
                  {trx.items.map((item) => (
                    <div
                      key={item.id}
                      className="pt-2.5 first:pt-0 flex justify-between items-start gap-3"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-xs text-zinc-900 leading-tight">
                          {item.namaProduk}
                        </h4>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-medium text-zinc-500">
                            {item.pcs} Pcs × {item.pax} Pax
                          </span>
                        </div>

                        {/* Sauce Tags */}
                        {Array.isArray(item.saus) && item.saus.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.saus.map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 px-1.5 py-0.5 rounded-md"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-xs font-bold text-zinc-800">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer Total */}
                <div className="bg-zinc-50/50 px-4 py-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Total Transaksi
                  </span>
                  <span className="text-sm font-black text-[#E52424]">
                    Rp {trx.totalBayar.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </main>
  );
}