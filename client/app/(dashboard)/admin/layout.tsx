"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import Swal from "sweetalert2";

const Icons = {
  Dashboard: ({ active }: { active: boolean }) => (
    <svg className={`w-5 h-5 ${active ? "text-[#E52424]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Karyawan: ({ active }: { active: boolean }) => (
    <svg className={`w-5 h-5 ${active ? "text-[#E52424]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Analisa: ({ active }: { active: boolean }) => (
    <svg className={`w-5 h-5 ${active ? "text-[#E52424]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21H21M3 21V13H9V21M9 21V3H15V21M15 21V9H21V21" />
    </svg>
  ),
  Produk: ({ active }: { active: boolean }) => (
    <svg className={`w-5 h-5 ${active ? "text-[#E52424]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
    Tenant: ({ active }: { active: boolean }) => (
    <svg className={`w-5 h-5 ${active ? "text-[#E52424]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1.5-4.5A2 2 0 016.4 3h11.2a2 2 0 011.9 1.5L21 9m-18 0v9a2 2 0 002 2h14a2 2 0 002-2V9m-18 0h18M9 21v-6a1 1 0 011-1h4a1 1 0 011 1v6" />
    </svg>
  ),
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Kamu akan keluar dari akun ini.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, logout",
      cancelButtonText: "Batal",
      confirmButtonColor: "#E52424",
    });

    if (!result.isConfirmed) return;

    localStorage.clear();
    await Swal.fire({
      icon: "success",
      title: "Berhasil logout",
      timer: 1200,
      showConfirmButton: false,
    });
    router.replace("/login");
  };

  type NavIcon = (props: { active: boolean }) => React.ReactNode;

  const navItems: Array<{ label: string; path: string; Icon: NavIcon }> = [
    { label: "Dashboard", path: "/admin", Icon: Icons.Dashboard },
    { label: "Karyawan", path: "/admin/karyawan", Icon: Icons.Karyawan },
    { label: "Tenant", path: "/admin/tenant", Icon: Icons.Tenant },
    { label: "Analisa", path: "/admin/analisa", Icon: Icons.Analisa },
    { label: "Produk", path: "/admin/produk", Icon: Icons.Produk },
  ];

  const mobileNavItems: Array<{
    label: string;
    path?: string;
    Icon: NavIcon;
    isLogout?: boolean;
  }> = [
    ...navItems,
    {
      label: "Keluar",
      Icon: ({ active }: { active: boolean }) => (
        <svg className={`w-5 h-5 ${active ? "text-[#E52424]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 15l3-3m0 0l-3-3m3 3H3" />
        </svg>
      ),
      isLogout: true,
    },
  ];

  return (
    <RoleGuard allowedRoles={["admin", "master"]}>
      <div className="w-full min-h-screen bg-[#F5F6F8] text-[#212121] font-sans antialiased flex flex-col md:flex-row">
      
      {/* DESKTOP SIDEBAR (Visible md:flex) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200/80 sticky top-0 h-screen p-5 z-50">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#E52424] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            R
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#212121]">RAOS DIMSUM</h2>
            <p className="text-[10px] text-zinc-400 font-medium">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ label, path, Icon }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={path}
                href={path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-red-50 text-[#E52424]"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Icon active={isActive} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Info Footer */}
        <div className="pt-4 border-t border-zinc-100 flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center text-xs font-bold">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#212121] truncate">Admin Raos</p>
            <p className="text-[10px] text-zinc-400 truncate">admin@raosdimsum.com</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="w-8 h-8 rounded-lg bg-red-50 text-[#E52424] flex items-center justify-center hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 15l3-3m0 0l-3-3m3 3H3" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <main className="flex-1 pb-20 md:pb-8 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION (Visible < md) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white border-t border-zinc-200 h-[64px] flex items-center justify-around z-50 px-2">
          {mobileNavItems.map(({ label, path, Icon, isLogout }) => {
            if (isLogout) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={handleLogout}
                  className="flex flex-col items-center justify-center flex-1 h-full py-1 text-zinc-400"
                >
                  <Icon active={false} />
                  <span className="text-[11px] mt-1 tracking-tight font-medium">{label}</span>
                </button>
              );
            }

            if (!path) return null;

            const isActive = pathname === path;
            return (
              <Link
                key={path}
                href={path}
                className="flex flex-col items-center justify-center flex-1 h-full py-1"
              >
                <Icon active={isActive} />
                <span className={`text-[11px] mt-1 tracking-tight ${isActive ? "font-bold text-[#E52424]" : "font-medium text-zinc-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      </div>
    </RoleGuard>
  );
}