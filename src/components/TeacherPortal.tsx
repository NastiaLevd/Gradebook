import { useEffect, useState } from 'react';
import { BookOpen, Calendar, Grid, LogOut } from 'lucide-react';
import { Lesson, Subject, User } from '../types.js';
import ScheduleWidget from './ScheduleWidget.js';

interface TeacherPortalProps {
  user: User;
  token: string;
  onLogout: () => void;
}

export default function TeacherPortal({ user, token, onLogout }: TeacherPortalProps) {
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const [scheduleRes, subjectsRes] = await Promise.all([
        fetch('/api/schedule', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [scheduleData, subjectsData] = await Promise.all([
        scheduleRes.json(),
        subjectsRes.json()
      ]);

      setSchedule(scheduleData);
      setSubjects(subjectsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user.id, token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 rounded-xl text-white">
              <Grid className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm sm:text-base">Электронный журнал</span>
              <span className="text-[10px] sm:text-xs font-mono block text-slate-400 mt-0.5 leading-none">Кабинет преподавателя</span>
            </div>
          </div>
          <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition" title="Выйти">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <section className="bg-slate-900 text-white py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">Базовый кабинет преподавателя</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">{user.name}</h1>
            <p className="text-sm text-slate-400 mt-1">Просмотр расписания и закрепленных предметов.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 text-sm font-mono">
            <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Дисциплины</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{subjects.length}</span>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <p className="text-center text-slate-500 py-20">Загрузка данных...</p>
        ) : (
          <>
            <section className="bg-white border border-slate-100 rounded-2xl p-5">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-amber-600" />
                Закрепленные предметы
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subjects.map(subject => (
                  <div key={subject.id} className="border border-slate-100 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-800">{subject.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">ID: {subject.id}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="sr-only">
                <Calendar className="w-5 h-5" />
                Расписание
              </h2>
              <ScheduleWidget schedule={schedule} role="teacher" />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
