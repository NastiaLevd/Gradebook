import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen.js';
import StudentPortal from './components/StudentPortal.js';
import TeacherPortal from './components/TeacherPortal.js';
import { User } from './types.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async (currentToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
        setToken(currentToken);
      } else {
        localStorage.removeItem('gradebook_token');
      }
    } catch (e) {
      console.error('Failed to authenticate token:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('gradebook_token');
    if (savedToken) {
      checkAuth(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, authenticatedUser: User) => {
    localStorage.setItem('gradebook_token', newToken);
    setToken(newToken);
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('gradebook_token');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium font-sans">Синхронизация учетной записи...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (!token) return null;

  return user.role === 'teacher' ? (
    <TeacherPortal user={user} token={token} onLogout={handleLogout} />
  ) : (
    <StudentPortal user={user} token={token} onLogout={handleLogout} />
  );
}
