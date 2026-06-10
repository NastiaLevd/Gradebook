# Электронный журнал
## Функциональность

- регистрация и вход пользователей;
- JWT-авторизация;
- роли `student` и `teacher`;
- расписание и предметы;
- read-only журнал для студента;
- редактируемый журнал преподавателя;
- добавление занятий;
- выставление оценок по шкале от 1 до 10;
- отметки отсутствия и опоздания;
- программа предмета: лабораторные, практические, контрольные, дедлайны, материалы и ТЗ;
- флаг командной работы в программе предмета.

## Требования

- Node.js 20 или новее;
- SQL Server Express;
- утилита `sqlcmd`.

## Настройка

Создайте файл `.env` по примеру `.env.example`:

```env
DB_SERVER=.\SQLEXPRESS
DB_DATABASE=Gradebook
DB_TRUSTED_CONNECTION=true
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=gradebook-local-dev-secret
PORT=3000
```

Установите зависимости:

```bash
npm install
```

Создайте базу данных и стартовые записи:

```bash
npm run db:init
```

## Запуск

```bash
npm run dev
```

Откройте:

```text
http://localhost:3000
```

## Стартовые пользователи

| Роль | Логин | Пароль |
| --- | --- | --- |
| Преподаватель | `teacher` | `teacher123` |
| Студент | `student` | `student123` |

## Проверка

```bash
npm run lint
npm run build
```
