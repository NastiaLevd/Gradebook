import { useState, useEffect } from 'react';
import { Calendar, BookOpen, FileSpreadsheet, LogOut, Award, AlertCircle, Clock, UserCheck } from 'lucide-react';
import { User, Lesson, Subject, SyllabusItem, LabSubmission } from '../types.js';
import ScheduleWidget from './ScheduleWidget.js';
import StudentGradebook from './StudentGradebook.js';
import StudentLabDetails from './StudentLabDetails.js';

interface StudentPortalProps {
  user: User;
  token: string;
  onLogout: () => void;
}

type TabType = 'schedule' | 'gradebook' | 'labs';

export default function StudentPortal({ user, token, onLogout }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);
  const [submissions, setSubmissions] = useState<LabSubmission[]>([]);
  const [gradesInfo, setGradesInfo] = useState<{ lessons: Lesson[], students: User[], grades: any[] }>({ lessons: [], students: [], grades: [] });
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedRes, subjRes, sylRes, submRes, gbRes, studsRes] = await Promise.all([
        fetch('/api/schedule', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/syllabus', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/submissions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/gradebook', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [sched, subj, syl, subm, gb, studs] = await Promise.all([
        schedRes.json(),
        subjRes.json(),
        sylRes.json(),
        submRes.json(),
        gbRes.json(),
        studsRes.json()
      ]);

      setSchedule(sched);
      setSubjects(subj);
      setSyllabusItems(syl);
      setSubmissions(subm);
      setGradesInfo(gb);
      setAllStudents(studs);
    } catch (e) {
      console.error('Failed to pull student portal metadata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id, token]);
  const myGrades = gradesInfo.grades.filter(g => g.studentId === user.id);
  const totalScores = myGrades.filter(g => g.grade !== undefined).map(g => g.grade!);
  const averageTotal = totalScores.length > 0 ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(2) : '—';
  const totalAbsents = myGrades.filter(g => g.isAbsent).length;
  const totalLates = myGrades.filter(g => g.isLate).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm sm:text-base">Электронный журнал</span>
                <span className="text-[10px] sm:text-xs font-mono block text-slate-400 mt-0.5 leading-none">Личный кабинет студента</span>
              </div>
            </div>

            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex text-right flex-col mr-1">
                <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                <span className="text-xs text-indigo-600 font-medium font-mono">Группа {user.groupName}</span>
              </div>
              <button
                onClick={onLogout}
                id="student_logout_btn"
                className="flex items-center justify-center p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      
      <div className="bg-indigo-900 text-white py-8 sm:py-10 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-200 font-mono">
                Раздел Студента
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">{user.name}</h1>
              <p className="text-sm text-indigo-100/80 mt-1">Обучается на направлении, группа: <span className="font-semibold font-mono text-white bg-indigo-800 px-2.5 py-0.5 rounded-lg border border-indigo-700/50">{user.groupName}</span></p>
            </div>

            
            <div className="grid grid-cols-3 gap-3.5 sm:gap-4 max-w-md w-full">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                <Award className="w-5 h-5 text-indigo-300 mx-auto mb-1.5" />
                <span className="block text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Ср. балл</span>
                <span className="text-base sm:text-lg font-bold font-mono">{averageTotal}</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                <AlertCircle className="w-5 h-5 text-rose-300 mx-auto mb-1.5" />
                <span className="block text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Пропуски</span>
                <span className="text-base sm:text-lg font-bold font-mono">{totalAbsents}</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                <Clock className="w-5 h-5 text-amber-300 mx-auto mb-1.5" />
                <span className="block text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Опозд-я</span>
                <span className="text-base sm:text-lg font-bold font-mono">{totalLates}</span>
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
              id="tab_student_schedule"
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition cursor-pointer ${
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
              id="tab_student_gradebook"
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'gradebook'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Электронный журнал
            </button>

            <button
              onClick={() => setActiveTab('labs')}
              id="tab_student_labs"
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'labs'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Сдача лабораторных
            </button>
          </nav>
        </div>
      </div>

      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 text-sm">Загрузка информации личного кабинета...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'schedule' && (
              <ScheduleWidget schedule={schedule} role="student" />
            )}

            {activeTab === 'gradebook' && (
              <StudentGradebook 
                subjects={subjects} 
                lessons={schedule} 
                grades={gradesInfo.grades} 
                studentId={user.id} 
              />
            )}

            {activeTab === 'labs' && (
              <StudentLabDetails
                subjects={subjects}
                syllabusItems={syllabusItems}
                submissions={submissions}
                allStudents={allStudents}
                currentStudent={user}
                authToken={token}
                onRefreshSubmissions={fetchData}
              />
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 mt-auto">
        &copy; {new Date().getFullYear()} Лабораторная работа: Электронный Веб-Журнал. Все права защищены.
      </footer>
    </div>
  );
}
