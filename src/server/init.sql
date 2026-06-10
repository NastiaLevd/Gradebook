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
  email NVARCHAR(100) NOT NULL UNIQUE,
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

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE id = N'teacher_main')
BEGIN
  INSERT INTO dbo.Users (id, username, [name], email, [role], groupName, isNew, isExpelled, [password]) VALUES
  (N'teacher_main', N'teacher', N'Дмитрий Александрович Морозов', N'teacher@university.local', N'teacher', NULL, 0, 0, N'teacher123'),
  (N'student_main', N'student', N'Александр Иванов', N'student@university.local', N'student', N'ИВТ-31', 0, 0, N'student123');

  INSERT INTO dbo.Subjects (id, [name], teacherId) VALUES
  (N'sub_databases', N'Базы данных', N'teacher_main'),
  (N'sub_web', N'Разработка веб-приложений', N'teacher_main');

  INSERT INTO dbo.Lessons (id, subjectId, groupName, teacherId, [date], timeStart, timeEnd, [type]) VALUES
  (N'lesson_db_1', N'sub_databases', N'ИВТ-31', N'teacher_main', '2026-06-01', '10:15:00', '11:45:00', N'lecture'),
  (N'lesson_web_1', N'sub_web', N'ИВТ-31', N'teacher_main', '2026-06-01', '12:00:00', '13:30:00', N'lab'),
  (N'lesson_db_2', N'sub_databases', N'ИВТ-31', N'teacher_main', '2026-06-02', '08:30:00', '10:00:00', N'practice');

  INSERT INTO dbo.Grades (id, studentId, subjectId, lessonId, grade, isAbsent, isLate, lateMinutes) VALUES
  (N'grade_1', N'student_main', N'sub_databases', N'lesson_db_1', 9, 0, 0, NULL),
  (N'grade_2', N'student_main', N'sub_web', N'lesson_web_1', 8, 0, 0, NULL);

  INSERT INTO dbo.SyllabusItems (id, subjectId, [type], title, [description], maxGrade, deadline, materials, tzContent, allowTeams) VALUES
  (N'syl_web_1', N'sub_web', N'lab', N'Лабораторная работа №1: HTML и CSS', N'Сверстать страницу и применить базовые стили.', 10, '2026-05-25', N'HTML5, CSS Grid, Flexbox.', N'1. Использовать семантические теги.
2. Настроить адаптивную сетку.
3. Подготовить архив с исходниками.', 0),
  (N'syl_web_2', N'sub_web', N'lab', N'Лабораторная работа №2: React-клиент', N'Создать интерактивный клиент на React.', 10, '2026-06-10', N'React hooks, TypeScript.', N'1. Компоненты на React.
2. Состояние через hooks.
3. Командная работа до двух человек.', 1),
  (N'syl_db_1', N'sub_databases', N'practice', N'Практика: схема SQL Server', N'Спроектировать таблицы, связи и ограничения.', 10, '2026-06-05', N'Нормализация, ключи, T-SQL DDL.', N'1. Выделить сущности.
2. Описать связи.
3. Подготовить SQL-скрипт.', 0);
END;
GO
