Установка зависимостей: npm install

# Сервер работает в 2х режимах: dev и production
# Запуск dev mode: npm run dev
# Запуск production mode: npm start

Для работы фронтовой части расширения необдимо установить расширение по ссылке https://github.com/eternumart/Chrome-App/raw/dev/App/Chrome-App.exe

Чтобы расширение включало свежий билд необходимо:
* На сервере запустить npm run build. В результате будет создан файл appBuild.js, который используется в расширении.


На доработку:
- UI в админке для редактирования rates / representatives (API готово: `/api/save-rates`, `/api/save-representatives`)