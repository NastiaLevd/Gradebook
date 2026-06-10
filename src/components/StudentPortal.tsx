import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Calendar, FileSpreadsheet, ListChecks, LogOut } from 'lucide-react';
import { Grade, Lesson, Subject, SyllabusItem, User } from '../types.js';
import ScheduleWidget from './ScheduleWidget.js';
import StudentGradebook from './StudentGradebook.js';

interface StudentPortalProps {
  user: User;
  token: string;
  onLogout: () => void;
}

type TabType = 'schedule' | 'gradebook' | 'program';

export default function StudentPortal({ user, token, onLogout }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scheduleRes, subjectsRes, gradebookRes, syllabusRes] = await Promise.all([
        fetch('/api/schedule', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/gradebook', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/syllabus', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [scheduleData, subjectsData, gradebookData, syllabusData] = await Promise.all([
        scheduleRes.json(),
        subjectsRes.json(),
        gradebookRes.json(),
        syllabusRes.json()
      ]);

      setSchedule(scheduleData);
      setSubjects(subjectsData);
      setGrades(gradebookData.grades || []);
      setSyllabusItems(syllabusData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id, token]);

  const average = useMemo(() => {
    const scoreValues = grades.filter(grade => grade.grade !== undefined).map(grade => grade.grade!);
    return scoreValues.length
      ? (scoreValues.reduce((sum, grade) => sum + grade, 0) / scoreValues.length).toFixed(2)
      : '—';
  }, [grades]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm sm:text-base">Электронный журнал</span>
              <span className="text-[10px] sm:text-xs font-mono block text-slate-400 mt-0.5 leading-none">Личный кабинет студента</span>
            </div>
          </div>
          <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition" title="Выйти">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <section className="bg-indigo-900 text-white py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-200 font-mono">Раздел студента</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">{user.name}</h1>
            <p className="text-sm text-indigo-100/80 mt-1">Группа: <span className="font-semibold font-mono text-white">{user.groupName}</span></p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center min-w-32">
            <Award className="w-5 h-5 text-indigo-300 mx-auto mb-1.5" />
            <span className="block text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Средний балл</span>
            <span className="text-lg font-bold font-mono">{average}</span>
          </div>
        </div>
      </section>

      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <button onClick={() => setActiveTab('schedule')} className={`py-4 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'schedule' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            <Calendar className="w-4 h-4" />
            Расписание
          </button>
          <button onClick={() => setActiveTab('gradebook')} className={`py-4 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'gradebook' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            <BookOpen className="w-4 h-4" />
            Электронный журнал
          </button>
          <button onClick={() => setActiveTab('program')} className={`py-4 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'program' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            <ListChecks className="w-4 h-4" />
            Программа
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <p className="text-center text-slate-500 py-20">Загрузка данных...</p>
        ) : activeTab === 'schedule' ? (
          <ScheduleWidget schedule={schedule} role="student" />
        ) : activeTab === 'gradebook' ? (
          <StudentGradebook subjects={subjects} lessons={schedule} grades={grades} studentId={user.id} />
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Программа предметов</h2>
              <p className="text-sm text-slate-500">Материалы, дедлайны и технические задания доступны для просмотра. Загрузка решений появится в следующей версии.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {syllabusItems.map(item => {
                const subject = subjects.find(entry => entry.id === item.subjectId);
                return (
                  <article key={item.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">{item.type}</span>
                      <span className="text-xs text-slate-400 font-mono">{item.maxGrade} баллов</span>
                    </div>
                    <h3 className="font-bold text-slate-900 mt-3">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{subject?.name}</p>
                    <p className="text-sm text-slate-600 mt-3">{item.description}</p>
                    {item.deadline && <p className="text-xs text-rose-600 mt-3 font-semibold">Дедлайн: {item.deadline}</p>}
                    {item.materials && <p className="text-xs text-slate-500 mt-2">Материалы: {item.materials}</p>}
                    {item.tzContent && <pre className="mt-3 whitespace-pre-wrap text-xs bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-600">{item.tzContent}</pre>}
                    {item.allowTeams && <p className="text-xs text-emerald-700 mt-3 font-semibold">Можно выполнять в команде</p>}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
