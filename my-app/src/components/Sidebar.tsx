"use client";
import { useRouter, usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/products', label: 'Products' },
  { href: '/reminders', label: 'Reminders' },
  { href: '/logs', label: 'Logs', adminOnly: true },
];

export default function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <aside className="hidden md:block w-60 shrink-0 h-screen sticky top-0 bg-white border-r">
      <div className="px-4 py-4 border-b">
        <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">PS</div>
      </div>
      <nav className="p-2 space-y-1">
        {nav.filter(i => !i.adminOnly || isAdmin).map(item => {
          const active = pathname?.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={()=>router.push(item.href)}
              className={`w-full text-left px-3 py-2 rounded-md ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}


