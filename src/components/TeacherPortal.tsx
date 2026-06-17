import { useState, useEffect } from 'react';
import { Calendar, BookOpen, Layers, UserCheck, LogOut, GraduationCap, Grid, Settings, ShieldAlert } from 'lucide-react';
import { User, Lesson, Subject } from '../types.js';
import ScheduleWidget from './ScheduleWidget.js';
import TeacherGradebookSpreadsheet from './TeacherGradebookSpreadsheet.js';
import SyllabusConfigurator from './SyllabusConfigurator.js';
import TeacherLabSubmissions from './TeacherLabSubmissions.js';

interface TeacherPortalProps {
  user: User;
  token: string;
  onLogout: () => void;
}

type TabType = 'schedule' | 'gradebook' | 'syllabus' | 'evals';

export default function TeacherPortal({ user, token, onLogout }: TeacherPortalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const [schedRes, subjRes] = await Promise.all([
        fetch('/api/schedule', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [sched, subj] = await Promise.all([
        schedRes.json(),
        subjRes.json()
      ]);

      setSchedule(sched);
      setSubjects(subj.filter((s: Subject) => s.teacherId === user.id));
    } catch (e) {
      console.error('Failed to pull teacher master data:', e);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-600 rounded-xl text-white">
                <Grid className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm sm:text-base">Электронный журнал</span>
                <span className="text-[10px] sm:text-xs font-mono block text-slate-400 mt-0.5 leading-none">Консоль Преподавателя</span>
              </div>
            </div>

            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex text-right flex-col mr-1">
                <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                <span className="text-xs text-amber-600 font-semibold font-mono">Доцент / Академическая Степень</span>
              </div>
              <button
                onClick={onLogout}
                id="teacher_logout_btn"
                className="flex items-center justify-center p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      
      <div className="bg-slate-900 text-white py-8 sm:py-10 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">
                Панель Управления Преподавателя
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">{user.name}</h1>
              <p className="text-sm text-slate-400 mt-1">Организация занятий, синхронизация ведомостей успеваемости и оценка ТЗ решений</p>
            </div>

            
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 flex gap-6 text-sm font-mono shrink-0">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Дисциплины</span>
                <span className="text-lg font-bold text-white mt-0.5 block">{subjects.length} предметов</span>
              </div>
              <div className="w-px h-full bg-slate-705"></div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Группы</span>
                <span className="text-lg font-bold text-amber-500 mt-0.5 block">ИВТ-31, ИВТ-32</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex -mb-px space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('schedule')}
              id="tab_teacher_schedule"
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Расписание
            </button>

            <button
              onClick={() => setActiveTab('gradebook')}
              id="tab_teacher_gradebook"
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'gradebook'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Журнал оценок
            </button>

            <button
              onClick={() => setActiveTab('syllabus')}
              id="tab_teacher_syllabus"
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'syllabus'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Программа по предмету
            </button>

            <button
              onClick={() => setActiveTab('evals')}
              id="tab_teacher_evals"
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'evals'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Экран сдачи лабораторных
            </button>
          </nav>
        </div>
      </div>

      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 text-sm">Загрузка информации преподавателя...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto mt-6">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">Вы не закреплены за дисциплинами</p>
            <p className="text-slate-400 text-sm mt-1">Обратитесь в деканат для настройки учебной структуры курса.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'schedule' && (
              <ScheduleWidget schedule={schedule} role="teacher" />
            )}

            {activeTab === 'gradebook' && (
              <TeacherGradebookSpreadsheet subjects={subjects} activeTeacherId={user.id} authToken={token} />
            )}

            {activeTab === 'syllabus' && (
              <SyllabusConfigurator subjects={subjects} authToken={token} />
            )}

            {activeTab === 'evals' && (
              <TeacherLabSubmissions subjects={subjects} activeTeacherId={user.id} authToken={token} />
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-950 text-slate-400/80 py-6 text-center text-xs border-t border-slate-800 mt-auto">
        &copy; {new Date().getFullYear()} Лабораторная работа: Электронный Веб-Журнал. Все права защищены.
      </footer>
    </div>
  );
}
