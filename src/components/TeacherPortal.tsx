import { useEffect, useState } from 'react';
import { BookOpen, Calendar, Grid, Layers, LogOut, ShieldAlert } from 'lucide-react';
import { Lesson, Subject, User } from '../types.js';
import ScheduleWidget from './ScheduleWidget.js';
import TeacherGradebookSpreadsheet from './TeacherGradebookSpreadsheet.js';
import SyllabusConfigurator from './SyllabusConfigurator.js';

interface TeacherPortalProps {
  user: User;
  token: string;
  onLogout: () => void;
}

type TabType = 'schedule' | 'gradebook' | 'syllabus';

export default function TeacherPortal({ user, token, onLogout }: TeacherPortalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
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
      setSubjects(subjectsData.filter((subject: Subject) => subject.teacherId === user.id));
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
              <span className="text-[10px] sm:text-xs font-mono block text-slate-400 mt-0.5 leading-none">Консоль преподавателя</span>
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
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">Панель управления преподавателя</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">{user.name}</h1>
            <p className="text-sm text-slate-400 mt-1">Журнал, занятия и программа предмета без сдачи файлов.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 text-sm font-mono">
            <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Дисциплины</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{subjects.length}</span>
          </div>
        </div>
      </section>

      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <button onClick={() => setActiveTab('schedule')} className={`py-4 border-b-2 font-semibold text-sm flex items-center gap-2 ${activeTab === 'schedule' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            <Calendar className="w-4 h-4" />
            Расписание
          </button>
          <button onClick={() => setActiveTab('gradebook')} className={`py-4 border-b-2 font-semibold text-sm flex items-center gap-2 ${activeTab === 'gradebook' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            <BookOpen className="w-4 h-4" />
            Журнал оценок
          </button>
          <button onClick={() => setActiveTab('syllabus')} className={`py-4 border-b-2 font-semibold text-sm flex items-center gap-2 ${activeTab === 'syllabus' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            <Layers className="w-4 h-4" />
            Программа предмета
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <p className="text-center text-slate-500 py-20">Загрузка данных...</p>
        ) : subjects.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">Нет закрепленных предметов</p>
          </div>
        ) : activeTab === 'schedule' ? (
          <ScheduleWidget schedule={schedule} role="teacher" />
        ) : activeTab === 'gradebook' ? (
          <TeacherGradebookSpreadsheet subjects={subjects} activeTeacherId={user.id} authToken={token} />
        ) : (
          <SyllabusConfigurator subjects={subjects} authToken={token} />
        )}
      </main>
    </div>
  );
}
