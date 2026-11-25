import { useQuery } from '@tanstack/react-query';
import { supabase, type DoiSoat } from '../lib/supabase';

// Mục 6: chỉ quản trị viên. Dữ liệu từ view v_doi_soat trên máy chủ.
export default function Stats() {
  const { data, isPending, error } = useQuery({
    queryKey: ['doi-soat'],
    queryFn: async (): Promise<DoiSoat[]> => {
      const { data, error } = await supabase
        .from('v_doi_soat').select('*').order('ngay', { ascending: false }).limit(5000);
      if (error) throw error;
      return data as DoiSoat[];
    },
  });

  if (isPending) return <p>Đang tải thống kê…</p>;
  if (error) return <p className="text-red-700">Lỗi: {(error as Error).message}</p>;

  const dem = (f: (d: DoiSoat) => boolean) => data.filter(f).length;
  const tong = data.length;
  const nhap = dem((d) => d.loai === 'Nhập' && !d.huy);
  const xuat = dem((d) => d.loai === 'Xuất' && !d.huy);
  const scan = dem((d) => d.da_scan && !d.huy);
  const chuaScan = dem((d) => !d.da_scan && !d.huy);
  const huy = dem((d) => d.huy);

  const dong = (ten: string, so: number) => (
    <li key={ten} className="flex justify-between border-b py-2"><span>{ten}</span><b>{so.toLocaleString('vi-VN')}</b></li>
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#6e0909]">6. Thống kê nhập liệu</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-bold">Tổng quan</h2>
          <ul>
            {dong('Tổng số chứng từ', tong)}
            {dong('Phiếu nhập', nhap)}
            {dong('Phiếu xuất', xuat)}
            {dong('Đã scan', scan)}
            {dong('Chưa scan', chuaScan)}
            {dong('Huỷ / XLHT (cột X)', huy)}
          </ul>
        </section>
      </div>
    </div>
  );
}
