import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Search from './pages/Search';
import Stats from './pages/Stats';
import Accounts from './pages/Accounts';
import Data from './pages/Data';

export default function App() {
  const { me, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Đang tải…</div>;
  if (!me) return <Login />;
  if (me.trang_thai !== 'da_duyet') {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-xl bg-white p-8 shadow">
        <h2 className="mb-3 text-xl font-bold">Tài khoản đang chờ duyệt</h2>
        <p>Tài khoản <b>{me.email}</b> đã đăng nhập nhưng chưa được quản trị viên duyệt. Vui lòng báo quản trị viên, rồi bấm “Kiểm tra lại” bằng cách tải lại trang.</p>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Search />} />
        <Route path="/thong-ke" element={me.la_quan_tri ? <Stats /> : <Navigate to="/" />} />
        <Route path="/du-lieu" element={me.la_quan_tri ? <Data /> : <Navigate to="/" />} />
        <Route path="/tai-khoan" element={me.la_quan_tri ? <Accounts /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
