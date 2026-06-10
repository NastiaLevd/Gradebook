import { Calendar, Clock, BookOpen, Users, HelpCircle } from 'lucide-react';
import { Lesson } from '../types.js';

interface ScheduleWidgetProps {
  schedule: Lesson[];
  role: 'student' | 'teacher';
}

export default function ScheduleWidget({ schedule, role }: ScheduleWidgetProps) {
  const sortedLessons = [...schedule].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.timeStart.localeCompare(b.timeStart);
  });
  const lessonsByDate: { [key: string]: Lesson[] } = {};
  sortedLessons.forEach(lesson => {
    if (!lessonsByDate[lesson.date]) {
      lessonsByDate[lesson.date] = [];
    }
    lessonsByDate[lesson.date].push(lesson);
  });

  const formatDateLabel = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (dateObj.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      return 'Завтра';
    }

    return dateObj.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const getLessonTypeDetails = (type: Lesson['type']) => {
    switch (type) {
      case 'lecture':
        return { label: 'Лекция', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' };
      case 'lab':
        return { label: 'Лабораторная', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' };
      case 'practice':
        return { label: 'Практика', color: 'bg-amber-50 border-amber-100 text-amber-700' };
      case 'test':
        return { label: 'Контрольная', color: 'bg-rose-50 border-rose-100 text-rose-700' };
      case 'oral':
        return { label: 'Устный опрос', color: 'bg-sky-50 border-sky-100 text-sky-700' };
      default:
        return { label: 'Занятие', color: 'bg-slate-50 border-slate-100 text-slate-700' };
    }
  };

  const uniqueDates = Object.keys(lessonsByDate).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Расписание занятий
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          Всего дней: {uniqueDates.length}
        </span>
      </div>

      {uniqueDates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Нет запланированных занятий</p>
          <p className="text-slate-400 text-sm mt-1">В расписании на ближайшее время нет занятий.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {uniqueDates.map(date => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-50/95 py-2 z-10 capitalize">
                {formatDateLabel(date)} <span className="font-mono text-xs normal-case text-slate-400 ml-2">({date})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lessonsByDate[date].map(lesson => {
                  const typeDetails = getLessonTypeDetails(lesson.type);
                  return (
                    <div
                      key={lesson.id}
                      id={`lesson_${lesson.id}`}
                      className="bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-sm rounded-2xl p-5 transition duration-200 flex flex-col justify-between"
                    >
                      <div>
                        
                        <div className="flex items-center justify-between mb-3.5">
                          <span className={`text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full border ${typeDetails.color}`}>
                            {typeDetails.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 font-mono flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5" />
                            {lesson.timeStart} – {lesson.timeEnd}
                          </span>
                        </div>

                        
                        <h4 className="font-semibold text-slate-800 text-base leading-tight mb-2.5 flex items-start gap-2">
                          <BookOpen className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          {lesson.subjectName}
                        </h4>
                      </div>

                      
                      <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                        {role === 'student' ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span className="truncate">{lesson.groupName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">Группа {lesson.groupName}</span>
                          </div>
                        )}
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          ID: {lesson.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
