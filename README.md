# My Icons Studio

Веб-инструмент на SvelteKit для ведения личной библиотеки SVG-иконок:
- загрузка SVG через браузер;
- автоматическая генерация Svelte-компонентов;
- просмотр, поиск и удаление иконок;
- one-click публикация изменений в Git (commit + push);
- one-click релиз пакета в GitHub Packages;
- подключение библиотеки в другие Svelte-проекты через GitHub Packages.

## 1. Быстрый старт

```bash
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## 2. Подготовка SVG в Adobe Illustrator

1. Нарисуйте иконку на артборде.
2. Экспортируйте в SVG (`File -> Export -> Export As... -> SVG`).
3. Рекомендуемые параметры:
1. `Styling: Presentation Attributes`
2. `Font: Convert to Outlines`
3. `Responsive: Off` (опционально)
4. Назовите файл осмысленно (например, `arrow-left.svg`) - имя конвертируется в компонент (`ArrowLeft`).

## 3. Работа через веб-интерфейс

### Генерация

1. Выберите SVG-файлы.
2. Выберите режим:
1. `Monochrome (currentColor)`
2. `Original colors`
3. Нажмите `Сгенерировать`.

Автоматически генерируются:
- `src/lib/icons/<IconName>.svelte`
- `src/lib/icons/__raw/<IconName>.svg`
- `src/lib/icons/index.js`

### Управление библиотекой

- Поиск по имени иконки.
- Копирование строки импорта.
- Удаление одной иконки.
- Полная очистка библиотеки.

## 4. One-click Git публикация

В блоке `Публикация в Git`:

1. Нажмите `Обновить`.
2. При необходимости укажите commit message.
3. Оставьте `Сразу делать push` включенным.
4. Нажмите `Опубликовать в Git`.

Публикуются только изменения библиотеки иконок (`src/lib/icons`).

Если upstream ветки не настроен, выполните один раз:

```bash
git push --set-upstream origin <ветка>
```

## 5. One-click релиз в GitHub Packages

В блоке `Релиз в GitHub Packages`:

1. Нажмите `Обновить`.
2. Если нет авторизации, вставьте GitHub token и нажмите `Сохранить токен`.
3. Убедитесь, что появился `GitHub user`.
4. Выберите уровень версии: `patch` / `minor` / `major`.
5. Нажмите `Опубликовать релиз в GitHub Packages`.

Что делает инструмент:
1. Поднимает версию в `package.json` и `package-lock.json`.
2. Собирает проект.
3. Публикует `@offevgeni/icons` в `https://npm.pkg.github.com/`.
4. Создает git commit и tag (`vX.Y.Z`), затем (опционально) делает push.

Требования к GitHub token:
- `read:packages`
- `write:packages`
- для приватных репозиториев может понадобиться `repo`

## 6. Подключение библиотеки в другом проекте (через GitHub)

### Шаг 1. Настройте `.npmrc` в проекте-потребителе

```ini
@offevgeni:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### Шаг 2. Установите пакет

```bash
npm i @offevgeni/icons
```

### Шаг 3. Обновляйте пакет

```bash
npm update @offevgeni/icons
```

### Импорт

```svelte
<script>
  import { ArrowLeft } from '@offevgeni/icons';
</script>

<ArrowLeft size={20} class="text-slate-700" />
```

## 7. Структура

- `src/routes/+page.svelte` - веб-интерфейс управления.
- `src/routes/api/icons/+server.js` - API генерации, удаления и списка.
- `src/routes/api/git/+server.js` - API git-статуса и git-публикации.
- `src/routes/api/release/+server.js` - API релиза в GitHub Packages.
- `src/lib/server/icon-generator.js` - генерация и оптимизация иконок.
- `src/lib/server/git-publisher.js` - безопасная публикация иконок в git.
- `src/lib/server/release-manager.js` - bump версии и публикация в GitHub Packages.

## 8. Важно

- `npm update` подтягивает только новые версии. Если версия не увеличена, обновления не придут.
- Для приватных пакетов у потребителя должен быть доступ к репозиторию/пакету.
