"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // =====================================================
  // LOGIN
  // =====================================================

  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setErrorMessage("");

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!data.status) {
      setErrorMessage(data.message);
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.removeItem("outletId");
    if (data.role === "admin") {
      router.push("/admin");
    } else if (data.role === "kasir") {
      router.push("/kasir");
    }
  } catch (error) {
    setErrorMessage("Tidak bisa terhubung ke server");
  }
};

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 sm:p-6">

      {/* =====================================================
          BACKGROUND DECORATION
      ====================================================== */}

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#E52424]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#2F80C3]/5 blur-3xl" />
      </div>

      {/* =====================================================
          LOGIN CONTAINER
      ====================================================== */}

      <div className="relative w-full max-w-[1050px] overflow-hidden rounded-3xl bg-white border border-zinc-200 shadow-[0_20px_60px_rgba(33,33,33,0.10)]">
        <div className="grid min-h-[620px] lg:grid-cols-2">

          {/* =====================================================
              LEFT SIDE
          ====================================================== */}

          <section className="relative hidden lg:flex flex-col justify-between bg-[#E52424] p-12 xl:p-16 overflow-hidden">
            {/* Decorative Circles */}
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border-[70px] border-white/5" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full border-[60px] border-white/5" />
            <div className="absolute top-1/2 right-10 w-20 h-20 rounded-full bg-white/5" />

            {/* Brand */}
            <div className="relative">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-bold tracking-[0.18em] text-white">
                    RAOS
                  </h1>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                    Point of Sale
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="relative max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70 mb-5">
                Management System
              </p>
              <h2 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-white">
                Kelola bisnis
                <br />
                lebih mudah.
              </h2>
              <p className="mt-6 text-sm leading-7 text-white/75 max-w-sm">
                Satu sistem untuk mengelola transaksi, produk,
                pembayaran, dan laporan penjualan RAOS.
              </p>
            </div>

            {/* Bottom Status */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#35A853] shadow-[0_0_8px_rgba(53,168,83,0.8)]" />
                <span className="text-xs text-white/70">
                  System Online
                </span>
              </div>
              <span className="text-xs text-white/50">
                v1.0.0
              </span>
            </div>
          </section>

          {/* =====================================================
              RIGHT SIDE - LOGIN
          ====================================================== */}

          <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
            <div className="w-full max-w-[390px]">

              {/* MOBILE LOGO */}
              <div className="flex lg:hidden items-center gap-3 mb-12">
                <div>
                  <h1 className="text-xl font-bold tracking-[0.18em] text-[#212121]">
                    RAOS
                  </h1>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
                    Point of Sale
                  </p>
                </div>
              </div>

              {/* HEADER */}
              <div className="mb-9">
                <h2 className="text-3xl font-bold tracking-tight text-[#212121]">
                  Selamat datang
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Masuk ke akun Anda untuk melanjutkan.
                </p>
              </div>

              {/* FORM */}
              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                {/* USERNAME */}
                <div>
                  <label
                    htmlFor="username"
                    className="block mb-2 text-sm font-semibold text-[#212121]"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0"
                      />
                    </svg>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(event) =>
                        setUsername(event.target.value)
                      }
                      className="w-full h-12 rounded-xl border border-zinc-200 bg-[#F5F5F5] pl-12 pr-4 text-sm text-[#212121] outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-[#E52424] focus:bg-white focus:ring-4 focus:ring-[#E52424]/10"
                      required
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="password"
                      className="text-sm font-semibold text-[#212121]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Fitur lupa password belum tersedia."
                        )
                      }
                      className="text-xs font-semibold text-[#E52424] hover:text-[#c91d1d] transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>

                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M16.5 10.5V7.125a4.5 4.5 0 00-9 0V10.5m-.75 0h10.5a1.5 1.5 0 011.5 1.5v7.125a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z"
                      />
                    </svg>

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      className="w-full h-12 rounded-xl border border-zinc-200 bg-[#F5F5F5] pl-12 pr-12 text-sm text-[#212121] outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-[#E52424] focus:bg-white focus:ring-4 focus:ring-[#E52424]/10"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#E52424] transition-colors"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M3.98 8.223A10.477 10.477 0 001.5 12c2.25 4.5 6 7.5 10.5 7.5 1.78 0 3.44-.45 4.91-1.24M6.228 6.228A10.45 10.45 0 0112 4.5c4.5 0 8.25 3 10.5 7.5a11.12 11.12 0 01-2.07 3.04M3 3l18 18"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            strokeWidth="1.8"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* REMEMBER */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="remember"
                    type="checkbox"
                    className="w-4 h-4 rounded border-zinc-300 accent-[#E52424] cursor-pointer"
                  />
                  <label
                    htmlFor="remember"
                    className="text-xs text-zinc-500 cursor-pointer"
                  >
                    Ingat saya di perangkat ini
                  </label>
                </div>

                {/* ERROR MESSAGE */}
                {errorMessage && (
                  <p className="text-sm text-red-500">{errorMessage}</p>
                )}

                {/* LOGIN BUTTON */}
                <button
                  type="submit"
                  className="group w-full h-12 mt-2 rounded-xl bg-[#E52424] text-sm font-semibold text-white transition-all duration-200 hover:bg-[#D91F1F] hover:shadow-lg hover:shadow-[#E52424]/20 active:scale-[0.99]"
                >
                  <span className="flex items-center justify-center gap-2">
                    Login
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 12h14m-6-6l6 6-6 6"
                      />
                    </svg>
                  </span>
                </button>
              </form>

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}