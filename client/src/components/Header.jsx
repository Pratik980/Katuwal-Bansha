import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { getUnreadCount } from "../api/notifications";

// Which page is open, by the first part of the address
const PAGE_TITLES = {
  "": "dashboard",
  dashboard: "dashboard",
  members: "members",
  "data-entry": "data_entry",
  families: "families",
  "family-tree": "family_tree",
  notifications: "notifications",
  reports: "reports",
};

// No login yet: the name shown here comes from the site's settings (VITE_ADMIN_NAME)
const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME || "";

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [search, setSearch] = useState("");

  const { data: unread } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: getUnreadCount,
    staleTime: 60 * 1000,
  });
  const unreadCount = unread?.unread || 0;

  const pageKey = PAGE_TITLES[location.pathname.split("/")[1] || ""];
  const adminName = ADMIN_NAME || t('administrator');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/members?search=${encodeURIComponent(search.trim())}`);
    setSearch("");
  };

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'ne' : 'en');
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-72 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm z-30 transition-all">
      <div className="h-full flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <Bars3Icon className="w-6 h-6 text-slate-700" />
          </button>

          <div className="hidden md:block">
            <h2 className="text-xl font-bold text-slate-800">
              {pageKey ? t(pageKey) : t('app_name')}
            </h2>
            <p className="text-sm text-slate-500">
              {t('welcome_back')} 👋
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_members_families')}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
            />
          </div>
        </form>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLanguageToggle}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition text-sm font-medium text-slate-700"
          >
            {language === 'en' ? '🇳🇵' : '🇬🇧'}
          </button>

          <button
            onClick={() => navigate("/notifications")}
            className="relative w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <BellIcon className="w-5 h-5 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
            )}
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-slate-800">{adminName}</p>
              {ADMIN_NAME && <p className="text-xs text-slate-500">{t('administrator')}</p>}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
