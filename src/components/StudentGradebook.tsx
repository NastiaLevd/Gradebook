import { useState } from 'react';
import { BookOpen, AlertCircle, Clock, Award, ChevronDown, ChevronRight } from 'lucide-react';
import { Subject, Lesson, Grade } from '../types.js';

interface StudentGradebookProps {
  subjects: Subject[];
  lessons: Lesson[];
  grades: Grade[];
  studentId: string;
}

export default function StudentGradebook({ subjects, lessons, grades, studentId }: StudentGradebookProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const getSubjectStats = (subjectId: string) => {
    const subjectLessons = lessons.filter(l => l.subjectId === subjectId);
    const subjectLessonIds = subjectLessons.map(l => l.id);

    const subjectGrades = grades.filter(g => 
      g.studentId === studentId && 
      g.subjectId === subjectId &&
      subjectLessonIds.includes(g.lessonId)
    );

    const scores = subjectGrades.filter(g => g.grade !== undefined).map(g => g.grade!);
    const average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '—';
    const absents = subjectGrades.filter(g => g.isAbsent).length;
    const lates = subjectGrades.filter(g => g.isLate).length;

    return {
      average,
      absents,
      lates,
      totalGrades: scores.length
    };
  };

  const toggleSubject = (id: string) => {
    setExpandedSubject(expandedSubject === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Электронный журнал</h2>
          <p className="text-sm text-slate-500">Успеваемость и посещаемость по учебному плану</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {subjects.map(subject => {
            const stats = getSubjectStats(subject.id);
            const isExpanded = expandedSubject === subject.id;
            const subjectLessons = lessons.filter(l => l.subjectId === subject.id);

            return (
              <div key={subject.id} className="transition-all duration-200">
                
                <div 
                  onClick={() => toggleSubject(subject.id)}
                  id={`subject_row_${subject.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50/50 cursor-pointer select-none transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl mt-0.5">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-base">{subject.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Преподаватель: {subject.teacherName}</p>
                    </div>
                  </div>

                  
                  <div className="flex flex-wrap items-center gap-3.5 mt-4 sm:mt-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                      <Award className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs text-indigo-700 font-semibold font-mono">Ср.балл: {stats.average}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50/40 border border-rose-100 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-xs text-rose-700 font-semibold font-mono">Пропуски: {stats.absents}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/40 border border-amber-100 rounded-xl">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-amber-700 font-semibold font-mono">Опоздания: {stats.lates}</span>
                    </div>

                    <button className="text-slate-400 hover:text-slate-600 transition p-1 ml-2 self-center">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                
                {isExpanded && (
                  <div className="bg-slate-50/30 border-t border-slate-100 px-6 py-4">
                    {subjectLessons.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Занятий по предмету пока не зафиксировано в журнале.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-3">Дата и Время</th>
                              <th className="py-2.5 px-3">Тип занятия</th>
                              <th className="py-2.5 px-3">Посещаемость</th>
                              <th className="py-2.5 px-3 text-right">Оценка</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                            {subjectLessons.map(lesson => {
                              const gradeItem = grades.find(g => g.studentId === studentId && g.lessonId === lesson.id);
                              
                              let typeLabel = '';
                              switch (lesson.type) {
                                case 'lecture': typeLabel = 'Лекция'; break;
                                case 'lab': typeLabel = 'Лабораторная'; break;
                                case 'practice': typeLabel = 'Практика'; break;
                                case 'test': typeLabel = 'Контрольная'; break;
                                case 'oral': typeLabel = 'Устный опрос'; break;
                              }

                              return (
                                <tr key={lesson.id} className="hover:bg-slate-50/30">
                                  <td className="py-3 px-3 font-mono text-xs">
                                    <span className="font-semibold text-slate-600">{lesson.date}</span>
                                    <span className="text-slate-400 block">{lesson.timeStart} - {lesson.timeEnd}</span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="text-slate-600 font-medium">{typeLabel}</span>
                                  </td>
                                  <td className="py-3 px-3">
                                    {gradeItem?.isAbsent ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-600">
                                        ОТСУТСТВИЕ
                                      </span>
                                    ) : gradeItem?.isLate ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 border border-amber-100 text-amber-600">
                                        ОПОЗДАНИЕ ({gradeItem.lateMinutes || 15}м)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-600">
                                        был(а) на занятии
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    {gradeItem?.grade !== undefined ? (
                                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border ${
                                        gradeItem.grade >= 8
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                          : gradeItem.grade >= 5
                                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}>
                                        {gradeItem.grade}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
