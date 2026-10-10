import { NavLink } from "react-router-dom";
import {
  XMarkIcon,
  Squares2X2Icon,
  UsersIcon,
  HeartIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  ChartBarSquareIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
  GitBranch,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const navigationItems = [
  { key: 'dashboard', href: "/", icon: Squares2X2Icon },
  { key: 'members', href: "/members", icon: UsersIcon },
  { key: 'data_entry', href: "/data-entry", icon: UserPlus },
  { key: 'families', href: "/families", icon: GitBranch },
  { key: 'family_tree', href: "/family-tree", icon: GitBranch },
  { key: 'notifications', href: "/notifications", icon: BellIcon },
  { key: 'reports', href: "/reports", icon: ChartBarSquareIcon },
 
];

export default function Sidebar({ isOpen, toggle }) {
  const { t } = useLanguage();

  return (
    <>
      {isOpen && (
        <div
          onClick={toggle}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-800">
                  {t('app_name')}
                </h1>
                <p className="text-xs text-slate-500">
                  {t('management_system')}
                </p>
              </div>
            </div>
            <button
              onClick={toggle}
              className="lg:hidden rounded-lg p-2 hover:bg-slate-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const label = t(item.key);
                return (
                  <li key={item.key}>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      className={({ isActive }) =>
                        `group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200
                        ${
                          isActive
                            ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg"
                            : "text-slate-700 hover:bg-slate-100 hover:text-green-600"
                        }`
                      }
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span className="font-medium">{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Card */}
          <div className="p-5 border-t border-slate-200">
            <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 p-4 text-white shadow-lg">
              <h3 className="font-semibold">{t('app_description_short')}</h3>
              <p className="text-sm mt-1 text-green-100">{t('digital_genealogy')}</p>
            </div>
            <p className="text-center text-xs text-slate-400 mt-5">
              © 2026 NDS Software
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
