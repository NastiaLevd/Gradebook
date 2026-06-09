# Электронный журнал

## Функциональность

- регистрация и вход пользователей;
- роли `student` и `teacher`;
- JWT для защищенных запросов;
- просмотр расписания;
- просмотр списка предметов;
- кабинет студента с расписанием и журналом;
- кабинет преподавателя с расписанием и закрепленными предметами;
- хранение базовых данных в SQL Server.

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

После запуска откройте:

```text
http://localhost:3000
```

## Стартовые пользователи

| Роль          | Логин     | Пароль       |
| ------------- | --------- | ------------ |
| Преподаватель | `teacher` | `teacher123` |
| Студент       | `student` | `student123` |

## Проверка

```bash
npm run lint
npm run build
```
