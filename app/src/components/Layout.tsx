import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const link = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-2 ${isActive ? 'bg-white/15 font-bold' : 'hover:bg-white/10'}`;

export default function Layout({ children }: { children: ReactNode }) {
  const { me, signOut } = useAuth();
  const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-gradient-to-b from-[#6e0909] to-[#3f0404] p-3 text-white">
        <div className="mb-4 px-2 text-lg font-bold">Kho An Hạ</div>
        <nav className="space-y-1">
          <NavLink to="/" end className={link}>1. Tra cứu chứng từ</NavLink>
          {me?.la_quan_tri && <NavLink to="/thong-ke" className={link}>6. Thống kê nhập liệu</NavLink>}
          {me?.la_quan_tri && <NavLink to="/du-lieu" className={link}>Dữ liệu & đồng bộ</NavLink>}
          {me?.la_quan_tri && <NavLink to="/tai-khoan" className={link}>Duyệt tài khoản</NavLink>}
        </nav>
        <div className="mt-auto space-y-2 border-t border-white/20 pt-3 text-sm">
          <div className="break-all">{me?.email}{me?.vai_tro === 'super_admin' ? ' · Super Admin' : me?.la_quan_tri ? ' · Quản trị' : ''}</div>
          <div className="opacity-80">{now} · GMT+7</div>
          <button onClick={signOut} className="w-full rounded border border-white/40 px-2 py-1 hover:bg-white/10">Đăng xuất</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
