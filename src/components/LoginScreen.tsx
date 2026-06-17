import React, { useState } from 'react';
import { Landmark, LogIn, UserPlus } from 'lucide-react';
import { User, UserRole } from '../types.js';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: User) => void;
}

type AuthMode = 'login' | 'register';

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [groupName, setGroupName] = useState('ИВТ-31');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError('');
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { username, password }
        : { username, password, name, email, role, groupName: role === 'student' ? groupName : undefined };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось выполнить запрос');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-indigo-600 rounded-2xl text-white shadow-md mb-4">
          <Landmark className="h-8 w-8" id="gradebook_logo" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Электронный журнал
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Учёт расписания, посещаемости, оценок и лабораторных работ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 rounded-2xl sm:px-10">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    ФИО
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-slate-800"
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Электронная почта
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-slate-800"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Роль
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-slate-800 bg-white"
                  >
                    <option value="student">Студент</option>
                    <option value="teacher">Преподаватель</option>
                  </select>
                </div>

                {role === 'student' && (
                  <div>
                    <label htmlFor="groupName" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Группа
                    </label>
                    <input
                      id="groupName"
                      name="groupName"
                      type="text"
                      required
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-4 py-3 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-slate-800"
                      placeholder="ИВТ-31"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                Логин
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 px-4 py-3 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-slate-800"
                placeholder="Введите логин"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 px-4 py-3 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-slate-800"
                placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Введите пароль'}
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100" id="login_error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id={mode === 'login' ? 'login_btn' : 'register_btn'}
              className="flex w-full justify-center items-center gap-2 px-4 py-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-100 active:scale-95 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer min-h-[44px] disabled:opacity-70"
            >
              {loading ? 'Подождите...' : (
                <>
                  {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
