import React, { useEffect, useState } from 'react';
import { Plus, UserMinus, AlertTriangle, HelpCircle, Check, Users, ShieldAlert, Award } from 'lucide-react';
import { User, Lesson, Grade, Subject } from '../types.js';

interface TeacherGradebookSpreadsheetProps {
  subjects: Subject[];
  activeTeacherId: string;
  authToken: string;
}

const TIMINGS = [
  { start: '08:30', end: '10:00' },
  { start: '10:15', end: '11:45' },
  { start: '12:00', end: '13:30' },
  { start: '14:00', end: '15:30' }
];

export default function TeacherGradebookSpreadsheet({ subjects, authToken }: TeacherGradebookSpreadsheetProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('ИВТ-31');

  const [students, setStudents] = useState<User[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);

  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);
  const [hoveredLessonId, setHoveredLessonId] = useState<string | null>(null);

  const [activeCell, setActiveCell] = useState<{ studentId: string; lessonId: string } | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [isAbsentInput, setIsAbsentInput] = useState(false);
  const [isLateInput, setIsLateInput] = useState(false);
  const [lateMinutesInput, setLateMinutesInput] = useState(15);
  const [errorInput, setErrorInput] = useState('');

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonType, setNewLessonType] = useState<'lecture' | 'lab' | 'practice' | 'test'>('lab');
  const [newLessonDate, setNewLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLessonTiming, setNewLessonTiming] = useState('0');

  const fetchGradebook = async () => {
    if (!selectedSubjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gradebook?subjectId=${selectedSubjectId}&groupName=${selectedGroupName}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setStudents(data.students || []);
      setLessons(data.lessons || []);
      setGrades(data.grades || []);
    } catch (e) {
      console.error('Failed to load gradebook matrix:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGradebook();
  }, [selectedSubjectId, selectedGroupName, authToken]);

  const handleApplyFilters = () => {
    fetchGradebook();
  };

  const handleAddLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timing = TIMINGS[Number(newLessonTiming)];

    try {
      const response = await fetch('/api/lessons/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          groupName: selectedGroupName,
          date: newLessonDate,
          timeStart: timing.start,
          timeEnd: timing.end,
          type: newLessonType
        })
      });

      if (!response.ok) {
         throw new Error('Ошибка добавления урока');
      }

      setShowAddLesson(false);
      fetchGradebook();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updateGradeOnServer = async (payload: {
    studentId: string;
    subjectId: string;
    lessonId: string;
    grade?: number | null;
    isAbsent?: boolean;
    isLate?: boolean;
    lateMinutes?: number;
  }) => {
    try {
      const response = await fetch('/api/gradebook/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обновления');
      }
      fetchGradebook();
      return true;
    } catch (e: any) {
      alert(e.message || 'Ошибка подключения');
      return false;
    }
  };

  const openCellEditor = (student: User, lesson: Lesson) => {
    if (student.isExpelled) return;

    const currentGrade = grades.find(g => g.studentId === student.id && g.lessonId === lesson.id);
    setActiveCell({ studentId: student.id, lessonId: lesson.id });
    setGradeInput(currentGrade?.grade ? String(currentGrade.grade) : '');
    setIsAbsentInput(currentGrade?.isAbsent || false);
    setIsLateInput(currentGrade?.isLate || false);
    setLateMinutesInput(currentGrade?.lateMinutes || 15);
    setErrorInput('');
  };

  const handleSaveCell = async () => {
    setErrorInput('');
    if (!activeCell) return;

    let numericGrade: number | null = null;
    if (gradeInput.trim()) {
      numericGrade = Number(gradeInput);
      if (!Number.isInteger(numericGrade) || numericGrade < 1 || numericGrade > 10) {
        setErrorInput('Оценка должна быть целым числом от 1 до 10');
        return;
      }
    }

    const ok = await updateGradeOnServer({
      studentId: activeCell.studentId,
      subjectId: selectedSubjectId,
      lessonId: activeCell.lessonId,
      grade: numericGrade,
      isAbsent: isAbsentInput,
      isLate: isLateInput,
      lateMinutes: isLateInput ? Number(lateMinutesInput) : undefined
    });

    if (ok) {
      setActiveCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveCell();
    } else if (e.key === 'Escape') {
      setActiveCell(null);
    }
  };

  const handleMouseClick = async (e: React.MouseEvent, student: User, lesson: Lesson) => {
    if (student.isExpelled) return;

    const currentGrade = grades.find(g => g.studentId === student.id && g.lessonId === lesson.id) || {
      isAbsent: false,
      isLate: false
    };

    if (e.button === 2) {
      e.preventDefault();
      await updateGradeOnServer({
        studentId: student.id,
        subjectId: selectedSubjectId,
        lessonId: lesson.id,
        isAbsent: !currentGrade.isAbsent,
        isLate: false,
        grade: null
      });
    } else if (e.button === 1) {
      e.preventDefault();
      await updateGradeOnServer({
        studentId: student.id,
        subjectId: selectedSubjectId,
        lessonId: lesson.id,
        isAbsent: false,
        isLate: !currentGrade.isLate,
        lateMinutes: 15,
        grade: null
      });
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="teacher_subject" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Учебный предмет</label>
            <select
              id="teacher_subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium outline-none"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="teacher_group" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Группа студентов</label>
            <select
              id="teacher_group"
              value={selectedGroupName}
              onChange={(e) => setSelectedGroupName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium outline-none"
            >
              <option value="ИВТ-31">ИВТ-31</option>
              <option value="ИВТ-32">ИВТ-32</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleApplyFilters}
          id="btn_search_gradebook"
          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-white text-sm rounded-xl hover:shadow-lg active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          Применить
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          Журнал оценок ({lessons.length} занятий)
        </h3>

        <button
          onClick={() => setShowAddLesson(true)}
          id="add_lesson_column_btn"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 hover:shadow-sm active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Добавить день (урок)
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Загрузка структуры журнала...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          
          <div className="bg-slate-50/40 px-5 py-3 border-b border-slate-100 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono leading-none">ЛКМ</kbd> — Редактировать / Оценка
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono leading-none">ПКМ</kbd> — Пропуск (н/я)
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono leading-none">СКМ</kbd> — Опоздание
            </span>
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="w-2.5 h-2.5 bg-rose-100/50 rounded-full border border-rose-300"></span> Отчислен
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-100/50 rounded-full border border-emerald-300"></span> Новый
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                  <th className="py-4 px-4 sticky left-0 bg-white z-10 border-r border-slate-100 min-w-[200px]">ФИО Студента</th>
                  {lessons.map(lesson => (
                    <th
                      key={lesson.id}
                      className={`py-3 px-3 text-center min-w-[100px] border-r border-slate-50 transition-colors ${
                        hoveredLessonId === lesson.id ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="font-mono text-xs text-slate-700">{lesson.date}</div>
                      <div className="text-[9px] text-indigo-500 mt-0.5">{lesson.type.toUpperCase()}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 font-normal">{lesson.timeStart}</div>
                    </th>
                  ))}
                  {lessons.length === 0 && (
                    <th className="py-4 px-4 text-slate-400 text-xs italic">Нет добавленных занятий в семестре</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(student => {
                  const isExpelled = student.isExpelled;
                  const isNew = student.isNew;
                  const studentRowStyle = isExpelled 
                    ? 'bg-rose-50/20 text-slate-300 opacity-60' 
                    : isNew 
                      ? 'bg-emerald-50/20 text-slate-800' 
                      : 'text-slate-800 hover:bg-slate-50/30';

                  return (
                    <tr
                      key={student.id}
                      id={`student_row_${student.id}`}
                      className={`${studentRowStyle} group transition-all duration-150 ${
                        hoveredStudentId === student.id ? 'bg-indigo-50/10' : ''
                      }`}
                      onMouseEnter={() => setHoveredStudentId(student.id)}
                      onMouseLeave={() => setHoveredStudentId(null)}
                    >
                      
                      <td className="py-3 px-4 font-medium text-sm sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {isNew && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shrink-0" title="Новый студент"></span>
                          )}
                          {isExpelled && (
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest shrink-0 mr-1 font-mono">[ОТЧ]</span>
                          )}
                          <span className={`truncate ${isExpelled ? 'line-through text-slate-400' : ''}`}>
                            {student.name}
                          </span>
                        </div>
                      </td>

                      
                      {lessons.map(lesson => {
                        const gradeItem = grades.find(g => g.studentId === student.id && g.lessonId === lesson.id);
                        
                        let cellContent = '';
                        let cellBg = 'bg-white hover:bg-indigo-50/45';

                        if (gradeItem) {
                          if (gradeItem.isAbsent) {
                            cellContent = 'Н';
                            cellBg = 'bg-rose-50 hover:bg-rose-100/60 text-rose-600 font-bold';
                          } else if (gradeItem.isLate) {
                            cellContent = `Оп(${gradeItem.lateMinutes || 15})`;
                            cellBg = 'bg-amber-50 hover:bg-amber-100/60 text-amber-600 text-xs font-semibold';
                          } else if (gradeItem.grade !== undefined) {
                            cellContent = String(gradeItem.grade);
                            cellBg = gradeItem.grade >= 8
                              ? 'bg-emerald-50/30 hover:bg-emerald-100/65 text-emerald-800 font-bold text-sm' 
                              : gradeItem.grade >= 5
                                ? 'bg-amber-50/35 hover:bg-amber-100/65 text-amber-800 font-bold text-sm' 
                                : 'bg-rose-50/30 hover:bg-rose-100/65 text-rose-800 font-bold text-sm';
                          }
                        }
                        const isIntersector = (hoveredStudentId === student.id || hoveredLessonId === lesson.id);
                        const interHighlight = isIntersector ? 'ring-1 ring-inset ring-indigo-100' : '';

                        return (
                          <td
                            key={lesson.id}
                            id={`cell_${student.id}_${lesson.id}`}
                            onMouseEnter={() => setHoveredLessonId(lesson.id)}
                            onMouseLeave={() => setHoveredLessonId(null)}
                            onClick={() => openCellEditor(student, lesson)}
                            onContextMenu={(e) => handleMouseClick(e, student, lesson)}
                            onAuxClick={(e) => handleMouseClick(e, student, lesson)}
                            className={`border-r border-slate-50 text-center py-3.5 px-2 cursor-crosshair transition duration-150 font-mono text-sm leading-tight select-none ${cellBg} ${interHighlight}`}
                          >
                            {cellContent || <span className="text-slate-200 group-hover:text-slate-300 font-light">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      
      {activeCell && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100" onKeyDown={handleKeyDown}>
            <h4 className="text-base font-bold text-slate-900 mb-3.5">Внести оценку / посещаемость</h4>

            <div className="space-y-4">
              
              <div className="flex items-center justify-between p-3 bg-rose-50/30 border border-slate-100 rounded-xl">
                <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Отсутствует на занятии (н/я)
                </span>
                <input
                  type="checkbox"
                  checked={isAbsentInput}
                  onChange={(e) => {
                    setIsAbsentInput(e.target.checked);
                    if (e.target.checked) {
                      setGradeInput('');
                      setIsLateInput(false);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </div>

              
              <div className="flex items-center justify-between p-3 bg-amber-50/30 border border-slate-100 rounded-xl">
                <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-550" />
                  Опоздал на урок
                </span>
                <input
                  type="checkbox"
                  checked={isLateInput}
                  onChange={(e) => {
                    setIsLateInput(e.target.checked);
                    if (e.target.checked) {
                      setIsAbsentInput(false);
                      setGradeInput('');
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {isLateInput && (
                <div>
                  <label htmlFor="late_min" className="text-xs font-medium text-slate-500 block mb-1">Опоздание в минутах:</label>
                  <input
                    id="late_min"
                    type="number"
                    value={lateMinutesInput}
                    onChange={(e) => setLateMinutesInput(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs font-mono rounded-lg border border-slate-200 px-3 py-1.5 focus:border-indigo-500 outline-none"
                  />
                </div>
              )}

              
              {!isAbsentInput && !isLateInput && (
                <div>
                  <label htmlFor="cell_grade" className="text-xs font-semibold text-slate-600 block mb-1">
                    Оценка по предмету (целое число 1 - 10):
                  </label>
                  <input
                    id="cell_grade"
                    type="text"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    placeholder="Например: 10"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-center text-lg font-bold text-slate-800 focus:border-indigo-500 outline-none transition"
                  />
                </div>
              )}

              {errorInput && (
                <p className="text-rose-500 text-xs font-medium">{errorInput}</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="flex-1 py-2 border border-slate-200 text-xs text-slate-500 font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveCell}
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {showAddLesson && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddLessonSubmit} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-5 h-5 text-indigo-500" />
              Добавить день/урок в журнал
            </h4>

            <div>
              <label htmlFor="new_type" className="text-xs font-semibold text-slate-600 block mb-1">Тип занятия:</label>
              <select
                id="new_type"
                value={newLessonType}
                onChange={(e) => setNewLessonType(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none"
              >
                <option value="lecture">Лекция (Теория)</option>
                <option value="lab">Лабораторная работа</option>
                <option value="practice">Практика (Семинар)</option>
                <option value="test">Контрольная работа / Тест</option>
              </select>
            </div>

            <div>
              <label htmlFor="new_date" className="text-xs font-semibold text-slate-600 block mb-1">Дата занятия:</label>
              <input
                id="new_date"
                type="date"
                required
                value={newLessonDate}
                onChange={(e) => setNewLessonDate(e.target.value)}
                className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label htmlFor="new_timing" className="text-xs font-semibold text-slate-600 block mb-1">Продолжительность (Тайминг):</label>
              <select
                id="new_timing"
                value={newLessonTiming}
                onChange={(e) => setNewLessonTiming(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none font-mono"
              >
                {TIMINGS.map((t, idx) => (
                  <option key={idx} value={idx}>{t.start} – {t.end}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowAddLesson(false)}
                className="flex-1 py-2 border border-slate-200 text-xs text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Закрыть
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition cursor-pointer"
              >
                Добавить столбец
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
