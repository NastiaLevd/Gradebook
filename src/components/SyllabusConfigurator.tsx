import React, { useState, useEffect } from 'react';
import { BookOpen, FileCode, Users, Plus, Target, Clock, ToggleLeft, Edit2 } from 'lucide-react';
import { Subject, SyllabusItem } from '../types.js';

interface SyllabusConfiguratorProps {
  subjects: Subject[];
  authToken: string;
}

export default function SyllabusConfigurator({ subjects, authToken }: SyllabusConfiguratorProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'lab' | 'lecture' | 'practice' | 'test'>('lab');
  const [description, setDescription] = useState('');
  const [maxGrade, setMaxGrade] = useState(10);
  const [deadline, setDeadline] = useState('');
  const [materials, setMaterials] = useState('');
  const [tzContent, setTzContent] = useState('');
  const [allowTeams, setAllowTeams] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchSyllabus = async () => {
    if (!selectedSubjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/syllabus?subjectId=${selectedSubjectId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setSyllabusItems(data || []);
    } catch (e) {
      console.error('Failed to pull program items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabus();
  }, [selectedSubjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Заголовок обязателен');
      return;
    }

    try {
      const payload = {
        id: editingId || undefined,
        subjectId: selectedSubjectId,
        type,
        title,
        description,
        maxGrade: Number(maxGrade),
        deadline: deadline || undefined,
        materials: materials || undefined,
        tzContent: tzContent || undefined,
        allowTeams
      };

      const response = await fetch('/api/syllabus/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить учебную программу');
      }

      setTitle('');
      setDescription('');
      setMaxGrade(5);
      setDeadline('');
      setMaterials('');
      setTzContent('');
      setAllowTeams(false);
      setEditingId(null);

      fetchSyllabus();
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения');
    }
  };

  const startEdit = (item: SyllabusItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setType(item.type);
    setDescription(item.description);
    setMaxGrade(item.maxGrade);
    setDeadline(item.deadline || '');
    setMaterials(item.materials || '');
    setTzContent(item.tzContent || '');
    setAllowTeams(item.allowTeams || false);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Программа по предмету</h2>
          <p className="text-sm text-slate-500">Настройка структуры курса, ТЗ, графиков сдачи и распределения команд</p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="subj_sys_config" className="text-xs font-semibold text-slate-500 uppercase">Выбор дисциплины:</label>
          <select
            id="subj_sys_config"
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setEditingId(null);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-4">
            {editingId ? <Edit2 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
            {editingId ? 'Редактировать элемент программы' : 'Добавить учебный элемент'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="sys_title" className="text-xs font-semibold text-slate-600 block mb-1">Наименование занятия/работы:</label>
              <input
                id="sys_title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Интерактивный React-клиент"
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sys_type" className="text-xs font-semibold text-slate-600 block mb-1">Тип:</label>
                <select
                  id="sys_type"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                >
                  <option value="lab">Лабораторная</option>
                  <option value="lecture">Лекция / Тема</option>
                  <option value="practice">Практика</option>
                  <option value="test">Контрольная / Тест</option>
                </select>
              </div>

              <div>
                <label htmlFor="sys_max" className="text-xs font-semibold text-slate-600 block mb-1">Макс. Оценка:</label>
                <input
                  id="sys_max"
                  type="number"
                  min="1"
                  max="10"
                  value={maxGrade}
                  onChange={(e) => setMaxGrade(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sys_deadline" className="text-xs font-semibold text-slate-600 block mb-1">Крайний срок (Дедлайн):</label>
              <input
                id="sys_deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 outline-none font-mono"
              />
            </div>

            <div>
              <label htmlFor="sys_desc" className="text-xs font-semibold text-slate-600 block mb-1">Описание работы / Краткий анонс:</label>
              <textarea
                id="sys_desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="В этой работе студенты изучают..."
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label htmlFor="sys_tz" className="text-xs font-semibold text-slate-600 block mb-1">Техническое Задание (ТЗ):</label>
              <textarea
                id="sys_tz"
                rows={3}
                value={tzContent}
                onChange={(e) => setTzContent(e.target.value)}
                placeholder="1. Использовать HTML семантику...&#10;2. Написать README скрипты..."
                className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label htmlFor="sys_mats" className="text-xs font-semibold text-slate-600 block mb-1">Теоретические материалы (ссылки, лекция):</label>
              <textarea
                id="sys_mats"
                rows={2}
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="Изучите спецификацию Grid на MDN"
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 outline-none"
              />
            </div>

            
            {type === 'lab' && (
              <div className="flex items-center justify-between p-3 bg-indigo-50/40 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Разрешить командную сдачу (до 2чел.)
                </span>
                <input
                  type="checkbox"
                  checked={allowTeams}
                  onChange={(e) => setAllowTeams(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            )}

            {error && (
              <p className="p-2.5 bg-rose-50 text-rose-600 text-xs rounded-xl" id="sys_error">{error}</p>
            )}

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTitle('');
                    setDescription('');
                    setDeadline('');
                    setMaterials('');
                    setTzContent('');
                    setAllowTeams(false);
                  }}
                  className="px-4 py-2 border border-slate-200 text-xs text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
              )}
              <button
                type="submit"
                id="sys_submit_btn"
                className="flex-1 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 hover:shadow-md transition cursor-pointer"
              >
                {editingId ? 'Обновить в курсе' : 'Сохранить шаблон'}
              </button>
            </div>
          </form>
        </div>

        
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Активные разделы и ТЗ программы курса
          </h3>

          {loading ? (
            <div className="p-12 text-center bg-white border border-slate-100 rounded-2xl">
              Загрузка верстки структуры...
            </div>
          ) : syllabusItems.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-100 rounded-2xl text-slate-400">
              По данному предмету учебная программа еще пуста. Вы можете создать первый пункт слева.
            </div>
          ) : (
            <div className="space-y-4">
              {syllabusItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm relative group overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 uppercase tracking-wider font-mono">
                        {item.type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    </div>

                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition"
                      title="Редактировать ТЗ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-4 pt-3.5 border-t border-slate-50 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-slate-400" />
                      Оценка: <strong className="text-slate-800 font-mono">{item.maxGrade}б</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Срок: <strong className="text-slate-800 font-mono">{item.deadline || 'Без срока'}</strong>
                    </span>
                    <span className="flex items-center gap-1 col-span-2 md:col-span-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Группы: <strong className="text-slate-800">{item.allowTeams ? 'Командные' : 'Индивид.'}</strong>
                    </span>
                  </div>

                  {item.tzContent && (
                    <div className="mt-3.5 bg-slate-50/50 rounded-lg p-3 text-[11px] text-slate-600 border border-slate-100/40">
                      <p className="font-semibold text-[10px] text-indigo-800 uppercase tracking-wider mb-1 font-mono">Технические требования (ТЗ):</p>
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{item.tzContent}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
