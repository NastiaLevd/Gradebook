import React, { useState, useEffect } from 'react';
import { FileCode, MessageSquare, Check, User, Send, Download, HelpCircle, ArrowRight, Award } from 'lucide-react';
import { Subject, LabSubmission } from '../types.js';

interface TeacherLabSubmissionsProps {
  subjects: Subject[];
  activeTeacherId: string;
  authToken: string;
}

export default function TeacherLabSubmissions({ subjects, activeTeacherId, authToken }: TeacherLabSubmissionsProps) {
  const [submissions, setSubmissions] = useState<LabSubmission[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'checked'>('all');

  const [gradeInput, setGradeInput] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [evalError, setEvalError] = useState('');

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/submissions', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      setSubmissions(data || []);
    } catch (e) {
      console.error('Failed to pull lab submittals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedSubjectId]);

  const activeSubmission = submissions.find(s => s.id === selectedSubId);

  const handleSelectSubmission = (sub: LabSubmission) => {
    setSelectedSubId(sub.id);
    setGradeInput(sub.grade ? String(sub.grade) : '');
    setTeacherComment(sub.comment || '');
    setEvalError('');
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvalError('');

    const grade = Number(gradeInput);
    if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
      setEvalError('Введите целую оценку от 1 до 10');
      return;
    }

    try {
      const response = await fetch('/api/submissions/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          submissionId: selectedSubId,
          grade,
          comment: teacherComment
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения оценки рецензии');
      }

      await fetchSubmissions();
      alert('Работа успешно оценена!');
    } catch (err: any) {
      setEvalError(err.message || 'Ошибка');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedSubId) return;

    try {
      const response = await fetch('/api/submissions/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          submissionId: selectedSubId,
          text: chatMessage
        })
      });

      if (!response.ok) throw new Error('Не удалось опубликовать комментарий');

      setChatMessage('');
      fetchSubmissions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownload = async (submission: LabSubmission) => {
    if (!submission.filePath) return;

    const response = await fetch(`/api/submissions/${submission.id}/file`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      alert('Не удалось скачать файл решения');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = submission.fileName || 'solution';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSubject = s.subjectId === selectedSubjectId;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSubject && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eval_subject" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Семинар / Оценочный Курс</label>
            <select
              id="eval_subject"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedSubId(null);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium outline-none text-slate-800"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="eval_status" className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Статус проверки решений</label>
            <select
              id="eval_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium outline-none text-slate-800"
            >
              <option value="all">Все присланные решения</option>
              <option value="pending">Ожидают проверки (новые)</option>
              <option value="checked">Проверенные работы</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchSubmissions}
          id="btn_reload_evals"
          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-white text-sm rounded-xl hover:shadow-lg active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          Обновить список
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Сборка архива сдачи решений...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Студенты, сдавшие работы ({filteredSubmissions.length})
            </h3>

            {filteredSubmissions.length === 0 ? (
              <div className="bg-white border border-slate-100 p-8 rounded-2xl text-center text-slate-400">
                Работы по выбранному фильтру не найдены.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSubmissions.map(sub => {
                  const isSelected = selectedSubId === sub.id;
                  
                  return (
                    <div
                      key={sub.id}
                      id={`sub_card_${sub.id}`}
                      onClick={() => handleSelectSubmission(sub)}
                      className={`p-4 border rounded-2xl cursor-pointer select-none transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">{sub.studentName}</h4>
                          <p className="text-xs text-indigo-600 font-medium mt-0.5">Группа {sub.groupName}</p>
                          <p className="text-[11px] text-slate-400 mt-2 font-mono truncate">{sub.syllabusItemTitle}</p>
                        </div>

                        {sub.status === 'checked' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 select-none">
                            {sub.grade}б Проверено
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-250 shrink-0 select-none">
                            НОВЫЙ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          
          <div className="lg:col-span-7">
            {!activeSubmission ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-semibold">Оценочная консоль преподавателя</p>
                <p className="text-slate-400 text-sm mt-1">
                  Выберите студента из списка слева, чтобы ознакомиться с его кодовым решением и дать обратную связь
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                
                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/30 p-4 border border-indigo-50 rounded-2xl">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider font-mono">Автор(ы) решения:</span>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{activeSubmission.studentName}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Группа: {activeSubmission.groupName}</p>
                      
                      {(activeSubmission.partnerNames && activeSubmission.partnerNames.length > 0) && (
                        <p className="text-xs text-indigo-700 font-medium mt-1">Командная работа в паре с: {activeSubmission.partnerNames.join(', ')}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-right font-mono">Статус проверки:</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold mt-1 uppercase tracking-widest ${
                        activeSubmission.status === 'checked' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {activeSubmission.status === 'checked' ? 'ПРОВЕРЕНО' : 'Ожидает'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Лабораторная работа (ТЗ):</span>
                    <h4 className="font-bold text-slate-800 text-sm mt-0.5">{activeSubmission.syllabusItemTitle}</h4>
                    <p className="text-xs text-slate-400 mt-1">Прислано студентом: {new Date(activeSubmission.submittedAt).toLocaleString('ru-RU')}</p>
                  </div>

                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-600 truncate flex items-center gap-1.5 font-semibold">
                      <FileCode className="w-4 h-4 text-indigo-500 shrink-0" />
                      {activeSubmission.fileName}
                    </span>
                    <button
                      onClick={() => handleDownload(activeSubmission)}
                      disabled={!activeSubmission.filePath}
                      id="download_solutions_zip_btn"
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {activeSubmission.filePath ? 'Скачать архив' : 'Файл не загружен'}
                    </button>
                  </div>
                </div>

                
                <form onSubmit={handleGradeSubmission} className="p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4.5 h-4.5 text-indigo-600" />
                    Выставить рецензию и балл
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1">
                      <label htmlFor="eval_score" className="text-xs font-semibold text-slate-600 block mb-1">Оценка за работу (1-10):</label>
                      <input
                        id="eval_score"
                        type="number"
                        min="1"
                        max="10"
                        required
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        placeholder="Напр: 10"
                        className="w-full text-center rounded-xl border border-slate-200 px-3 py-2 font-mono text-base font-bold outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="eval_desc" className="text-xs font-semibold text-slate-600 block mb-1">Финальный вердикт (Текст):</label>
                      <input
                        id="eval_desc"
                        type="text"
                        value={teacherComment}
                        onChange={(e) => setTeacherComment(e.target.value)}
                        placeholder="Чистый, семантически структурированный код."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  {evalError && (
                    <p className="text-rose-500 text-xs font-medium">{evalError}</p>
                  )}

                  <button
                    type="submit"
                    id="submit_eval_score_btn"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold rounded-xl text-xs active:scale-95 transition"
                  >
                    <Check className="w-4 h-4" />
                    Зачесть работу и отправить ведомость
                  </button>
                </form>

                
                <div className="p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    История переговорного диалога ({activeSubmission.comments?.length || 0})
                  </h4>

                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {!activeSubmission.comments || activeSubmission.comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 border border-slate-100 rounded-xl">
                        Диалог пока пуст. Вы можете написать студенту первый отзыв/комментарий.
                      </p>
                    ) : (
                      activeSubmission.comments.map(comm => {
                        const isMe = comm.authorId === activeTeacherId;
                        return (
                          <div key={comm.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs ${
                              isMe 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                            }`}>
                              <p className="font-bold opacity-85 text-[10px] uppercase mb-0.5">
                                {comm.authorName} ({comm.authorRole === 'teacher' ? 'Преподаватель' : 'Студент'})
                              </p>
                              <p className="leading-relaxed">{comm.text}</p>
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">
                              {new Date(comm.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1 text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none"
                      placeholder="Напишите ответ студенту..."
                    />
                    <button
                      type="submit"
                      className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
