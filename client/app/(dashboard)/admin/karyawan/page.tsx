"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { api } from "@/lib/api";
import Swal from "sweetalert2";

type Outlet = {
  id: number;
  outletName: string;
  address?: string | null;
  status?: boolean;
};

type Karyawan = {
  id: number;
  name: string;
  category: "Produksi" | "Tenant";
  phone: string | null;
  outletId: number | null;
  outletName: string | null;
  username: string | null;
};

type KaryawanResponse = {
  id: number;
  name: string;
  category: Karyawan["category"];
  phone?: string | null;
  outletId?: number | null;
  outlet?: { outletName: string } | null;
  account?: { username: string } | null;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.error || apiError.response?.data?.message || fallback;
}

type AbsensiItem = {
  id: number;
  name: string;
  outletName: string | null;
  jamKeberangkatan: string;
  jamMasuk: string;
  status: "Hadir" | "Belum Absen";
  fotoMasuk: string | null;
  fotoKeberangkatan: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function suggestUsername(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasAlphaNumeric(value: string) {
  return /[a-z0-9]/i.test(value);
}

function suggestPassword(name: string) {
  return suggestUsername(name) + "123";
}

function KaryawanRow({
  emp,
  onEdit,
  onDelete,
}: {
  emp: Karyawan;
  onEdit: (emp: Karyawan) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="py-3.5 flex justify-between items-center">
      <div>
        <p className="text-xs font-bold text-[#212121]">{emp.name}</p>
        {emp.category === "Tenant" ? (
          <div className="mt-0.5 space-y-0.5">
            <p className="text-[11px] text-zinc-400">
              {emp.outletName ?? "Belum ditempatkan"}
              {emp.username ? ` · @${emp.username}` : ""}
            </p>
            {emp.phone && <p className="text-[11px] text-zinc-400">{emp.phone}</p>}
          </div>
        ) : (
          <div className="mt-0.5 space-y-0.5">
            <p className="text-[11px] text-zinc-400">{emp.category}</p>
            {emp.phone && <p className="text-[11px] text-zinc-400">{emp.phone}</p>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onEdit(emp)}
          title="Edit"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5v4.875c0 .621-.504 1.125-1.125 1.125H5.625A1.125 1.125 0 014.5 18.375V6.375c0-.621.504-1.125 1.125-1.125h4.875" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(emp.id)}
          title="Hapus"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function KaryawanPage() {
  const [mainTab, setMainTab] = useState<"Data" | "Absensi">("Data");
  const [subCategory, setSubCategory] = useState<"Produksi" | "Tenant">("Tenant");
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [isLoadingKaryawan, setIsLoadingKaryawan] = useState(true);

  const fetchKaryawan = async () => {
    try {
      setIsLoadingKaryawan(true);
      const response = await api.get<{ data?: KaryawanResponse[] }>("/api/karyawan");

      const mapped: Karyawan[] = (response.data.data ?? []).map((emp) => ({
        id: emp.id,
        name: emp.name,
        category: emp.category,
        phone: emp.phone ?? null,
        outletId: emp.outletId ?? null,
        outletName: emp.outlet?.outletName ?? null,
        username: emp.account?.username ?? null,
      }));

      setKaryawanList(mapped);
    } catch (error) {
      console.error("Gagal mengambil data karyawan:", error);
    } finally {
      setIsLoadingKaryawan(false);
    }
  };

  const [outletList, setOutletList] = useState<Outlet[]>([]);

  const fetchOutlets = async () => {
    try {
      const response = await api.get<{ data?: Outlet[] }>("/api/outlets");
      setOutletList(response.data.data ?? []);
    } catch (error) {
      console.error("Gagal mengambil data outlet:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchKaryawan(), fetchOutlets()]);
    };

    void loadData();
  }, []);

  const [absensiList, setAbsensiList] = useState<AbsensiItem[]>([]);
  const [isLoadingAbsensi, setIsLoadingAbsensi] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const fetchAbsensi = useCallback(async () => {
    try {
      setIsLoadingAbsensi(true);
      const response = await api.get<{ data?: AbsensiItem[] }>(`/api/absen/all?date=${attendanceDate}`);
      setAbsensiList(response.data.data ?? []);
    } catch (error) {
      console.error("Gagal mengambil data absensi:", error);
    } finally {
      setIsLoadingAbsensi(false);
    }
  }, [attendanceDate]);

  useEffect(() => {
    const loadAbsensi = async () => {
      await fetchAbsensi();
    };

    void loadAbsensi();
  }, [fetchAbsensi]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<"Produksi" | "Tenant">("Tenant");
  const [formOutletId, setFormOutletId] = useState<number | "">("");
  const [formPhone, setFormPhone] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal info username + password setelah karyawan tenant baru berhasil ditambah
  const [newAccountInfo, setNewAccountInfo] = useState<{ username: string; password: string } | null>(null);

  const filteredKaryawan = karyawanList.filter((emp) => emp.category === subCategory);

  const openAddForm = () => {
    setEditingId(null);
    setFormName("");
    setFormCategory(subCategory);
    setFormOutletId("");
    setFormPhone("");
    setFormUsername("");
    setUsernameTouched(false);
    setUsernameError("");
    setIsFormOpen(true);
  };

  const openEditForm = (emp: Karyawan) => {
    setEditingId(emp.id);
    setFormName(emp.name);
    setFormCategory(emp.category);
    setFormOutletId(emp.outletId ?? "");
    setFormPhone(emp.phone ?? "");
    setFormUsername(emp.username ?? "");
    setUsernameTouched(true); 
    setUsernameError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleNameChange = (value: string) => {
    setFormName(value);
    if (!usernameTouched) {
      setFormUsername(suggestUsername(value));
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsernameTouched(true);
    setFormUsername(value);
    setUsernameError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formName.trim() || !hasAlphaNumeric(formName)) {
      alert("Nama karyawan tidak boleh hanya berisi spasi atau simbol.");
      return;
    }

    if (formCategory === "Tenant") {
      if (!formOutletId) {
        alert("Pilih tenant/outlet penempatan karyawan ini dulu.");
        return;
      }

      const cleanUsername = formUsername.trim().toLowerCase();
      if (!cleanUsername || !hasAlphaNumeric(cleanUsername)) {
        setUsernameError("Username tidak boleh hanya berisi spasi atau simbol.");
        return;
      }

      const isDuplicate = karyawanList.some(
        (emp) => emp.username === cleanUsername && emp.id !== editingId
      );
      if (isDuplicate) {
        setUsernameError("Username ini sudah dipakai, coba username lain.");
        return;
      }
    }

    const payload = {
      name: formName,
      category: formCategory,
      phone: formPhone.trim() || null,
      outletId: formCategory === "Tenant" ? formOutletId : null,
      username: formCategory === "Tenant" ? formUsername.trim().toLowerCase() : null,
    };

    setIsSubmitting(true);
    try {
      if (editingId === null) {
        // MODE TAMBAH
        const response = await api.post("/api/karyawan", payload);

        if (response.data.data?.account) {
          setNewAccountInfo({
            username: response.data.data.account.username,
            password: response.data.data.account.password,
          });
        }
      } else {
        // MODE EDIT
        await api.put(`/api/karyawan/${editingId}`, payload);
        closeForm();
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data karyawan berhasil diperbarui.",
          confirmButtonText: "OK",
        });
      }

      await fetchKaryawan();
      closeForm();
    } catch (error: unknown) {
      console.error("Gagal menyimpan karyawan:", error);
      alert(getApiErrorMessage(error, "Gagal menyimpan data karyawan."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Data karyawan yang dihapus tidak dapat dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/karyawan/${id}`);
      await fetchKaryawan();
    } catch (error: unknown) {
      console.error("Gagal menghapus karyawan:", error);
      alert(getApiErrorMessage(error, "Gagal menghapus karyawan."));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200/80 flex justify-between items-center shadow-2xs">
        <div>
          <h1 className="text-base md:text-xl font-bold text-[#212121]">Kelola Karyawan</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Manajemen staf produksi dan tenant</p>
        </div>
      </div>

      {/* MOBILE TAB SWITCHER (Hidden on Desktop) */}
      <div className="flex md:hidden bg-white p-1 rounded-2xl border border-zinc-200/80">
        <button
          onClick={() => setMainTab("Data")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            mainTab === "Data" ? "bg-[#E52424] text-white" : "text-zinc-500"
          }`}
        >
          Data Karyawan
        </button>
        <button
          onClick={() => setMainTab("Absensi")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            mainTab === "Absensi" ? "bg-[#E52424] text-white" : "text-zinc-500"
          }`}
        >
          Absensi Karyawan
        </button>
      </div>

      {/* RESPONSIVE GRID CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION: DATA KARYAWAN */}
        <div className={`space-y-4 ${mainTab === "Data" ? "block" : "hidden md:block"}`}>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#212121]">Data Karyawan</h2>
              <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
                {(["Produksi", "Tenant"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSubCategory(cat)}
                    className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                      subCategory === cat ? "bg-white text-[#212121] shadow-xs" : "text-zinc-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingKaryawan ? (
              <p className="text-xs text-zinc-400 py-4 text-center">Memuat data karyawan...</p>
            ) : filteredKaryawan.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">Belum ada karyawan di kategori ini.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredKaryawan.map((emp) => (
                  <KaryawanRow key={emp.id} emp={emp} onEdit={openEditForm} onDelete={handleDelete} />
                ))}
              </div>
            )}

            <button
              onClick={openAddForm}
              className="w-full py-2.5 bg-[#E52424] text-white font-semibold text-xs rounded-xl active:scale-98 transition-all"
            >
              + Tambah Karyawan
            </button>
          </div>
        </div>

        {/* SECTION: ABSENSI KARYAWAN */}
        <div className={`space-y-4 ${mainTab === "Absensi" ? "block" : "hidden md:block"}`}>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#212121]">Absensi Karyawan</h2>
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                aria-label="Pilih tanggal absensi"
                className="text-xs font-semibold text-zinc-500 bg-zinc-50 px-2 py-1 rounded-xl border border-zinc-200/60 outline-none focus:border-[#E52424]"
              />
            </div>

            {isLoadingAbsensi ? (
              <p className="text-xs text-zinc-400 py-4 text-center">Memuat data absensi...</p>
            ) : absensiList.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">Belum ada karyawan tenant.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {absensiList.map((item) => (
                  <div key={item.id} className="py-3.5 flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#212121] truncate">{item.name}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{item.outletName ?? "-"}</p>
                  {item.status === "Belum Absen" ? (
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                      Belum ada absensi hari ini
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      Keberangkatan {item.jamKeberangkatan} · Masuk {item.jamMasuk} WIB
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                      item.status === "Hadir"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {item.status}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.fotoKeberangkatan && (
                      <button
                        type="button"
                        title="Lihat foto keberangkatan"
                        aria-label={`Lihat foto keberangkatan ${item.name}`}
                        onClick={() => setSelectedPhoto(getImageUrl(item.fotoKeberangkatan))}
                        className="w-8 h-8 inline-flex items-center justify-center bg-zinc-100 hover:bg-[#E52424]/10 hover:text-[#E52424] text-zinc-600 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                    {item.fotoMasuk && (
                      <button
                        type="button"
                        title="Lihat foto masuk"
                        aria-label={`Lihat foto masuk ${item.name}`}
                        onClick={() => setSelectedPhoto(getImageUrl(item.fotoMasuk))}
                        className="w-8 h-8 inline-flex items-center justify-center bg-zinc-100 hover:bg-[#E52424]/10 hover:text-[#E52424] text-zinc-600 rounded-lg transition-colors"
                      >
                        <svg className="hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5M10 12h10m0 0l-4-4m4 4l-4 4M4 4h5v16H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                          <circle cx="7" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.8" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 10l-1 4 2 2 2 4m-3-5l-3 1m5-1l3 2m-5 3l-2 2m5-2l2 1M12 4h7a2 2 0 012 2v12a2 2 0 01-2 2h-7M12 4v7" />
                        </svg>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2 2 2 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedPhoto && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl space-y-3 p-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <h4 className="text-xs font-bold text-zinc-800">Foto Bukti Absensi</h4>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  aria-label="Tutup foto bukti absensi"
                  className="text-zinc-400 hover:text-zinc-600 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="relative aspect-3/4 bg-zinc-900 rounded-xl overflow-hidden">
                <img src={selectedPhoto} alt="Bukti Absen" className="w-full h-full object-cover" />
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
      </div>

      {/* MODAL FORM TAMBAH/EDIT KARYAWAN */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#212121]">
                {editingId !== null ? "Edit Karyawan" : "Tambah Karyawan"}
              </h3>
              <button
                onClick={closeForm}
                className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Nama Karyawan</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Masukkan nama"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Kategori</label>
                <div className="flex gap-2">
                  {(["Produksi", "Tenant"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      disabled={editingId !== null}
                      onClick={() => setFormCategory(cat)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        formCategory === cat
                          ? "bg-[#E52424] text-white border-[#E52424]"
                          : "bg-white text-zinc-500 border-zinc-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400">
                  {editingId !== null
                    ? "Kategori tidak bisa diubah setelah karyawan dibuat."
                    : 'Kategori "Tenant" otomatis dibuatkan akun login kasir.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">No. HP</label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424]"
                />
              </div>

              {/* FIELD TAMBAHAN — CUMA MUNCUL KALAU KATEGORINYA TENANT */}
              {formCategory === "Tenant" && (
                <div className="space-y-4 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-600">Penempatan Tenant</label>
                    <select
                      required
                      value={formOutletId}
                      onChange={(e) => setFormOutletId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424] bg-white"
                    >
                      <option value="">Pilih tenant...</option>
                      {outletList.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.outletName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-600">Username Login Kasir</label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="Otomatis terisi dari nama"
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-[#E52424] bg-white"
                    />
                    {usernameError ? (
                      <p className="text-[10px] text-red-500 font-semibold">{usernameError}</p>
                    ) : (
                      <p className="text-[10px] text-zinc-400">
                        Saran otomatis dari nama, boleh diubah jika sudah dipakai.
                      </p>
                    )}
                  </div>

                  {editingId === null && formName.trim() && (
                    <p className="text-[10px] text-zinc-500 bg-white border border-zinc-200 rounded-lg p-2">
                      Password awal akan sama dengan:{" "}
                      <span className="font-mono font-semibold">{suggestPassword(formName)}</span>. Kasir wajib
                      menggantinya saat login pertama kali.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-semibold hover:bg-zinc-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#E52424] text-white text-xs font-semibold hover:bg-[#D91F1F] transition-all disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : editingId !== null ? "Simpan Perubahan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INFO AKUN BARU DIBUAT */}
      {newAccountInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#212121]">Akun Kasir Berhasil Dibuat</h3>
            </div>

            <p className="text-xs text-zinc-500">
              Catat atau screenshot info berikut, lalu sampaikan ke karyawan yang bersangkutan.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">Username</span>
                <span className="text-xs font-mono font-semibold text-[#212121]">{newAccountInfo.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">Password</span>
                <span className="text-xs font-mono font-semibold text-[#212121]">{newAccountInfo.password}</span>
              </div>
            </div>

            <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg p-2">
              Karyawan wajib mengganti password ini saat login pertama kali.
            </p>

            <button
              onClick={() => setNewAccountInfo(null)}
              className="w-full py-2.5 rounded-xl bg-[#E52424] text-white text-xs font-semibold hover:bg-[#D91F1F] transition-all"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
