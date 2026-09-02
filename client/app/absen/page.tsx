"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import KasirHeader from "@/components/kasir/KasirHeader";
import BottomNavigation from "@/components/kasir/BottomNavigation";
import RoleGuard from "@/components/auth/RoleGuard";
import Swal from "sweetalert2";

interface AbsenItem {
  id: number;
  userId: number;
  foto: string;
  tipe: string;
  lokasi?: string;
  keterangan?: string;
  createdAt: string;
}

type AttendanceType = "Masuk" | "Keberangkatan";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getJakartaDateKey = (dateValue: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateValue));

const getImageUrl = (path?: string) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

export default function AbsenPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // State Riwayat & Modal
  const [hasAbsendedToday, setHasAbsendedToday] = useState(false);
  const [attendanceType, setAttendanceType] = useState<AttendanceType>("Keberangkatan");
  const [historyList, setHistoryList] = useState<AbsenItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Update Jam Realtime
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    const currentStream = streamRef.current || videoRef.current?.srcObject;
    if (currentStream instanceof MediaStream) {
      currentStream.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    stopCamera();
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (requestId !== cameraRequestRef.current || !videoRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      videoRef.current.srcObject = mediaStream;
    } catch (err) {
      if (requestId !== cameraRequestRef.current) return;
      console.error("Gagal mengakses kamera:", err);
      setCameraError("Akses kamera ditolak atau perangkat tidak ditemukan.");
    }
  }, [stopCamera]);

  // Cek Riwayat Absen & Status Hari Ini
  const fetchHistoryAndCheckToday = useCallback(async () => {
    setIsFetchingStatus(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

      const res = await fetch(`${API_BASE_URL}/api/absen/my-history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Mencegah error crash jika respon dari server bukan JSON
      const result = await res.json().catch(() => null);

      if (res.ok && result) {
        // Mendukung array langsung atau object wrapper { data: [...] }
        const rawData = Array.isArray(result) ? result : result.data || result.history || [];
        const data: AbsenItem[] = Array.isArray(rawData) ? rawData : [];
        setHistoryList(data);

        // Cek apakah ada record absen hari ini
        const todayStr = getJakartaDateKey(new Date());
        const alreadyAbsen = data.some((item) => {
          if (!item.createdAt) return false;
          const itemDate = new Date(item.createdAt);
          return (
            getJakartaDateKey(itemDate) === todayStr &&
            (item.tipe || "Masuk") === attendanceType
          );
        });

        setHasAbsendedToday(alreadyAbsen);
        if (!alreadyAbsen) {
          startCamera();
        }
      } else {
        console.warn("Gagal mengambil riwayat:", result?.message || res.statusText);
        startCamera();
      }
    } catch (error) {
      console.error("Gagal mengambil riwayat absensi:", error);
      startCamera();
    } finally {
      setIsFetchingStatus(false);
    }
  }, [attendanceType, startCamera]);

  useEffect(() => {
    void Promise.resolve().then(fetchHistoryAndCheckToday);
    return () => {
      stopCamera();
    };
  }, [fetchHistoryAndCheckToday, stopCamera]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const resetPhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;

    setIsLoading(true);
    try {
      const file = dataURLtoFile(capturedImage, `absen-${Date.now()}.jpg`);
      const formData = new FormData();
      formData.append("foto", file);
      formData.append("tipe", attendanceType);

      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

      const res = await fetch(`${API_BASE_URL}/api/absen`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (res.ok && (data?.status || data?.success || res.status === 200 || res.status === 201)) {
        await Swal.fire({
          icon: "success",
          title: "Absensi berhasil",
          text: "Data absensi berhasil disimpan.",
          confirmButtonColor: "#E52424",
        });
        setCapturedImage(null);
        fetchHistoryAndCheckToday();
      } else {
        await Swal.fire({
          icon: "error",
          title: "Absensi gagal",
          text: data?.message || "Gagal menyimpan absensi. Silakan coba lagi.",
          confirmButtonColor: "#E52424",
        });
      }
    } catch (error) {
      console.error("Error submitting absen:", error);
      await Swal.fire({
        icon: "error",
        title: "Terjadi kesalahan",
        text: "Terjadi kesalahan jaringan/server.",
        confirmButtonColor: "#E52424",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter riwayat khusus bulan ini
  const currentMonthHistory = historyList.filter((item) => {
    if (!item.createdAt) return false;
    return getJakartaDateKey(item.createdAt) === getJakartaDateKey(new Date());
  });

  const hasDepartureToday = historyList.some(
    (item) =>
      item.createdAt &&
      getJakartaDateKey(item.createdAt) === getJakartaDateKey(new Date()) &&
      item.tipe === "Keberangkatan",
  );

  return (
    <RoleGuard allowedRoles={["kasir"]}>
      <main className="min-h-screen bg-[#F5F5F5] pb-24">
      <canvas ref={canvasRef} className="hidden" />
      <KasirHeader title="Absensi Kasir" />

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Realtime Clock & Status Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-zinc-400">POS Raos Dimsum</p>
            <h2 className="text-base font-bold text-[#212121]">
              {hasAbsendedToday
                ? `Status ${attendanceType} Hari Ini`
                : `Presensi ${attendanceType}`}
            </h2>
          </div>
          <div className="bg-[#E52424]/10 text-[#E52424] font-mono text-xs font-semibold px-3 py-1.5 rounded-full border border-[#E52424]/20">
            {currentTime || "--:--:--"}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-3 shadow-sm">
          <p className="text-xs font-bold text-zinc-700 mb-2">Jenis Absensi</p>
          <div className="grid grid-cols-2 gap-2">
            {(["Keberangkatan", "Masuk"] as AttendanceType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setAttendanceType(type);
                  setCapturedImage(null);
                }}
                disabled={type === "Masuk" && !hasDepartureToday}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  attendanceType === type
                    ? "bg-[#E52424] text-white border-[#E52424]"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {isFetchingStatus ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-400 text-sm">
            Memeriksa status absensi...
          </div>
        ) : hasAbsendedToday ? (
          /* SECTION: JIKA SUDAH ABSEN (TAMPILKAN RIWAYAT BULAN INI) */
          <div className="space-y-4">
            {/* Success Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800">Sudah Absen Hari Ini</p>
                <p className="text-[11px] text-emerald-600">
                  Terima kasih, presensi Anda telah tercatat di sistem.
                </p>
              </div>
            </div>

            {/* Rekap Ringkas Bulan Ini */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-xs text-zinc-400 block">Total Kehadiran</span>
                <span className="text-lg font-bold text-[#212121]">
                  {currentMonthHistory.length} Hari
                </span>
              </div>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
                Bulan {new Date().toLocaleDateString("id-ID", { month: "long" })}
              </span>
            </div>

            {/* List Riwayat Bulan Ini */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Riwayat Absensi Bulan Ini
              </h3>

              {currentMonthHistory.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">Belum ada riwayat bulan ini.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {currentMonthHistory.map((item) => {
                    const dateObj = new Date(item.createdAt);
                    const formattedDate = dateObj.toLocaleDateString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const formattedTime = dateObj.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-800">{formattedDate}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-zinc-500">{formattedTime} WIB</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                              {item.tipe || "Masuk"}
                            </span>
                          </div>
                        </div>

                        {/* Tombol Popup Foto */}
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(getImageUrl(item.foto))}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-[#E52424]/10 hover:text-[#E52424] text-zinc-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Bukti Foto
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SECTION: JIKA BELUM ABSEN (Kamera Absen) */
          <>
            <div className="bg-white rounded-2xl border border-zinc-200 p-3 shadow-sm">
              <div className="relative w-full aspect-3/4 bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center">
                {cameraError ? (
                  <div className="text-center px-6 space-y-3">
                    <svg className="w-10 h-10 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p className="text-xs text-red-400 font-medium">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-2 text-xs bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 transition"
                    >
                      Coba Lagi
                    </button>
                  </div>
                ) : capturedImage ? (
                  <div className="relative w-full h-full">
                    <img src={capturedImage} alt="Preview Absen" className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                      Foto Terambil
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/40 rounded-xl m-6 flex items-center justify-center">
                      <span className="text-[11px] text-white/90 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md font-medium">
                        Posisikan Wajah di Tengah
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              {!capturedImage ? (
                <button
                  type="button"
                  onClick={takePhoto}
                  disabled={!!cameraError}
                  className="w-full py-3.5 bg-[#E52424] hover:bg-[#c81e1e] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#E52424]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Ambil Foto Wajah
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={resetPhoto}
                    disabled={isLoading}
                    className="py-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 shadow-sm"
                  >
                    Foto Ulang
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Proses...</span>
                      </>
                    ) : (
                      <span>Kirim & Masuk</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* POPUP MODAL FOTO BUKTI ABSEN */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-xs font-bold text-zinc-800">Foto Bukti Absensi</h4>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="text-zinc-400 hover:text-zinc-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="relative aspect-3/4 bg-zinc-900 rounded-xl overflow-hidden">
              <img
                src={selectedPhoto}
                alt="Bukti Absen"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <BottomNavigation />
      </main>
    </RoleGuard>
  );
}