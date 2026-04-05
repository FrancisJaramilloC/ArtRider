"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield } from "lucide-react";

export default function ProfileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Información Personal",
      href: "/profile",
      icon: User,
    },
    {
      name: "Seguridad",
      href: "/profile/security",
      icon: Shield,
    },
  ];

  return (
    <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 hide-scrollbar">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[0.95rem] font-medium whitespace-nowrap transition-all ${
              isActive
                ? "bg-purple-50 text-[#875B9A]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-[#875B9A]" : "text-gray-400"}`} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
