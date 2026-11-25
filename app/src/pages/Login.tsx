import { useAuth } from '../lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow">
        <h1 className="mb-2 text-2xl font-bold text-[#6e0909]">Tra cứu chứng từ kho</h1>
        <p className="mb-6 text-sm text-neutral-600">Chỉ dùng tài khoản @daidung.vn</p>
        <button onClick={signIn} className="w-full rounded bg-[#6e0909] px-4 py-2 font-bold text-white hover:bg-[#560606]">
          Đăng nhập bằng Google
        </button>
      </div>
    </div>
  );
}
