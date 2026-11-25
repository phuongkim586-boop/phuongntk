import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, type Chung } from '../lib/supabase';

// Nhận diện mã: lệnh xuất/nhập, PO, số yêu cầu/lệnh giao (giống bản HTML)
function nhanDang(q: string): { ma?: string; so?: string } {
  const s = q.trim().toUpperCase();
  const lenh = /\b(?:DDC\s)?([A-Z]{2,3}\d{2,3})\s(\d{2})\s(\d{3,5})\b/.exec(s);
  if (lenh) return { ma: `${lenh[1]}/${lenh[2]}-${lenh[3]}` };
  const m = /\b(3[01]\d{8}|4[1-3]\d{8}|1[1-8]\d{8})\b/.exec(s);
  if (m) return { ma: m[1] };
  return { so: s };
}

export default function Search() {
  const [q, setQ] = useState('');
  const [tim, setTim] = useState('');

  const ketQua = useQuery({
    queryKey: ['tra-cuu', tim],
    enabled: tim.length >= 3,
    queryFn: async (): Promise<Chung[]> => {
      const { ma, so } = nhanDang(tim);
      if (ma) {
        const { data, error } = await supabase.rpc('tim_theo_ma', { q: ma });
        if (error) throw error;
        const ids = [...new Set((data as { so_phieu: string }[]).map((x) => x.so_phieu))].slice(0, 300);
        if (!ids.length) return [];
        const { data: rows, error: e2 } = await supabase
          .from('v_tra_cuu').select('*').eq('thu_muc', 'Bo_Phieu_Da_Tach_2026').in('so_phieu', ids).limit(1000);
        if (e2) throw e2;
        return rows as Chung[];
      }
      const { data, error } = await supabase
        .from('v_tra_cuu').select('*').eq('thu_muc', 'Bo_Phieu_Da_Tach_2026')
        .or(`so_phieu.ilike.%${so}%,du_an.ilike.%${so}%,nha_cung_cap.ilike.%${so}%`)
        .limit(500);
      if (error) throw error;
      return data as Chung[];
    },
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#6e0909]">1. Tra cứu chứng từ</h1>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setTim(q.trim()); }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Số phiếu, số PO, số yêu cầu, lệnh xuất (LX125/09-0652), dự án, nhà cung cấp"
          className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2"
        />
        <button className="rounded bg-[#6e0909] px-4 font-bold text-white">Tìm</button>
        <button type="button" onClick={() => { setQ(''); setTim(''); }} className="rounded border px-3">Xoá lọc</button>
      </form>

      {ketQua.isPending && tim && <p>Đang tìm…</p>}
      {ketQua.error && <p className="text-red-700">Lỗi: {(ketQua.error as Error).message}</p>}
      {ketQua.data && (
        <>
          <p className="mb-2 text-sm">Có <b>{ketQua.data.length}</b> chứng từ.</p>
          <div className="overflow-x-auto rounded bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="p-2">Số phiếu</th><th className="p-2">Loại</th><th className="p-2">Ngày</th>
                  <th className="p-2">Dự án</th><th className="p-2">Nhà cung cấp</th><th className="p-2">Số xe</th><th className="p-2">Tệp</th>
                </tr>
              </thead>
              <tbody>
                {ketQua.data.map((r) => (
                  <tr key={r.drive_id} className="border-t">
                    <td className="p-2 font-bold">{r.so_phieu}</td>
                    <td className="p-2">{r.loai}</td>
                    <td className="p-2">{r.ngay ?? ''}</td>
                    <td className="p-2">{r.du_an ?? ''}</td>
                    <td className="p-2">{r.nha_cung_cap ?? ''}</td>
                    <td className="p-2">{r.so_xe ?? ''}</td>
                    <td className="p-2">
                      <a className="text-[#6e0909] underline" target="_blank" rel="noreferrer"
                        href={`https://drive.google.com/file/d/${r.drive_id}/view`}>Mở PDF</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
