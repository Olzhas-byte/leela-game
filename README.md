# Лила — Игра самопознания

Трансформационная веб-игра «Лила» (Leela — Game of Self-Knowledge).
Классическая доска 72 клетки, детерминированная логика в коде, трактовки через GLM 5.2.

## Быстрый старт (локально)

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать и заполнить переменные окружения
cp .env.example .env.local
# → укажи DATABASE_URL, GLM_API_KEY, AUTH_SECRET

# 3. Применить миграции Prisma
npx prisma migrate dev --name init

# 4. Запустить
npm run dev
```

Открыть http://localhost:3000

## Деплой на Railway

1. **Создать сервис** из GitHub-репозитория (Railway → New Project → GitHub).
2. **Добавить Postgres**: Railway Dashboard → Add Plugin → PostgreSQL.
   `DATABASE_URL` подставляется автоматически.
3. **Переменные окружения** в Railway → Variables:
   ```
   GLM_API_KEY=...
   GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
   GLM_MODEL=glm-5.2
   AUTH_SECRET=<openssl rand -base64 32>
   NEXTAUTH_URL=https://<your-app>.up.railway.app
   ```
4. **Миграция БД**: Railway → Service → Run Command:
   ```
   npx prisma migrate deploy
   ```
   Или добавить в `package.json → scripts → build`:
   `"build": "prisma migrate deploy && prisma generate && next build"`

## Структура проекта

```
src/
  game/         # Детерминированное ядро игры (канон доски, правила, движок)
    board.ts    # 72 клетки, змеи, стрелы — единственный источник правды
    config.ts   # Настройки правил (вход по 6, финиш 68, доп. ход)
    rules.ts    # applyRoll() — чистая функция хода
    engine.ts   # Состояние партии, история ходов
  llm/          # LLM-слой (GLM 5.2)
    systemPrompt.ts   # Полный промт ведущего
    buildContext.ts   # Сборка фактов хода для модели
    client.ts         # Клиент GLM + стриминг
  app/          # Next.js App Router
  components/   # UI-компоненты
  lib/          # db.ts (Prisma), auth.ts (NextAuth)
prisma/
  schema.prisma # User, Game, Move + Auth.js таблицы
```

## Переменные окружения

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL строка подключения |
| `GLM_API_KEY` | Ключ Zhipu AI |
| `GLM_BASE_URL` | Базовый URL API (подтвердить у Zhipu) |
| `GLM_MODEL` | ID модели (напр. `glm-5.2`) |
| `AUTH_SECRET` | Случайная строка ≥ 32 байта |
| `NEXTAUTH_URL` | Публичный URL приложения |

## Про канон доски

Доска Хариша Джохари — версия "The Yoga of Snakes and Arrows".
Если есть оригинальная доска из книги, данные менять только в `src/game/board.ts`.
