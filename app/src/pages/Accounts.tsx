import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, type TaiKhoan } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// Duyệt tài khoản: chỉ quản trị viên. Quyền thật do máy chủ kiểm tra (trigger chan_doi_quyen).
export default function Accounts() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ['tai-khoan'],
    queryFn: async (): Promise<TaiKhoan[]> => {
      const { data, error } = await supabase.from('tai_khoan')
        .select('id,email,trang_thai,la_quan_tri,vai_tro').order('email');
      if (error) throw error;
      return data as TaiKhoan[];
    },
  });

  async function capNhat(id: string, patch: Partial<TaiKhoan>) {
    const { error } = await supabase.from('tai_khoan').update(patch).eq('id', id);
    if (error) alert(error.message);
    qc.invalidateQueries({ queryKey: ['tai-khoan'] });
  }

  if (isPending) return <p>Đang tải…</p>;
  if (error) return <p className="text-red-700">Lỗi: {(error as Error).message}</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#6e0909]">Duyệt tài khoản</h1>
      <div className="overflow-x-auto rounded bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-100">
            <tr><th className="p-2">Email</th><th className="p-2">Trạng thái</th><th className="p-2">Quản trị</th><th className="p-2">Thao tác</th></tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{t.email}{t.vai_tro === 'super_admin' ? ' (Super Admin)' : ''}</td>
                <td className="p-2">{t.trang_thai}</td>
                <td className="p-2">{t.la_quan_tri ? 'Có' : 'Không'}</td>
                <td className="space-x-2 p-2">
                  {t.trang_thai !== 'da_duyet' && <button className="underline" onClick={() => capNhat(t.id, { trang_thai: 'da_duyet' })}>Duyệt</button>}
                  {t.trang_thai === 'da_duyet' && t.id !== me?.id && <button className="underline" onClick={() => capNhat(t.id, { trang_thai: 'tu_choi' })}>Khoá</button>}
                  {me?.vai_tro === 'super_admin' && t.id !== me?.id && (
                    <button className="underline" onClick={() => capNhat(t.id, { la_quan_tri: !t.la_quan_tri })}>
                      {t.la_quan_tri ? 'Bỏ quản trị' : 'Cấp quản trị'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
