import React, { useState } from 'react';
import { FileCode, UserCheck, MessageSquare, AlertTriangle, Send, CheckCircle, Clock, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import { Subject, SyllabusItem, LabSubmission, User } from '../types.js';

interface StudentLabDetailsProps {
  subjects: Subject[];
  syllabusItems: SyllabusItem[];
  submissions: LabSubmission[];
  allStudents: User[];
  currentStudent: User;
  authToken: string;
  onRefreshSubmissions: () => void;
}

export default function StudentLabDetails({
  subjects,
  syllabusItems,
  submissions,
  allStudents,
  currentStudent,
  authToken,
  onRefreshSubmissions
}: StudentLabDetailsProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [chatMessage, setChatMessage] = useState('');

  const filteredItems = syllabusItems.filter(i => i.subjectId === selectedSubjectId);
  const selectedItem = syllabusItems.find(i => i.id === selectedItemId);
  const activeSubmission = submissions.find(s => s.syllabusItemId === selectedItemId);

  const groupMates = allStudents.filter(u => u.groupName === currentStudent.groupName && u.id !== currentStudent.id);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!selectedFile || !selectedItemId) {
      setError('Пожалуйста, выберите файл перед отправкой');
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('syllabusItemId', selectedItemId);
      formData.append('file', selectedFile);
      formData.append('partnerIds', JSON.stringify(partnerId ? [partnerId] : []));

      const response = await fetch('/api/submissions/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки решения');
      }

      setSuccess('Лабораторная работа успешно загружена в систему!');
      setSelectedFile(null);
      setFileName('');
      setPartnerId('');
      onRefreshSubmissions();
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeSubmission) return;

    try {
      const response = await fetch('/api/submissions/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          submissionId: activeSubmission.id,
          text: chatMessage
        })
      });

      if (!response.ok) {
         throw new Error('Ошибка добавления комментария');
      }

      setChatMessage('');
      onRefreshSubmissions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Сдача лабораторных работ</h2>
          <p className="text-sm text-slate-500">Загрузка решений, технические задания, дедлайны и обратная связь</p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="subj_select" className="text-xs font-semibold text-slate-500 uppercase">Предмет:</label>
          <select
            id="subj_select"
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSelectedItemId(null);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 transition"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Список занятий и лабораторных работ
          </h3>

          {filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-slate-400">
              Шаблоны учебного курса пока отсутствуют
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map(item => {
                const isSelected = selectedItemId === item.id;
                const progressSub = submissions.find(s => s.syllabusItemId === item.id);
                
                return (
                  <div
                    key={item.id}
                    id={`lab_item_${item.id}`}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setError('');
                      setSuccess('');
                    }}
                    className={`p-4 border rounded-2xl cursor-pointer select-none transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800 text-sm leading-snug truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          Дедлайн: {item.deadline || 'Без срока'}
                        </p>
                      </div>

                      
                      {progressSub ? (
                        progressSub.status === 'checked' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 uppercase tracking-wider">
                            Зачтено ({progressSub.grade}/{item.maxGrade})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0 uppercase tracking-wider">
                            На проверке
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0 uppercase tracking-wider">
                          Не сдано
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
          {!selectedItem ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
              <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">Выберите лабораторную работу или тему</p>
              <p className="text-slate-400 text-sm mt-1">
                Кликните на любой элемент из левого списка для просмотра подробностей и сдачи
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">
                      Характеристики работы
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedItem.title}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">
                      Макс. балл
                    </span>
                    <p className="text-lg font-mono font-bold text-slate-800">{selectedItem.maxGrade} баллов</p>
                  </div>
                </div>

                
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Описание работы:
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{selectedItem.description}</p>
                </div>

                {selectedItem.tzContent && (
                  <div className="bg-indigo-50/30 border border-indigo-50 rounded-xl p-4">
                    <h5 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-mono">
                      <FileCode className="w-4 h-4 text-indigo-500" />
                      Техническое задание (ТЗ):
                    </h5>
                    <pre className="text-slate-700 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                      {selectedItem.tzContent}
                    </pre>
                  </div>
                )}

                {selectedItem.materials && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      Теоретические материалы:
                    </h5>
                    <p className="text-slate-600 text-xs leading-relaxed">{selectedItem.materials}</p>
                  </div>
                )}
              </div>

              
              <div className="p-6">
                {!activeSubmission ? (
                  
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900">Загрузка и отправка решения</h4>
                    
                    {selectedItem.allowTeams && (
                      <div>
                        <label htmlFor="partner_select" className="text-xs font-semibold text-slate-600 block mb-1">
                          Напарник для командной работы (опционально):
                        </label>
                        <select
                          id="partner_select"
                          value={partnerId}
                          onChange={(e) => setPartnerId(e.target.value)}
                          className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-500 transition"
                        >
                          <option value="">Индивидуальная задача (без партнеров)</option>
                          {groupMates.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.name} ({student.groupName})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-6 text-center bg-slate-50/50 cursor-pointer relative transition-all">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        id="solution_file_picker"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".zip,.rar,.tar,.gz,.txt,.js,.ts,.tsx,.json,.sql"
                      />
                      <FileCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      {fileName ? (
                        <div>
                          <p className="text-indigo-600 font-semibold text-sm truncate px-4">{fileName}</p>
                          <p className="text-slate-400 text-xs mt-1">Нажмите сюда, чтобы заменить архив</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-600 font-semibold text-sm">Выберите ZIP-архив решения</p>
                          <p className="text-slate-400 text-xs mt-1">Перетащите сюда или кликните для обзора</p>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-100" id="submit_error">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="p-3 bg-emerald-50 text-emerald-600 text-xs rounded-xl border border-emerald-100" id="submit_success">
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      id="submit_solution_btn"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 font-semibold text-white text-sm rounded-xl hover:bg-indigo-700 hover:shadow-lg active:scale-95 transition cursor-pointer min-h-[44px]"
                    >
                      {submitting ? 'Загрузка...' : 'Отправить на проверку'}
                    </button>
                  </form>
                ) : (
                  
                  <div className="space-y-6">
                    <div className="flex items-start justify-between bg-slate-50/60 p-4 border border-slate-100 rounded-2xl">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Файл работы:
                        </span>
                        <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                          <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                          {activeSubmission.fileName}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Загружен: {new Date(activeSubmission.submittedAt).toLocaleString('ru-RU')}
                        </p>
                        
                        {(activeSubmission.partnerNames && activeSubmission.partnerNames.length > 0) && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                            <UserCheck className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                            <span>В паре с: {activeSubmission.partnerNames.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        {activeSubmission.status === 'checked' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest leading-none">
                              ПРОВЕРЕНО
                            </span>
                            <div className="flex flex-col text-right">
                              <span className="text-xs text-slate-400 leading-none">Оценка</span>
                              <span className="text-2xl font-bold text-emerald-600 font-mono leading-tight">
                                {activeSubmission.grade} / {selectedItem.maxGrade}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-widest leading-none">
                            НА ПРОВЕРКЕ
                          </span>
                        )}
                      </div>
                    </div>

                    {activeSubmission.comment && (
                      <div className="bg-indigo-50/30 p-4 border border-indigo-100 rounded-xl">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider font-mono block">
                          Вердикт преподавателя:
                        </span>
                        <p className="text-slate-700 text-sm mt-1 italic">
                          &ldquo;{activeSubmission.comment}&rdquo;
                        </p>
                      </div>
                    )}

                    
                    <div className="space-y-3.5 pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Диалог с преподавателем ({activeSubmission.comments?.length || 0})
                      </h5>

                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {!activeSubmission.comments || activeSubmission.comments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-2">
                            Нет сообщений. Вы можете задать вопрос преподавателю касательно этой работы.
                          </p>
                        ) : (
                          activeSubmission.comments.map(comm => {
                            const isMe = comm.authorId === currentStudent.id;
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

                      
                      <form onSubmit={handlePostComment} className="flex gap-2.5">
                        <input
                          type="text"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          className="flex-1 text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-500 transition"
                          placeholder="Задать вопрос или написать комментарий..."
                        />
                        <button
                          type="submit"
                          className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition cursor-pointer min-h-[40px] flex items-center justify-center shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
