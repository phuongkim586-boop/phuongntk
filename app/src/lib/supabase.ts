import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_KEY as string;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Kiểu dữ liệu các view/bảng dùng trong trang
export type Chung = {
  drive_id: string;
  so_phieu: string;
  loai: string;
  ngay: string | null;
  du_an_ma: string | null;
  du_an: string | null;
  nha_cung_cap: string | null;
  loai_giao_dich: string | null;
  lenh_po: string | null;
  so_xe: string | null;
  noi_dung: string | null;
  ten_tep: string | null;
  thu_muc: string | null;
};

export type DoiSoat = {
  so_ct: string;
  ngay: string | null;
  nguoi_nhap: string | null;
  loai: string;
  so_dong: number;
  huy: boolean;
  da_scan: boolean;
  so_po: string | null;
  so_yc: string | null;
  ten_da: string | null;
  ncc: string | null;
  truck: string | null;
};

export type TaiKhoan = {
  id: string;
  email: string;
  trang_thai: 'cho_duyet' | 'da_duyet' | 'tu_choi';
  la_quan_tri: boolean;
  vai_tro: string | null;
};
