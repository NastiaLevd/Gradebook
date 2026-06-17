import express, { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'fs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';
import { dbManager } from './src/server/db';
import { FeedbackComment, Grade, LabSubmission, Lesson, SyllabusItem, User, UserRole } from './src/types';

const PORT = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'gradebook-dev-secret';
const uploadRoot = path.resolve(process.cwd(), 'uploads', 'submissions');

interface AuthUser {
  id: string;
  role: UserRole;
}

type AuthRequest = Request & { auth?: AuthUser };

function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function sanitizeUser(user: User): User {
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

function createToken(user: User): string {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '8h' });
}

function currentAuth(req: Request): AuthUser {
  return (req as AuthRequest).auth!;
}

function findCurrentUser(store: Awaited<ReturnType<typeof dbManager.getStore>>, req: Request): User | undefined {
  return store.users.find(user => user.id === currentAuth(req).id);
}

function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    res.status(401).json({ error: 'Не авторизован' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as AuthUser;
    (req as AuthRequest).auth = { id: payload.id, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (currentAuth(req).role !== role) {
      res.status(403).json({ error: 'Недостаточно прав' });
      return;
    }
    next();
  };
}

function safeFileName(fileName: string): string {
  const baseName = path.basename(fileName).replace(/[^\p{L}\p{N}._-]+/gu, '_');
  return baseName || 'solution.bin';
}

function parsePartnerIds(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(parsePartnerIds);

  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}

  return text.split(',').map(item => item.trim()).filter(Boolean);
}

function canAccessSubmission(store: Awaited<ReturnType<typeof dbManager.getStore>>, user: User, submission: LabSubmission): boolean {
  if (user.role === 'teacher') {
    return store.subjects.some(subject => subject.id === submission.subjectId && subject.teacherId === user.id);
  }

  return submission.studentId === user.id || Boolean(submission.partnerIds?.includes(user.id));
}

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => `${a.date} ${a.timeStart}`.localeCompare(`${b.date} ${b.timeStart}`));
}

function toGradeValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const grade = Number(value);
  if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
    throw new Error('Оценка должна быть целым числом от 1 до 10');
  }
  return grade;
}

async function startServer() {
  await fs.mkdir(uploadRoot, { recursive: true });

  const app = express();
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadRoot,
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}_${randomUUID()}_${safeFileName(file.originalname)}`);
      }
    }),
    limits: { fileSize: 25 * 1024 * 1024 }
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
      return;
    }

    const store = await dbManager.getStore();
    const user = store.users.find(item => item.username.toLowerCase() === String(username).toLowerCase());

    if (!user || user.password !== password) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    res.json({ token: createToken(user), user: sanitizeUser(user) });
  }));

  app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || '').trim() as UserRole;
    const groupName = String(req.body.groupName || '').trim();

    if (!username || !password || !name || !email || !role) {
      res.status(400).json({ error: 'Заполните все обязательные поля' });
      return;
    }

    if (!['student', 'teacher'].includes(role)) {
      res.status(400).json({ error: 'Выберите роль студента или преподавателя' });
      return;
    }

    if (role === 'student' && !groupName) {
      res.status(400).json({ error: 'Для студента нужно указать группу' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
      return;
    }

    const store = await dbManager.getStore();
    const usernameExists = store.users.some(user => user.username.toLowerCase() === username.toLowerCase());
    const emailExists = store.users.some(user => user.email.toLowerCase() === email);

    if (usernameExists) {
      res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
      return;
    }

    if (emailExists) {
      res.status(409).json({ error: 'Пользователь с такой почтой уже существует' });
      return;
    }

    const user: User = {
      id: `user_${randomUUID()}`,
      username,
      password,
      name,
      email,
      role,
      groupName: role === 'student' ? groupName : undefined,
      isNew: role === 'student' ? true : undefined
    };

    store.users.push(user);
    await dbManager.saveStore(store);
    res.status(201).json({ token: createToken(user), user: sanitizeUser(user) });
  }));

  app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  }));

  app.get('/api/schedule', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const lessons = user.role === 'teacher'
      ? store.lessons.filter(lesson => lesson.teacherId === user.id)
      : store.lessons.filter(lesson => lesson.groupName === user.groupName);

    res.json(sortLessons(lessons));
  }));

  app.get('/api/subjects', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const subjects = user.role === 'teacher'
      ? store.subjects.filter(subject => subject.teacherId === user.id)
      : store.subjects;

    res.json(subjects);
  }));

  app.get('/api/students', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const students = store.users
      .filter(item => item.role === 'student')
      .filter(item => user.role === 'teacher' || item.groupName === user.groupName)
      .map(sanitizeUser);

    res.json(students);
  }));

  app.get('/api/gradebook', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;
    const groupName = typeof req.query.groupName === 'string' ? req.query.groupName : undefined;

    let lessons = store.lessons;

    if (user.role === 'teacher') {
      lessons = lessons.filter(lesson => lesson.teacherId === user.id);
      if (subjectId) lessons = lessons.filter(lesson => lesson.subjectId === subjectId);
      if (groupName) lessons = lessons.filter(lesson => lesson.groupName === groupName);
    } else {
      lessons = lessons.filter(lesson => lesson.groupName === user.groupName);
    }

    const lessonIds = new Set(lessons.map(lesson => lesson.id));
    const groupNames = new Set(lessons.map(lesson => lesson.groupName));
    const subjectIds = new Set(lessons.map(lesson => lesson.subjectId));

    const students = store.users
      .filter(item => item.role === 'student')
      .filter(item => user.role === 'teacher' ? groupNames.has(item.groupName || '') : item.id === user.id)
      .map(sanitizeUser);

    const grades = store.grades.filter(grade => {
      if (!lessonIds.has(grade.lessonId)) return false;
      return user.role === 'teacher' || grade.studentId === user.id;
    });

    const subjects = store.subjects.filter(subject => subjectIds.has(subject.id));
    res.json({ subjects, lessons: sortLessons(lessons), students, grades });
  }));

  app.post('/api/lessons/add', authenticate, requireRole('teacher'), asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const { subjectId, groupName, date, timeStart, timeEnd, type } = req.body;
    const subject = store.subjects.find(item => item.id === subjectId && item.teacherId === user.id);

    if (!subject || !groupName || !date || !timeStart || !timeEnd || !type) {
      res.status(400).json({ error: 'Проверьте предмет, группу, дату, время и тип занятия' });
      return;
    }

    const lesson: Lesson = {
      id: `les_${randomUUID()}`,
      subjectId,
      subjectName: subject.name,
      groupName,
      teacherId: user.id,
      date,
      timeStart,
      timeEnd,
      type
    };

    store.lessons.push(lesson);
    await dbManager.saveStore(store);
    res.json(lesson);
  }));

  app.post('/api/gradebook/update', authenticate, requireRole('teacher'), asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const { studentId, subjectId, lessonId, grade, isAbsent, isLate, lateMinutes } = req.body;
    const subject = store.subjects.find(item => item.id === subjectId && item.teacherId === user.id);
    const lesson = store.lessons.find(item => item.id === lessonId && item.subjectId === subjectId && item.teacherId === user.id);
    const student = store.users.find(item => item.id === studentId && item.role === 'student');

    if (!subject || !lesson || !student) {
      res.status(400).json({ error: 'Неверный студент, предмет или занятие' });
      return;
    }

    let nextGrade: number | undefined;
    try {
      nextGrade = toGradeValue(grade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }

    let item = store.grades.find(entry => entry.studentId === studentId && entry.lessonId === lessonId);

    if (!item) {
      item = { id: `gr_${randomUUID()}`, studentId, subjectId, lessonId };
      store.grades.push(item);
    }

    if (grade !== undefined) item.grade = nextGrade;
    if (isAbsent !== undefined) item.isAbsent = Boolean(isAbsent);
    if (isLate !== undefined) item.isLate = Boolean(isLate);
    item.lateMinutes = item.isLate ? Number(lateMinutes || item.lateMinutes || 15) : undefined;

    if (item.grade !== undefined) {
      item.isAbsent = false;
      item.isLate = false;
      item.lateMinutes = undefined;
    }

    if (item.isAbsent || item.isLate) {
      item.grade = undefined;
    }

    if (item.grade === undefined && !item.isAbsent && !item.isLate) {
      store.grades = store.grades.filter(entry => entry.id !== item!.id);
    }

    await dbManager.saveStore(store);
    res.json({ message: 'Запись журнала обновлена', grade: item });
  }));

  app.get('/api/syllabus', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;
    const items = subjectId ? store.syllabusItems.filter(item => item.subjectId === subjectId) : store.syllabusItems;
    res.json(items);
  }));

  app.post('/api/syllabus/update', authenticate, requireRole('teacher'), asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const { id, subjectId, type, title, description, maxGrade, deadline, materials, tzContent, allowTeams } = req.body;
    const subject = store.subjects.find(item => item.id === subjectId && item.teacherId === user.id);
    const numericMaxGrade = Number(maxGrade);

    if (!subject || !title || !type || !Number.isInteger(numericMaxGrade) || numericMaxGrade < 1 || numericMaxGrade > 10) {
      res.status(400).json({ error: 'Проверьте предмет, название, тип и максимальный балл' });
      return;
    }

    const item: SyllabusItem = {
      id: id || `syl_${randomUUID()}`,
      subjectId,
      type,
      title,
      description: description || '',
      maxGrade: numericMaxGrade,
      deadline: deadline || undefined,
      materials: materials || undefined,
      tzContent: tzContent || undefined,
      allowTeams: Boolean(allowTeams)
    };

    const index = store.syllabusItems.findIndex(entry => entry.id === item.id);
    if (index >= 0) {
      store.syllabusItems[index] = item;
    } else {
      store.syllabusItems.push(item);
    }

    await dbManager.saveStore(store);
    res.json(item);
  }));

  app.get('/api/submissions', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const submissions = store.submissions.filter(submission => canAccessSubmission(store, user, submission));
    res.json(submissions);
  }));

  app.post('/api/submissions/submit', authenticate, requireRole('student'), upload.single('file'), asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);
    const uploadedFile = req.file;

    if (!user || !uploadedFile) {
      res.status(400).json({ error: 'Файл решения обязателен' });
      return;
    }

    const syllabusItemId = String(req.body.syllabusItemId || '');
    const syllabusItem = store.syllabusItems.find(item => item.id === syllabusItemId);

    if (!syllabusItem) {
      await fs.unlink(uploadedFile.path).catch(() => undefined);
      res.status(404).json({ error: 'Лабораторная работа не найдена' });
      return;
    }

    const partnerIds = parsePartnerIds(req.body.partnerIds);
    const partners = store.users.filter(item => partnerIds.includes(item.id));

    if (partnerIds.length > 0) {
      const validPartners = partners.length === partnerIds.length
        && partners.every(partner => partner.role === 'student' && partner.groupName === user.groupName && partner.id !== user.id)
        && syllabusItem.allowTeams;

      if (!validPartners) {
        await fs.unlink(uploadedFile.path).catch(() => undefined);
        res.status(400).json({ error: 'Некорректный состав команды для этой работы' });
        return;
      }
    }

    const submission: LabSubmission = {
      id: `subm_${randomUUID()}`,
      studentId: user.id,
      studentName: user.name,
      groupName: user.groupName || '',
      syllabusItemId,
      syllabusItemTitle: syllabusItem.title,
      subjectId: syllabusItem.subjectId,
      filePath: path.relative(process.cwd(), uploadedFile.path),
      fileName: uploadedFile.originalname,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      partnerIds,
      partnerNames: partners.map(partner => partner.name),
      comments: []
    };

    store.submissions.push(submission);
    await dbManager.saveStore(store);
    res.json(submission);
  }));

  app.get('/api/submissions/:id/file', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);
    const submission = store.submissions.find(item => item.id === req.params.id);

    if (!user || !submission || !canAccessSubmission(store, user, submission)) {
      res.status(404).json({ error: 'Файл не найден' });
      return;
    }

    if (!submission.filePath) {
      res.status(404).json({ error: 'Для этой сдачи файл отсутствует' });
      return;
    }

    const absolutePath = path.resolve(process.cwd(), submission.filePath);
    if (!absolutePath.toLowerCase().startsWith(uploadRoot.toLowerCase())) {
      res.status(403).json({ error: 'Недопустимый путь к файлу' });
      return;
    }

    await fs.access(absolutePath);
    res.download(absolutePath, submission.fileName || path.basename(absolutePath));
  }));

  app.post('/api/submissions/grade', authenticate, requireRole('teacher'), asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);
    const { submissionId, grade, comment } = req.body;
    const submission = store.submissions.find(item => item.id === submissionId);

    if (!user || !submission || !canAccessSubmission(store, user, submission)) {
      res.status(404).json({ error: 'Сдача не найдена' });
      return;
    }

    let nextGrade: number;
    try {
      const parsedGrade = toGradeValue(grade);
      if (parsedGrade === undefined) throw new Error('Оценка обязательна');
      nextGrade = parsedGrade;
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }

    submission.status = 'checked';
    submission.grade = nextGrade;
    submission.comment = comment || undefined;

    await dbManager.saveStore(store);
    res.json(submission);
  }));

  app.post('/api/submissions/comment', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = findCurrentUser(store, req);
    const { submissionId, text } = req.body;
    const submission = store.submissions.find(item => item.id === submissionId);

    if (!user || !submission || !canAccessSubmission(store, user, submission)) {
      res.status(404).json({ error: 'Сдача не найдена' });
      return;
    }

    if (!String(text || '').trim()) {
      res.status(400).json({ error: 'Текст комментария обязателен' });
      return;
    }

    const comment: FeedbackComment = {
      id: `comm_${randomUUID()}`,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      text: String(text).trim(),
      createdAt: new Date().toISOString()
    };

    submission.comments = [...(submission.comments || []), comment];
    await dbManager.saveStore(store);
    res.json(comment);
  }));

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Файл превышает лимит 25 МБ' : error.message });
      return;
    }

    if (res.headersSent) {
      next(error);
      return;
    }

    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    res.status(500).json({ error: message });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Gradebook server: http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error(error);
  process.exit(1);
});
