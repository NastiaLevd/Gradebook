import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';
import { dbManager } from './src/server/db';
import { Lesson, User, UserRole } from './src/types';

const PORT = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'gradebook-dev-secret';

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

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => `${a.date} ${a.timeStart}`.localeCompare(`${b.date} ${b.timeStart}`));
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Логин и пароль обязательны' });
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
      res.status(400).json({ error: 'Выберите роль student или teacher' });
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
    if (store.users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
      res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
      return;
    }

    if (store.users.some(user => user.email.toLowerCase() === email)) {
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
    const user = store.users.find(item => item.id === currentAuth(req).id);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  }));

  app.get('/api/schedule', authenticate, asyncHandler(async (req, res) => {
    const store = await dbManager.getStore();
    const user = store.users.find(item => item.id === currentAuth(req).id);

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
    const user = store.users.find(item => item.id === currentAuth(req).id);

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
    const user = store.users.find(item => item.id === currentAuth(req).id);

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
    const user = store.users.find(item => item.id === currentAuth(req).id);

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' });
      return;
    }

    const subjectId = String(req.query.subjectId || '');
    const groupName = String(req.query.groupName || '');

    let subjects = user.role === 'teacher'
      ? store.subjects.filter(subject => subject.teacherId === user.id)
      : store.subjects;
    if (subjectId) subjects = subjects.filter(subject => subject.id === subjectId);

    const subjectIds = new Set(subjects.map(subject => subject.id));
    let lessons = store.lessons.filter(lesson => subjectIds.has(lesson.subjectId));
    if (user.role === 'teacher') {
      lessons = lessons.filter(lesson => lesson.teacherId === user.id);
      if (groupName) lessons = lessons.filter(lesson => lesson.groupName === groupName);
    } else {
      lessons = lessons.filter(lesson => lesson.groupName === user.groupName);
    }

    const lessonIds = new Set(lessons.map(lesson => lesson.id));
    const groupNames = new Set(lessons.map(lesson => lesson.groupName));
    const students = store.users
      .filter(item => item.role === 'student')
      .filter(item => user.role === 'teacher' ? groupNames.has(item.groupName || '') : item.id === user.id)
      .map(sanitizeUser);

    const grades = store.grades.filter(grade => {
      if (!lessonIds.has(grade.lessonId)) return false;
      return user.role === 'teacher' || grade.studentId === user.id;
    });

    res.json({ subjects, lessons: sortLessons(lessons), students, grades });
  }));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Ошибка сервера' });
  });

  await dbManager.init();
  app.listen(PORT, () => {
    console.log(`Gradebook server: http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
