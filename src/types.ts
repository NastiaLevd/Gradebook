export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  groupName?: string;
  isNew?: boolean;
  isExpelled?: boolean;
  password?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  subjectName: string;
  groupName: string;
  teacherId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  type: 'lecture' | 'lab' | 'practice' | 'test' | 'oral';
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  lessonId: string;
  grade?: number;
  isAbsent?: boolean;
  isLate?: boolean;
  lateMinutes?: number;
}

export interface SyllabusItem {
  id: string;
  subjectId: string;
  type: 'lab' | 'lecture' | 'practice' | 'test';
  title: string;
  description: string;
  maxGrade: number;
  deadline?: string;
  materials?: string;
  tzContent?: string;
  allowTeams?: boolean;
}
