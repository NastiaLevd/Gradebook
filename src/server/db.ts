import dotenv from 'dotenv';
import sql from 'mssql/msnodesqlv8';
import { Grade, Lesson, Subject, SyllabusItem, User } from '../types.js';

dotenv.config({ quiet: true });

export interface DBStore {
  users: User[];
  subjects: Subject[];
  lessons: Lesson[];
  grades: Grade[];
  syllabusItems: SyllabusItem[];
}

const databaseName = process.env.DB_DATABASE || 'Gradebook';

const initialStore: DBStore = {
  users: [
    { id: 'teacher_main', username: 'teacher', name: 'Дмитрий Александрович Морозов', email: 'teacher@university.local', role: 'teacher', password: 'teacher123' },
    { id: 'student_main', username: 'student', name: 'Александр Иванов', email: 'student@university.local', role: 'student', groupName: 'ИВТ-31', password: 'student123' }
  ],
  subjects: [
    { id: 'sub_databases', name: 'Базы данных', teacherId: 'teacher_main', teacherName: 'Дмитрий Александрович Морозов' },
    { id: 'sub_web', name: 'Разработка веб-приложений', teacherId: 'teacher_main', teacherName: 'Дмитрий Александрович Морозов' }
  ],
  lessons: [
    { id: 'lesson_db_1', subjectId: 'sub_databases', subjectName: 'Базы данных', groupName: 'ИВТ-31', teacherId: 'teacher_main', date: '2026-06-01', timeStart: '10:15', timeEnd: '11:45', type: 'lecture' },
    { id: 'lesson_web_1', subjectId: 'sub_web', subjectName: 'Разработка веб-приложений', groupName: 'ИВТ-31', teacherId: 'teacher_main', date: '2026-06-01', timeStart: '12:00', timeEnd: '13:30', type: 'lab' },
    { id: 'lesson_db_2', subjectId: 'sub_databases', subjectName: 'Базы данных', groupName: 'ИВТ-31', teacherId: 'teacher_main', date: '2026-06-02', timeStart: '08:30', timeEnd: '10:00', type: 'practice' }
  ],
  grades: [
    { id: 'grade_1', studentId: 'student_main', subjectId: 'sub_databases', lessonId: 'lesson_db_1', grade: 9 },
    { id: 'grade_2', studentId: 'student_main', subjectId: 'sub_web', lessonId: 'lesson_web_1', grade: 8 }
  ],
  syllabusItems: [
    {
      id: 'syl_web_1',
      subjectId: 'sub_web',
      type: 'lab',
      title: 'Лабораторная работа №1: HTML и CSS',
      description: 'Сверстать страницу и применить базовые стили.',
      maxGrade: 10,
      deadline: '2026-05-25',
      materials: 'HTML5, CSS Grid, Flexbox.',
      tzContent: '1. Использовать семантические теги.\n2. Настроить адаптивную сетку.\n3. Подготовить архив с исходниками.',
      allowTeams: false
    },
    {
      id: 'syl_web_2',
      subjectId: 'sub_web',
      type: 'lab',
      title: 'Лабораторная работа №2: React-клиент',
      description: 'Создать интерактивный клиент на React.',
      maxGrade: 10,
      deadline: '2026-06-10',
      materials: 'React hooks, TypeScript.',
      tzContent: '1. Компоненты на React.\n2. Состояние через hooks.\n3. Командная работа до двух человек.',
      allowTeams: true
    },
    {
      id: 'syl_db_1',
      subjectId: 'sub_databases',
      type: 'practice',
      title: 'Практика: схема SQL Server',
      description: 'Спроектировать таблицы, связи и ограничения.',
      maxGrade: 10,
      deadline: '2026-06-05',
      materials: 'Нормализация, ключи, T-SQL DDL.',
      tzContent: '1. Выделить сущности.\n2. Описать связи.\n3. Подготовить SQL-скрипт.',
      allowTeams: false
    }
  ]
};

function createConfig(database: string): sql.config {
  const trustedConnection = process.env.DB_TRUSTED_CONNECTION !== 'false';
  const config: sql.config = {
    server: process.env.DB_SERVER || '.\\SQLEXPRESS',
    database,
    options: {
      trustedConnection,
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
      encrypt: false
    } as any,
    connectionTimeout: 15000,
    requestTimeout: 15000
  };

  if (process.env.DB_PORT) config.port = Number(process.env.DB_PORT);

  if (!trustedConnection) {
    config.user = process.env.DB_USER || 'sa';
    config.password = process.env.DB_PASSWORD || '';
  }

  return config;
}

function cloneStore(store: DBStore): DBStore {
  return JSON.parse(JSON.stringify(store));
}

function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toTimeString(value: unknown): string {
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  const [hours = '00', minutes = '00'] = String(value).split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

class DBManager {
  private pool: sql.ConnectionPool | null = null;
  private cache: DBStore | null = null;

  private async ensureDatabase(): Promise<void> {
    const masterPool = await sql.connect(createConfig('master'));
    try {
      await masterPool.request()
        .input('databaseName', sql.NVarChar, databaseName)
        .query(`
          IF DB_ID(@databaseName) IS NULL
          BEGIN
            DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE ' + QUOTENAME(@databaseName);
            EXEC(@sql);
          END
        `);
    } finally {
      await masterPool.close();
    }
  }

  private async ensureSchema(): Promise<void> {
    if (!this.pool) return;

    await this.pool.request().query(`
      IF OBJECT_ID('dbo.Users', 'U') IS NULL
      CREATE TABLE dbo.Users (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        [name] NVARCHAR(150) NOT NULL,
        email NVARCHAR(100) NOT NULL UNIQUE,
        [role] NVARCHAR(20) NOT NULL CHECK ([role] IN ('student', 'teacher')),
        groupName NVARCHAR(50) NULL,
        isNew BIT NOT NULL DEFAULT 0,
        isExpelled BIT NOT NULL DEFAULT 0,
        [password] NVARCHAR(100) NOT NULL
      );

      IF OBJECT_ID('dbo.Subjects', 'U') IS NULL
      CREATE TABLE dbo.Subjects (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        [name] NVARCHAR(150) NOT NULL,
        teacherId NVARCHAR(50) NOT NULL,
        CONSTRAINT FK_Subjects_Users FOREIGN KEY (teacherId) REFERENCES dbo.Users(id)
      );

      IF OBJECT_ID('dbo.Lessons', 'U') IS NULL
      CREATE TABLE dbo.Lessons (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        subjectId NVARCHAR(50) NOT NULL,
        groupName NVARCHAR(50) NOT NULL,
        teacherId NVARCHAR(50) NOT NULL,
        [date] DATE NOT NULL,
        timeStart TIME NOT NULL,
        timeEnd TIME NOT NULL,
        [type] NVARCHAR(20) NOT NULL CHECK ([type] IN ('lecture', 'lab', 'practice', 'test', 'oral')),
        CONSTRAINT FK_Lessons_Subjects FOREIGN KEY (subjectId) REFERENCES dbo.Subjects(id),
        CONSTRAINT FK_Lessons_Users FOREIGN KEY (teacherId) REFERENCES dbo.Users(id)
      );

      IF OBJECT_ID('dbo.Grades', 'U') IS NULL
      CREATE TABLE dbo.Grades (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        studentId NVARCHAR(50) NOT NULL,
        subjectId NVARCHAR(50) NOT NULL,
        lessonId NVARCHAR(50) NOT NULL,
        grade INT NULL CHECK (grade BETWEEN 1 AND 10),
        isAbsent BIT NOT NULL DEFAULT 0,
        isLate BIT NOT NULL DEFAULT 0,
        lateMinutes INT NULL,
        CONSTRAINT FK_Grades_Students FOREIGN KEY (studentId) REFERENCES dbo.Users(id),
        CONSTRAINT FK_Grades_Subjects FOREIGN KEY (subjectId) REFERENCES dbo.Subjects(id),
        CONSTRAINT FK_Grades_Lessons FOREIGN KEY (lessonId) REFERENCES dbo.Lessons(id) ON DELETE CASCADE,
        CONSTRAINT UQ_Grades_StudentLesson UNIQUE (studentId, lessonId)
      );

      IF OBJECT_ID('dbo.SyllabusItems', 'U') IS NULL
      CREATE TABLE dbo.SyllabusItems (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        subjectId NVARCHAR(50) NOT NULL,
        [type] NVARCHAR(20) NOT NULL CHECK ([type] IN ('lab', 'lecture', 'practice', 'test')),
        title NVARCHAR(200) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        maxGrade INT NOT NULL DEFAULT 10,
        deadline DATE NULL,
        materials NVARCHAR(MAX) NULL,
        tzContent NVARCHAR(MAX) NULL,
        allowTeams BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SyllabusItems_Subjects FOREIGN KEY (subjectId) REFERENCES dbo.Subjects(id) ON DELETE CASCADE
      );
    `);
  }

  private async seedIfEmpty(): Promise<void> {
    if (!this.pool) return;
    const result = await this.pool.request().query('SELECT COUNT(*) AS count FROM dbo.Users');
    if (Number(result.recordset[0]?.count || 0) > 0) return;
    await this.saveStore(initialStore);
  }

  private async loadStore(): Promise<DBStore> {
    if (!this.pool) return cloneStore(initialStore);

    const [usersRes, subjectsRes, lessonsRes, gradesRes, syllabusRes] = await Promise.all([
      this.pool.request().query('SELECT * FROM dbo.Users ORDER BY [role], [name]'),
      this.pool.request().query(`
        SELECT S.*, U.[name] AS teacherName
        FROM dbo.Subjects S
        INNER JOIN dbo.Users U ON U.id = S.teacherId
        ORDER BY S.[name]
      `),
      this.pool.request().query(`
        SELECT L.*, S.[name] AS subjectName
        FROM dbo.Lessons L
        INNER JOIN dbo.Subjects S ON S.id = L.subjectId
        ORDER BY L.[date], L.timeStart
      `),
      this.pool.request().query('SELECT * FROM dbo.Grades'),
      this.pool.request().query('SELECT * FROM dbo.SyllabusItems ORDER BY subjectId, deadline, title')
    ]);

    return {
      users: usersRes.recordset.map(row => ({
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        groupName: row.groupName ?? undefined,
        isNew: Boolean(row.isNew),
        isExpelled: Boolean(row.isExpelled),
        password: row.password
      })),
      subjects: subjectsRes.recordset.map(row => ({
        id: row.id,
        name: row.name,
        teacherId: row.teacherId,
        teacherName: row.teacherName
      })),
      lessons: lessonsRes.recordset.map(row => ({
        id: row.id,
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        groupName: row.groupName,
        teacherId: row.teacherId,
        date: toDateString(row.date),
        timeStart: toTimeString(row.timeStart),
        timeEnd: toTimeString(row.timeEnd),
        type: row.type
      })),
      grades: gradesRes.recordset.map(row => ({
        id: row.id,
        studentId: row.studentId,
        subjectId: row.subjectId,
        lessonId: row.lessonId,
        grade: row.grade ?? undefined,
        isAbsent: Boolean(row.isAbsent),
        isLate: Boolean(row.isLate),
        lateMinutes: row.lateMinutes ?? undefined
      })),
      syllabusItems: syllabusRes.recordset.map(row => ({
        id: row.id,
        subjectId: row.subjectId,
        type: row.type,
        title: row.title,
        description: row.description || '',
        maxGrade: row.maxGrade,
        deadline: row.deadline ? toDateString(row.deadline) : undefined,
        materials: row.materials ?? undefined,
        tzContent: row.tzContent ?? undefined,
        allowTeams: Boolean(row.allowTeams)
      }))
    };
  }

  public async init(): Promise<void> {
    await this.ensureDatabase();
    this.pool = await sql.connect(createConfig(databaseName));
    await this.ensureSchema();
    await this.seedIfEmpty();
    this.cache = await this.loadStore();
  }

  public async getStore(): Promise<DBStore> {
    if (!this.cache) await this.init();
    return cloneStore(this.cache!);
  }

  public async saveStore(store: DBStore): Promise<void> {
    if (!this.pool) await this.init();
    if (!this.pool) throw new Error('SQL Server connection is not initialized');

    const tx = new sql.Transaction(this.pool);
    await tx.begin();
    try {
      const request = () => new sql.Request(tx);
      await request().query(`
        DELETE FROM dbo.Grades;
        DELETE FROM dbo.Lessons;
        DELETE FROM dbo.SyllabusItems;
        DELETE FROM dbo.Subjects;
        DELETE FROM dbo.Users;
      `);

      for (const user of store.users) {
        await request()
          .input('id', sql.NVarChar, user.id)
          .input('username', sql.NVarChar, user.username)
          .input('name', sql.NVarChar, user.name)
          .input('email', sql.NVarChar, user.email)
          .input('role', sql.NVarChar, user.role)
          .input('groupName', sql.NVarChar, user.groupName ?? null)
          .input('isNew', sql.Bit, user.isNew ? 1 : 0)
          .input('isExpelled', sql.Bit, user.isExpelled ? 1 : 0)
          .input('password', sql.NVarChar, user.password || '')
          .query(`
            INSERT INTO dbo.Users (id, username, [name], email, [role], groupName, isNew, isExpelled, [password])
            VALUES (@id, @username, @name, @email, @role, @groupName, @isNew, @isExpelled, @password)
          `);
      }

      for (const subject of store.subjects) {
        await request()
          .input('id', sql.NVarChar, subject.id)
          .input('name', sql.NVarChar, subject.name)
          .input('teacherId', sql.NVarChar, subject.teacherId)
          .query('INSERT INTO dbo.Subjects (id, [name], teacherId) VALUES (@id, @name, @teacherId)');
      }

      for (const item of store.syllabusItems) {
        await request()
          .input('id', sql.NVarChar, item.id)
          .input('subjectId', sql.NVarChar, item.subjectId)
          .input('type', sql.NVarChar, item.type)
          .input('title', sql.NVarChar, item.title)
          .input('description', sql.NVarChar, item.description || '')
          .input('maxGrade', sql.Int, item.maxGrade)
          .input('deadline', sql.Date, item.deadline ?? null)
          .input('materials', sql.NVarChar, item.materials ?? null)
          .input('tzContent', sql.NVarChar, item.tzContent ?? null)
          .input('allowTeams', sql.Bit, item.allowTeams ? 1 : 0)
          .query(`
            INSERT INTO dbo.SyllabusItems (id, subjectId, [type], title, [description], maxGrade, deadline, materials, tzContent, allowTeams)
            VALUES (@id, @subjectId, @type, @title, @description, @maxGrade, @deadline, @materials, @tzContent, @allowTeams)
          `);
      }

      for (const lesson of store.lessons) {
        await request()
          .input('id', sql.NVarChar, lesson.id)
          .input('subjectId', sql.NVarChar, lesson.subjectId)
          .input('groupName', sql.NVarChar, lesson.groupName)
          .input('teacherId', sql.NVarChar, lesson.teacherId)
          .input('date', sql.Date, lesson.date)
          .input('timeStart', sql.VarChar, lesson.timeStart)
          .input('timeEnd', sql.VarChar, lesson.timeEnd)
          .input('type', sql.NVarChar, lesson.type)
          .query(`
            INSERT INTO dbo.Lessons (id, subjectId, groupName, teacherId, [date], timeStart, timeEnd, [type])
            VALUES (@id, @subjectId, @groupName, @teacherId, @date, @timeStart, @timeEnd, @type)
          `);
      }

      for (const grade of store.grades) {
        await request()
          .input('id', sql.NVarChar, grade.id)
          .input('studentId', sql.NVarChar, grade.studentId)
          .input('subjectId', sql.NVarChar, grade.subjectId)
          .input('lessonId', sql.NVarChar, grade.lessonId)
          .input('grade', sql.Int, grade.grade ?? null)
          .input('isAbsent', sql.Bit, grade.isAbsent ? 1 : 0)
          .input('isLate', sql.Bit, grade.isLate ? 1 : 0)
          .input('lateMinutes', sql.Int, grade.lateMinutes ?? null)
          .query(`
            INSERT INTO dbo.Grades (id, studentId, subjectId, lessonId, grade, isAbsent, isLate, lateMinutes)
            VALUES (@id, @studentId, @subjectId, @lessonId, @grade, @isAbsent, @isLate, @lateMinutes)
          `);
      }

      await tx.commit();
      this.cache = await this.loadStore();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
}

export const dbManager = new DBManager();
