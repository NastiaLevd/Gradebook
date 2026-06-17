import dotenv from 'dotenv';
import sql from 'mssql/msnodesqlv8';
import { FeedbackComment, Grade, LabSubmission, Lesson, Subject, SyllabusItem, User } from '../types.js';

dotenv.config({ quiet: true });

export interface DBStore {
  users: User[];
  subjects: Subject[];
  lessons: Lesson[];
  grades: Grade[];
  syllabusItems: SyllabusItem[];
  submissions: LabSubmission[];
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
    { id: 'lesson_db_2', subjectId: 'sub_databases', subjectName: 'Базы данных', groupName: 'ИВТ-31', teacherId: 'teacher_main', date: '2026-06-02', timeStart: '08:30', timeEnd: '10:00', type: 'practice' },
    { id: 'lesson_web_2', subjectId: 'sub_web', subjectName: 'Разработка веб-приложений', groupName: 'ИВТ-31', teacherId: 'teacher_main', date: '2026-06-03', timeStart: '10:15', timeEnd: '11:45', type: 'lab' }
  ],
  grades: [
    { id: 'grade_1', studentId: 'student_main', subjectId: 'sub_databases', lessonId: 'lesson_db_1', grade: 9 },
    { id: 'grade_2', studentId: 'student_main', subjectId: 'sub_web', lessonId: 'lesson_web_1', grade: 8 },
    { id: 'grade_3', studentId: 'student_main', subjectId: 'sub_databases', lessonId: 'lesson_db_2', isLate: true, lateMinutes: 10 }
  ],
  syllabusItems: [
    {
      id: 'syl_web_1',
      subjectId: 'sub_web',
      type: 'lab',
      title: 'Лабораторная работа №1: HTML и CSS',
      description: 'Сверстать семантическую страницу и применить базовые стили.',
      maxGrade: 10,
      deadline: '2026-05-25',
      materials: 'HTML5, CSS Grid, Flexbox.',
      tzContent: '1. Использовать семантические теги.\n2. Настроить адаптивную сетку.\n3. Сдать архив с исходниками.',
      allowTeams: false
    },
    {
      id: 'syl_web_2',
      subjectId: 'sub_web',
      type: 'lab',
      title: 'Лабораторная работа №2: React-клиент',
      description: 'Создать интерактивный клиент на React с несколькими экранами.',
      maxGrade: 10,
      deadline: '2026-06-10',
      materials: 'React hooks, TypeScript, работа с формами.',
      tzContent: '1. Компоненты на React и TypeScript.\n2. Состояние через hooks.\n3. Командная работа до двух человек.',
      allowTeams: true
    },
    {
      id: 'syl_db_1',
      subjectId: 'sub_databases',
      type: 'lab',
      title: 'Лабораторная работа №1: схема SQL Server',
      description: 'Спроектировать таблицы, связи и ограничения для учебной базы данных.',
      maxGrade: 10,
      deadline: '2026-06-05',
      materials: 'Нормализация, первичные и внешние ключи, T-SQL DDL.',
      tzContent: '1. Выделить сущности.\n2. Описать связи.\n3. Подготовить SQL-скрипт создания схемы.',
      allowTeams: false
    }
  ],
  submissions: []
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

  if (process.env.DB_PORT) {
    config.port = Number(process.env.DB_PORT);
  }

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

  const text = String(value);
  const [hours = '00', minutes = '00'] = text.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function validateDatabaseName(name: string): void {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error('DB_DATABASE может содержать только латинские буквы, цифры и подчёркивание');
  }
}

class DBManager {
  private pool: sql.ConnectionPool | null = null;
  private cache: DBStore | null = null;

  private async connect(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) return this.pool;

    validateDatabaseName(databaseName);
    await this.createDatabase();
    this.pool = await new sql.ConnectionPool(createConfig(databaseName)).connect();
    await this.ensureSchema();
    await this.seedIfEmpty();
    return this.pool;
  }

  private async createDatabase(): Promise<void> {
    const masterPool = await new sql.ConnectionPool(createConfig('master')).connect();
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
        email NVARCHAR(100) NOT NULL,
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

      IF OBJECT_ID('dbo.LabSubmissions', 'U') IS NULL
      CREATE TABLE dbo.LabSubmissions (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        studentId NVARCHAR(50) NOT NULL,
        studentName NVARCHAR(150) NOT NULL,
        groupName NVARCHAR(50) NOT NULL,
        syllabusItemId NVARCHAR(50) NOT NULL,
        syllabusItemTitle NVARCHAR(200) NOT NULL,
        subjectId NVARCHAR(50) NOT NULL,
        filePath NVARCHAR(500) NULL,
        fileName NVARCHAR(250) NULL,
        submittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [status] NVARCHAR(20) NOT NULL CHECK ([status] IN ('pending', 'checked')),
        grade INT NULL CHECK (grade BETWEEN 1 AND 10),
        comment NVARCHAR(MAX) NULL,
        CONSTRAINT FK_LabSubmissions_Users FOREIGN KEY (studentId) REFERENCES dbo.Users(id),
        CONSTRAINT FK_LabSubmissions_Syllabus FOREIGN KEY (syllabusItemId) REFERENCES dbo.SyllabusItems(id) ON DELETE CASCADE,
        CONSTRAINT FK_LabSubmissions_Subjects FOREIGN KEY (subjectId) REFERENCES dbo.Subjects(id)
      );

      IF OBJECT_ID('dbo.SubmissionPartners', 'U') IS NULL
      CREATE TABLE dbo.SubmissionPartners (
        submissionId NVARCHAR(50) NOT NULL,
        partnerId NVARCHAR(50) NOT NULL,
        CONSTRAINT PK_SubmissionPartners PRIMARY KEY (submissionId, partnerId),
        CONSTRAINT FK_SubmissionPartners_Submissions FOREIGN KEY (submissionId) REFERENCES dbo.LabSubmissions(id) ON DELETE CASCADE,
        CONSTRAINT FK_SubmissionPartners_Users FOREIGN KEY (partnerId) REFERENCES dbo.Users(id)
      );

      IF OBJECT_ID('dbo.FeedbackComments', 'U') IS NULL
      CREATE TABLE dbo.FeedbackComments (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        submissionId NVARCHAR(50) NOT NULL,
        authorId NVARCHAR(50) NOT NULL,
        authorName NVARCHAR(150) NOT NULL,
        authorRole NVARCHAR(20) NOT NULL CHECK (authorRole IN ('student', 'teacher')),
        [text] NVARCHAR(MAX) NOT NULL,
        createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_FeedbackComments_Submissions FOREIGN KEY (submissionId) REFERENCES dbo.LabSubmissions(id) ON DELETE CASCADE,
        CONSTRAINT FK_FeedbackComments_Users FOREIGN KEY (authorId) REFERENCES dbo.Users(id)
      );

      IF OBJECT_ID('dbo.LabSubmissions', 'U') IS NOT NULL
      AND COL_LENGTH('dbo.LabSubmissions', 'filePath') IS NULL
      ALTER TABLE dbo.LabSubmissions ADD filePath NVARCHAR(500) NULL;

      DECLARE @gradeConstraintName NVARCHAR(128);

      SELECT @gradeConstraintName = cc.name
      FROM sys.check_constraints cc
      WHERE cc.parent_object_id = OBJECT_ID(N'dbo.Grades')
        AND cc.definition LIKE N'%grade%';

      IF @gradeConstraintName IS NOT NULL
      BEGIN
        DECLARE @dropGradeSql NVARCHAR(MAX) = N'ALTER TABLE dbo.Grades DROP CONSTRAINT ' + QUOTENAME(@gradeConstraintName);
        EXEC(@dropGradeSql);
      END;

      ALTER TABLE dbo.Grades WITH CHECK ADD CONSTRAINT CK_Grades_Grade_1_10 CHECK (grade BETWEEN 1 AND 10);

      DECLARE @submissionGradeConstraintName NVARCHAR(128);

      SELECT @submissionGradeConstraintName = cc.name
      FROM sys.check_constraints cc
      WHERE cc.parent_object_id = OBJECT_ID(N'dbo.LabSubmissions')
        AND cc.definition LIKE N'%grade%';

      IF @submissionGradeConstraintName IS NOT NULL
      BEGIN
        DECLARE @dropSubmissionGradeSql NVARCHAR(MAX) = N'ALTER TABLE dbo.LabSubmissions DROP CONSTRAINT ' + QUOTENAME(@submissionGradeConstraintName);
        EXEC(@dropSubmissionGradeSql);
      END;

      ALTER TABLE dbo.LabSubmissions WITH CHECK ADD CONSTRAINT CK_LabSubmissions_Grade_1_10 CHECK (grade BETWEEN 1 AND 10);

      UPDATE dbo.SyllabusItems SET maxGrade = 10 WHERE maxGrade = 5;
    `);
  }

  private async seedIfEmpty(): Promise<void> {
    if (!this.pool) return;

    const result = await this.pool.request().query('SELECT COUNT(1) AS count FROM dbo.Users');
    if (result.recordset[0]?.count === 0) {
      await this.writeStore(initialStore);
    }
  }

  private async writeStore(store: DBStore): Promise<void> {
    if (!this.pool) return;

    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();

    try {
      const run = () => new sql.Request(transaction);

      await run().query(`
        DELETE FROM dbo.FeedbackComments;
        DELETE FROM dbo.SubmissionPartners;
        DELETE FROM dbo.LabSubmissions;
        DELETE FROM dbo.Grades;
        DELETE FROM dbo.Lessons;
        DELETE FROM dbo.SyllabusItems;
        DELETE FROM dbo.Subjects;
        DELETE FROM dbo.Users;
      `);

      for (const user of store.users) {
        await run()
          .input('id', sql.NVarChar, user.id)
          .input('username', sql.NVarChar, user.username)
          .input('name', sql.NVarChar, user.name)
          .input('email', sql.NVarChar, user.email)
          .input('role', sql.NVarChar, user.role)
          .input('groupName', sql.NVarChar, user.groupName ?? null)
          .input('isNew', sql.Bit, user.isNew ? 1 : 0)
          .input('isExpelled', sql.Bit, user.isExpelled ? 1 : 0)
          .input('password', sql.NVarChar, user.password ?? '123456')
          .query(`
            INSERT INTO dbo.Users (id, username, [name], email, [role], groupName, isNew, isExpelled, [password])
            VALUES (@id, @username, @name, @email, @role, @groupName, @isNew, @isExpelled, @password)
          `);
      }

      for (const subject of store.subjects) {
        await run()
          .input('id', sql.NVarChar, subject.id)
          .input('name', sql.NVarChar, subject.name)
          .input('teacherId', sql.NVarChar, subject.teacherId)
          .query('INSERT INTO dbo.Subjects (id, [name], teacherId) VALUES (@id, @name, @teacherId)');
      }

      for (const item of store.syllabusItems) {
        await run()
          .input('id', sql.NVarChar, item.id)
          .input('subjectId', sql.NVarChar, item.subjectId)
          .input('type', sql.NVarChar, item.type)
          .input('title', sql.NVarChar, item.title)
          .input('description', sql.NVarChar, item.description ?? '')
          .input('maxGrade', sql.Int, item.maxGrade)
          .input('deadline', sql.Date, item.deadline ? new Date(item.deadline) : null)
          .input('materials', sql.NVarChar, item.materials ?? null)
          .input('tzContent', sql.NVarChar, item.tzContent ?? null)
          .input('allowTeams', sql.Bit, item.allowTeams ? 1 : 0)
          .query(`
            INSERT INTO dbo.SyllabusItems (id, subjectId, [type], title, [description], maxGrade, deadline, materials, tzContent, allowTeams)
            VALUES (@id, @subjectId, @type, @title, @description, @maxGrade, @deadline, @materials, @tzContent, @allowTeams)
          `);
      }

      for (const lesson of store.lessons) {
        await run()
          .input('id', sql.NVarChar, lesson.id)
          .input('subjectId', sql.NVarChar, lesson.subjectId)
          .input('groupName', sql.NVarChar, lesson.groupName)
          .input('teacherId', sql.NVarChar, lesson.teacherId)
          .input('date', sql.Date, new Date(lesson.date))
          .input('timeStart', sql.VarChar, `${lesson.timeStart}:00`)
          .input('timeEnd', sql.VarChar, `${lesson.timeEnd}:00`)
          .input('type', sql.NVarChar, lesson.type)
          .query(`
            INSERT INTO dbo.Lessons (id, subjectId, groupName, teacherId, [date], timeStart, timeEnd, [type])
            VALUES (@id, @subjectId, @groupName, @teacherId, @date, @timeStart, @timeEnd, @type)
          `);
      }

      for (const grade of store.grades) {
        await run()
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

      for (const submission of store.submissions) {
        await run()
          .input('id', sql.NVarChar, submission.id)
          .input('studentId', sql.NVarChar, submission.studentId)
          .input('studentName', sql.NVarChar, submission.studentName)
          .input('groupName', sql.NVarChar, submission.groupName)
          .input('syllabusItemId', sql.NVarChar, submission.syllabusItemId)
          .input('syllabusItemTitle', sql.NVarChar, submission.syllabusItemTitle)
          .input('subjectId', sql.NVarChar, submission.subjectId)
          .input('filePath', sql.NVarChar, submission.filePath ?? null)
          .input('fileName', sql.NVarChar, submission.fileName ?? null)
          .input('submittedAt', sql.DateTime2, new Date(submission.submittedAt))
          .input('status', sql.NVarChar, submission.status)
          .input('grade', sql.Int, submission.grade ?? null)
          .input('comment', sql.NVarChar, submission.comment ?? null)
          .query(`
            INSERT INTO dbo.LabSubmissions (id, studentId, studentName, groupName, syllabusItemId, syllabusItemTitle, subjectId, filePath, fileName, submittedAt, [status], grade, comment)
            VALUES (@id, @studentId, @studentName, @groupName, @syllabusItemId, @syllabusItemTitle, @subjectId, @filePath, @fileName, @submittedAt, @status, @grade, @comment)
          `);

        for (const partnerId of submission.partnerIds ?? []) {
          await run()
            .input('submissionId', sql.NVarChar, submission.id)
            .input('partnerId', sql.NVarChar, partnerId)
            .query('INSERT INTO dbo.SubmissionPartners (submissionId, partnerId) VALUES (@submissionId, @partnerId)');
        }

        for (const comment of submission.comments ?? []) {
          await run()
            .input('id', sql.NVarChar, comment.id)
            .input('submissionId', sql.NVarChar, submission.id)
            .input('authorId', sql.NVarChar, comment.authorId)
            .input('authorName', sql.NVarChar, comment.authorName)
            .input('authorRole', sql.NVarChar, comment.authorRole)
            .input('text', sql.NVarChar, comment.text)
            .input('createdAt', sql.DateTime2, new Date(comment.createdAt))
            .query(`
              INSERT INTO dbo.FeedbackComments (id, submissionId, authorId, authorName, authorRole, [text], createdAt)
              VALUES (@id, @submissionId, @authorId, @authorName, @authorRole, @text, @createdAt)
            `);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async loadStore(): Promise<DBStore> {
    const pool = await this.connect();

    const [usersRes, subjectsRes, lessonsRes, gradesRes, syllabusRes, submissionsRes, partnersRes, commentsRes] = await Promise.all([
      pool.request().query('SELECT * FROM dbo.Users ORDER BY [role], groupName, [name]'),
      pool.request().query(`
        SELECT S.*, U.[name] AS teacherName
        FROM dbo.Subjects S
        INNER JOIN dbo.Users U ON U.id = S.teacherId
        ORDER BY S.[name]
      `),
      pool.request().query(`
        SELECT L.*, S.[name] AS subjectName
        FROM dbo.Lessons L
        INNER JOIN dbo.Subjects S ON S.id = L.subjectId
        ORDER BY L.[date], L.timeStart
      `),
      pool.request().query('SELECT * FROM dbo.Grades'),
      pool.request().query('SELECT * FROM dbo.SyllabusItems ORDER BY subjectId, deadline, title'),
      pool.request().query('SELECT * FROM dbo.LabSubmissions ORDER BY submittedAt DESC'),
      pool.request().query(`
        SELECT SP.submissionId, SP.partnerId, U.[name] AS partnerName
        FROM dbo.SubmissionPartners SP
        INNER JOIN dbo.Users U ON U.id = SP.partnerId
      `),
      pool.request().query('SELECT * FROM dbo.FeedbackComments ORDER BY createdAt')
    ]);

    const partnersBySubmission = new Map<string, { ids: string[]; names: string[] }>();
    for (const row of partnersRes.recordset) {
      const entry = partnersBySubmission.get(row.submissionId) ?? { ids: [], names: [] };
      entry.ids.push(row.partnerId);
      entry.names.push(row.partnerName);
      partnersBySubmission.set(row.submissionId, entry);
    }

    const commentsBySubmission = new Map<string, FeedbackComment[]>();
    for (const row of commentsRes.recordset) {
      const list = commentsBySubmission.get(row.submissionId) ?? [];
      list.push({
        id: row.id,
        authorId: row.authorId,
        authorName: row.authorName,
        authorRole: row.authorRole,
        text: row.text,
        createdAt: new Date(row.createdAt).toISOString()
      });
      commentsBySubmission.set(row.submissionId, list);
    }

    const users: User[] = usersRes.recordset.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      role: row.role,
      groupName: row.groupName ?? undefined,
      isNew: Boolean(row.isNew),
      isExpelled: Boolean(row.isExpelled),
      password: row.password
    }));

    const subjects: Subject[] = subjectsRes.recordset.map(row => ({
      id: row.id,
      name: row.name,
      teacherId: row.teacherId,
      teacherName: row.teacherName
    }));

    const lessons: Lesson[] = lessonsRes.recordset.map(row => ({
      id: row.id,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      groupName: row.groupName,
      teacherId: row.teacherId,
      date: toDateString(row.date),
      timeStart: toTimeString(row.timeStart),
      timeEnd: toTimeString(row.timeEnd),
      type: row.type
    }));

    const grades: Grade[] = gradesRes.recordset.map(row => ({
      id: row.id,
      studentId: row.studentId,
      subjectId: row.subjectId,
      lessonId: row.lessonId,
      grade: row.grade ?? undefined,
      isAbsent: Boolean(row.isAbsent),
      isLate: Boolean(row.isLate),
      lateMinutes: row.lateMinutes ?? undefined
    }));

    const syllabusItems: SyllabusItem[] = syllabusRes.recordset.map(row => ({
      id: row.id,
      subjectId: row.subjectId,
      type: row.type,
      title: row.title,
      description: row.description ?? '',
      maxGrade: row.maxGrade,
      deadline: row.deadline ? toDateString(row.deadline) : undefined,
      materials: row.materials ?? undefined,
      tzContent: row.tzContent ?? undefined,
      allowTeams: Boolean(row.allowTeams)
    }));

    const submissions: LabSubmission[] = submissionsRes.recordset.map(row => {
      const partners = partnersBySubmission.get(row.id);
      return {
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        groupName: row.groupName,
        syllabusItemId: row.syllabusItemId,
        syllabusItemTitle: row.syllabusItemTitle,
        subjectId: row.subjectId,
        filePath: row.filePath ?? undefined,
        fileName: row.fileName ?? undefined,
        submittedAt: new Date(row.submittedAt).toISOString(),
        status: row.status,
        grade: row.grade ?? undefined,
        comment: row.comment ?? undefined,
        partnerIds: partners?.ids,
        partnerNames: partners?.names,
        comments: commentsBySubmission.get(row.id) ?? []
      };
    });

    return { users, subjects, lessons, grades, syllabusItems, submissions };
  }

  public async getStore(): Promise<DBStore> {
    this.cache = await this.loadStore();
    return cloneStore(this.cache);
  }

  public async saveStore(store: DBStore): Promise<void> {
    await this.connect();
    await this.writeStore(store);
    this.cache = await this.loadStore();
  }
}

export const dbManager = new DBManager();
