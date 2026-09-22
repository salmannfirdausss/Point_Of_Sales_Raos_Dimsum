"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

type PackageData = {
  qty: number;
  pax: number;
  categoryName?: string;
};

type SauceData = {
  name: string;
  count: number;
};

type PackageGroup = {
  categoryName: string;
  packages: PackageData[];
};

type AnalisaSummary = {
  packages: PackageGroup[];
  sauces: SauceData[];
};

type DayData = AnalisaSummary & {
  date: string;
  label: string;
};

type AnalisaResponse = {
  period: string;
  startDate: string;
  endDate: string;
  totals: AnalisaSummary;
  days: DayData[];
};

const PACKAGE_COLORS = ["#E52424", "#F97316", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

export default function AnalisaPage() {
  const [activeTab, setActiveTab] = useState<"Saus" | "PCS">("Saus");
  const [analisa, setAnalisa] = useState<AnalisaResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalisa = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/analisa");

        if (response.data.success) {
          setAnalisa(response.data.data);
        }
      } catch (error) {
        console.error("Gagal mengambil data analisa:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalisa();
  }, []);

  // Filter Data Berdasarkan Hari / All
  const selectedSummary = useMemo(() => {
    if (selectedDay === "all") return analisa?.totals;
    return analisa?.days.find((day) => day.date === selectedDay);
  }, [selectedDay, analisa]);

  // Transform Data Packaging
  const packageGroups = useMemo(() => selectedSummary?.packages ?? [], [selectedSummary]);

  const packageData = useMemo(() => {
    return packageGroups.flatMap((group) =>
      group.packages.map((pkg) => ({
        ...pkg,
        categoryName: group.categoryName,
      }))
    );
  }, [packageGroups]);

  const sauceData = useMemo(() => selectedSummary?.sauces ?? [], [selectedSummary]);

  // Calculators
  const maxSauceCount = useMemo(() => Math.max(...sauceData.map((item) => item.count), 1), [sauceData]);
  const totalPax = useMemo(() => packageData.reduce((total, item) => total + item.pax, 0), [packageData]);
  const totalPackagingPcs = useMemo(
    () => packageData.reduce((total, item) => total + item.qty * item.pax, 0),
    [packageData]
  );
  const totalSaucePcs = useMemo(() => sauceData.reduce((total, item) => total + item.count, 0), [sauceData]);

  // Chart Conic Gradient Calculation
  const packageChart = useMemo(() => {
    let currentAngle = 0;
    return packageData.map((item, index) => {
      const percentage = totalPax ? (item.pax / totalPax) * 100 : 0;
      const start = currentAngle;
      const end = currentAngle + percentage;
      currentAngle = end;

      return {
        ...item,
        color: PACKAGE_COLORS[index % PACKAGE_COLORS.length],
        start,
        end,
        percentage,
      };
    });
  }, [packageData, totalPax]);

  const chartBackground = useMemo(() => {
    if (!packageChart.length || totalPax === 0) return "#f4f4f5";
    return `conic-gradient(${packageChart
      .map((item) => `${item.color} ${item.start}% ${item.end}%`)
      .join(", ")})`;
  }, [packageChart, totalPax]);

  return (
    <div className="space-y-5 pb-10">
      {/* HEADER PAGE */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#212121] tracking-tight">
            Analisa Penjualan
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Laporan statistik penggunaan packaging dan distribusi saus
          </p>
        </div>

        {/* PERIODE FILTER */}
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200/80 p-1.5 pl-3 rounded-xl">
          <div className="text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Periode</p>
            <p className="text-xs font-semibold text-zinc-700">
              {analisa ? `${analisa.startDate} - ${analisa.endDate}` : "Minggu Ini"}
            </p>
          </div>
          <select
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
            className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
          >
            <option value="all">Semua Hari (Minggu Ini)</option>
            {analisa?.days.map((day) => (
              <option key={day.date} value={day.date}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Total Outflow Packaging
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xl md:text-2xl font-black text-[#212121]">
              {loading ? "..." : `${totalPax.toLocaleString("id-ID")} Pax`}
            </p>
            {!loading && (
              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                {totalPackagingPcs.toLocaleString("id-ID")} Pcs
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Total Keluar Saus
          </span>
          <p className="text-xl md:text-2xl font-black text-[#212121]">
            {loading ? "..." : `${totalSaucePcs.toLocaleString("id-ID")} Pcs`}
          </p>
        </div>
      </div>

      {/* MOBILE SWITCHER */}
      <div className="flex md:hidden bg-zinc-100 p-1 rounded-xl border border-zinc-200">
        <button
          onClick={() => setActiveTab("Saus")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "Saus" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
            }`}
        >
          Distribusi Saus
        </button>
        <button
          onClick={() => setActiveTab("PCS")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "PCS" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
            }`}
        >
          Packaging (Pax & Pcs)
        </button>
      </div>

      {/* 2-COLUMN GRID ON DESKTOP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* SAUS SECTION */}
        <div
          className={`bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4 ${activeTab === "Saus" ? "block" : "hidden md:block"
            }`}
        >
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-[#212121]">Jumlah Keluar Saus</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">Statistik pemakaian opsi saus</p>
          </div>

          {loading ? (
            <div className="space-y-4 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-3 bg-zinc-100 rounded w-1/3" />
                  <div className="h-3 bg-zinc-100 rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : sauceData.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 italic">
              Tidak ada data saus tercatat.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {sauceData.map((sauce, idx) => (
                <div key={`${sauce.name}-${idx}`} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-700">{sauce.name}</span>
                    <span className="font-bold text-[#212121]">
                      {sauce.count.toLocaleString("id-ID")} pcs
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#E52424] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(sauce.count / maxSauceCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PCS / PACKAGING SECTION */}
        <div
          className={`bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4 ${activeTab === "PCS" ? "block" : "hidden md:block"
            }`}
        >
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-[#212121]">Penggunaan Packaging</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">Proporsi kemasan berdasarkan pax dan pcs</p>
          </div>

          {loading ? (
            <div className="space-y-4 py-2 animate-pulse">
              <div className="flex items-center gap-5">
                <div className="w-28 h-28 bg-zinc-100 rounded-full shrink-0" />
                <div className="space-y-2 w-full">
                  <div className="h-3 bg-zinc-100 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ) : packageData.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 italic">
              Tidak ada data packaging tercatat.
            </div>
          ) : (
            <div className="space-y-6 pt-1">
              {/* DONUT CHART & LEGEND */}
              <div className="flex items-center gap-5">
                <div
                  className="relative w-28 h-28 shrink-0 rounded-full flex items-center justify-center transition-all shadow-2xs"
                  style={{ background: chartBackground }}
                >
                  <div className="w-18 h-18 bg-white rounded-full flex flex-col items-center justify-center border border-zinc-100">
                    <span className="text-base font-bold text-[#212121] leading-none">
                      {totalPax}
                    </span>
                    <span className="text-[9px] font-medium text-zinc-400 mt-0.5">total pax</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto pr-1">
                  {packageChart.map((item, idx) => (
                    <div
                      key={`${item.categoryName}-${item.qty}-${idx}`}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-zinc-600 truncate max-w-[150px]">
                        {item.categoryName} ({item.qty} pcs)
                      </span>
                      <span className="font-bold text-zinc-800 ml-auto">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BREAKDOWN BY CATEGORY */}
              <div className="space-y-5 pt-2 border-t border-zinc-100">
                {packageGroups.map((group) => {
                  const categoryTotalPax = group.packages.reduce((sum, p) => sum + p.pax, 0);
                  const categoryTotalPcs = group.packages.reduce(
                    (sum, p) => sum + p.qty * p.pax,
                    0
                  );

                  return (
                    <div key={group.categoryName} className="space-y-2.5">
                      {/* HEADER KATEGORI DENGAN REKAP TOTAL */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                          {group.categoryName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60">
                          <span>Total Pcs Keluar</span>
                          <span>:</span>
                          <span className="text-zinc-900 font-bold">
                            {categoryTotalPcs.toLocaleString("id-ID")} Pcs
                          </span>
                        </div>
                      </div>

                      {/* GRID VARIAN DENGAN DETAIL TOTAL PCS */}
                      <div className="grid grid-cols-3 gap-2">
                        {group.packages.map((item, idx) => {
                          const itemTotalPcs = item.qty * item.pax;

                          return (
                            <div
                              key={`${group.categoryName}-${item.qty}-${idx}`}
                              className="bg-zinc-50/80 p-2.5 rounded-xl border border-zinc-200/60 flex flex-col justify-between text-center transition-all hover:border-zinc-300"
                            >
                              <div>
                                <p className="text-[11px] font-medium text-zinc-500">
                                  {item.qty} pcs/pax
                                </p>
                                <p className="text-xs font-bold text-[#212121] mt-0.5">
                                  {item.pax} pax
                                </p>
                              </div>

                              <div className="mt-2 pt-1.5 border-t border-zinc-200/50">
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block w-full truncate">
                                  {itemTotalPcs.toLocaleString("id-ID")} Pcs
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}