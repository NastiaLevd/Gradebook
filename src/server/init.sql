IF DB_ID(N'Gradebook') IS NULL
BEGIN
  CREATE DATABASE Gradebook;
END;
GO

USE Gradebook;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
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
GO

IF OBJECT_ID(N'dbo.Subjects', N'U') IS NULL
CREATE TABLE dbo.Subjects (
  id NVARCHAR(50) NOT NULL PRIMARY KEY,
  [name] NVARCHAR(150) NOT NULL,
  teacherId NVARCHAR(50) NOT NULL,
  CONSTRAINT FK_Subjects_Users FOREIGN KEY (teacherId) REFERENCES dbo.Users(id)
);
GO

IF OBJECT_ID(N'dbo.Lessons', N'U') IS NULL
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
GO

IF OBJECT_ID(N'dbo.Grades', N'U') IS NULL
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
GO

IF OBJECT_ID(N'dbo.SyllabusItems', N'U') IS NULL
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
GO

IF OBJECT_ID(N'dbo.LabSubmissions', N'U') IS NULL
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
GO

IF OBJECT_ID(N'dbo.SubmissionPartners', N'U') IS NULL
CREATE TABLE dbo.SubmissionPartners (
  submissionId NVARCHAR(50) NOT NULL,
  partnerId NVARCHAR(50) NOT NULL,
  CONSTRAINT PK_SubmissionPartners PRIMARY KEY (submissionId, partnerId),
  CONSTRAINT FK_SubmissionPartners_Submissions FOREIGN KEY (submissionId) REFERENCES dbo.LabSubmissions(id) ON DELETE CASCADE,
  CONSTRAINT FK_SubmissionPartners_Users FOREIGN KEY (partnerId) REFERENCES dbo.Users(id)
);
GO

IF OBJECT_ID(N'dbo.FeedbackComments', N'U') IS NULL
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
GO

IF COL_LENGTH(N'dbo.LabSubmissions', N'filePath') IS NULL
ALTER TABLE dbo.LabSubmissions ADD filePath NVARCHAR(500) NULL;
GO

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
GO

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
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE id = N'teacher_main')
BEGIN
  INSERT INTO dbo.Users (id, username, [name], email, [role], groupName, isNew, isExpelled, [password]) VALUES
  (N'teacher_main', N'teacher', N'Дмитрий Александрович Морозов', N'teacher@university.local', N'teacher', NULL, 0, 0, N'teacher123'),
  (N'student_main', N'student', N'Александр Иванов', N'student@university.local', N'student', N'ИВТ-31', 0, 0, N'student123');

  INSERT INTO dbo.Subjects (id, [name], teacherId) VALUES
  (N'sub_databases', N'Базы данных', N'teacher_main'),
  (N'sub_web', N'Разработка веб-приложений', N'teacher_main');

  INSERT INTO dbo.SyllabusItems (id, subjectId, [type], title, [description], maxGrade, deadline, materials, tzContent, allowTeams) VALUES
  (N'syl_web_1', N'sub_web', N'lab', N'Лабораторная работа №1: HTML и CSS', N'Сверстать семантическую страницу и применить базовые стили.', 10, '2026-05-25', N'HTML5, CSS Grid, Flexbox.', N'1. Использовать семантические теги.
2. Настроить адаптивную сетку.
3. Сдать архив с исходниками.', 0),
  (N'syl_web_2', N'sub_web', N'lab', N'Лабораторная работа №2: React-клиент', N'Создать интерактивный клиент на React с несколькими экранами.', 10, '2026-06-10', N'React hooks, TypeScript, работа с формами.', N'1. Компоненты на React и TypeScript.
2. Состояние через hooks.
3. Командная работа до двух человек.', 1),
  (N'syl_db_1', N'sub_databases', N'lab', N'Лабораторная работа №1: схема SQL Server', N'Спроектировать таблицы, связи и ограничения для учебной базы данных.', 10, '2026-06-05', N'Нормализация, первичные и внешние ключи, T-SQL DDL.', N'1. Выделить сущности.
2. Описать связи.
3. Подготовить SQL-скрипт создания схемы.', 0);

  INSERT INTO dbo.Lessons (id, subjectId, groupName, teacherId, [date], timeStart, timeEnd, [type]) VALUES
  (N'lesson_db_1', N'sub_databases', N'ИВТ-31', N'teacher_main', '2026-06-01', '10:15:00', '11:45:00', N'lecture'),
  (N'lesson_web_1', N'sub_web', N'ИВТ-31', N'teacher_main', '2026-06-01', '12:00:00', '13:30:00', N'lab'),
  (N'lesson_db_2', N'sub_databases', N'ИВТ-31', N'teacher_main', '2026-06-02', '08:30:00', '10:00:00', N'practice'),
  (N'lesson_web_2', N'sub_web', N'ИВТ-31', N'teacher_main', '2026-06-03', '10:15:00', '11:45:00', N'lab');

  INSERT INTO dbo.Grades (id, studentId, subjectId, lessonId, grade, isAbsent, isLate, lateMinutes) VALUES
  (N'grade_1', N'student_main', N'sub_databases', N'lesson_db_1', 9, 0, 0, NULL),
  (N'grade_2', N'student_main', N'sub_web', N'lesson_web_1', 8, 0, 0, NULL),
  (N'grade_3', N'student_main', N'sub_databases', N'lesson_db_2', NULL, 0, 1, 10);
END;
GO

UPDATE dbo.SyllabusItems SET maxGrade = 10 WHERE maxGrade = 5;
GO
