export const mjiPopupLayout = (functions: Record<string, boolean>) => `
<div class="mji-manager-app">
    <div class="header">
        <div class="header__title-wrapper">
            <div class="header__logo">
                <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M13.8099 0H23.3333V20H13.8099L22.747 11.0196C23.3052 10.4587 23.3052 9.54127 22.747 8.98039L13.8099 0ZM0 0H9.52339L0.586308 8.98039C0.0281374 9.54127 0.0281374 10.4587 0.586308 11.0196L9.52339 20H0V0Z"fill="#1F5473"
                    />
                    <path
                        d="M8.07028 6.50342H10.1732C9.79199 6.73415 9.58506 7.10533 9.44982 7.53032H8.07028C7.87424 7.53032 7.69635 7.61149 7.56657 7.74191C7.43678 7.87232 7.356 8.05198 7.356 8.24806V11.8422C7.356 12.0392 7.43678 12.218 7.56657 12.3484C7.69635 12.4788 7.87515 12.56 8.07028 12.56H9.44982C9.58415 12.985 9.79199 13.3561 10.1732 13.5869H8.07028C7.59198 13.5869 7.15815 13.3908 6.84412 13.0752C6.53009 12.7597 6.33496 12.3228 6.33496 11.8431V8.24897C6.33496 7.76835 6.53009 7.33242 6.84412 7.01687C7.15815 6.6995 7.59289 6.50342 8.07028 6.50342Z" fill="#1A1A18"
                    />
                    <path
                        d="M11.7424 6.50342H13.8453C13.4641 6.73415 13.2572 7.10533 13.1219 7.53032H11.7424C11.5464 7.53032 11.3685 7.61149 11.2387 7.74191C11.1089 7.87232 11.0281 8.05198 11.0281 8.24806V11.8422C11.0281 12.0392 11.1089 12.218 11.2387 12.3484C11.3685 12.4788 11.5473 12.56 11.7424 12.56H13.1219C13.2563 12.985 13.4641 13.3561 13.8453 13.5869H11.7424C11.2641 13.5869 10.8303 13.3908 10.5162 13.0752C10.2022 12.7597 10.0071 12.3228 10.0071 11.8431V8.24897C10.0071 7.76835 10.2022 7.33242 10.5162 7.01687C10.8303 6.6995 11.265 6.50342 11.7424 6.50342Z" fill="#E2000F"
                    />
                    <path
                        d="M15.0616 6.50342H14.458C14.3337 6.58367 14.2184 6.68035 14.1168 6.7907C13.9262 6.9959 13.7801 7.24852 13.6938 7.53032H15.0616C15.2576 7.53032 15.4355 7.61149 15.5653 7.74191C15.6951 7.87232 15.7759 8.05198 15.7759 8.24806V9.29594H14.3237V10.2371H15.7759V11.8422C15.7759 12.0392 15.6951 12.218 15.5653 12.3484C15.4355 12.4788 15.2576 12.56 15.0616 12.56H13.6938C13.7801 12.8418 13.9262 13.0944 14.1168 13.2996C14.2184 13.4099 14.3337 13.5066 14.458 13.5869H15.0616C15.5399 13.5869 15.9737 13.3908 16.2878 13.0752C16.6018 12.7597 16.7969 12.3228 16.7969 11.8431V8.24897C16.7969 7.76835 16.6018 7.33242 16.2878 7.01687C15.9737 6.6995 15.5399 6.50342 15.0616 6.50342Z"
                        fill="#1A1A18"
                    />
                </svg>
            </div>
            <h1 class="header__title">МЖИ менеджер v3.2.0</h1>
        </div>
        <div class="header__drag-button">
            <svg width="20" height="6" viewBox="0 0 20 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line y1="3.5" x2="20" y2="3.5" stroke="#787878" />
                <line x1="20" y1="0.5" x2="4.37114e-08" y2="0.500002" stroke="#787878" />
            </svg>
        </div>
        <div class="header__buttons">
            <button class="header__button" id="cleanButton">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M18.8713 0L14.64 7.16364L11.5096 5.39618L10.186 7.51232L17.5073 11.6484L18.8308 9.52988L15.7535 7.79127L20 0.601178L18.8713 0ZM5.18284 3.99423C4.8392 3.99423 4.50963 4.12395 4.26664 4.35484C4.02364 4.58574 3.88713 4.8989 3.88713 5.22544C3.88713 5.55198 4.02364 5.86514 4.26664 6.09604C4.50963 6.32694 4.8392 6.45666 5.18284 6.45666C5.52649 6.45666 5.85605 6.32694 6.09905 6.09604C6.34204 5.86514 6.47855 5.55198 6.47855 5.22544C6.47855 4.8989 6.34204 4.58574 6.09905 4.35484C5.85605 4.12395 5.52649 3.99423 5.18284 3.99423ZM0.647855 5.22544C0.476033 5.22544 0.311249 5.2903 0.189753 5.40575C0.0682561 5.5212 0 5.67778 0 5.84105C0 6.00432 0.0682561 6.1609 0.189753 6.27635C0.311249 6.3918 0.476033 6.45666 0.647855 6.45666C0.819677 6.45666 0.984461 6.3918 1.10596 6.27635C1.22745 6.1609 1.29571 6.00432 1.29571 5.84105C1.29571 5.67778 1.22745 5.5212 1.10596 5.40575C0.984461 5.2903 0.819677 5.22544 0.647855 5.22544ZM2.59142 7.68787C2.24778 7.68787 1.91821 7.81759 1.67522 8.04848C1.43222 8.27938 1.29571 8.59254 1.29571 8.91908C1.29571 9.24562 1.43222 9.55878 1.67522 9.78968C1.91821 10.0206 2.24778 10.1503 2.59142 10.1503C2.93506 10.1503 3.26463 10.0206 3.50763 9.78968C3.75062 9.55878 3.88713 9.24562 3.88713 8.91908C3.88713 8.59254 3.75062 8.27938 3.50763 8.04848C3.26463 7.81759 2.93506 7.68787 2.59142 7.68787ZM9.06997 8.91908C7.62074 10.845 4.9697 12.3799 0 12.6127V13.8439C2.73876 17.9952 6.47855 20 11.6614 20H12.9571C14.6561 18.0458 16.0118 16.2665 16.8442 13.8439V12.6127L10.3657 8.91908H9.06997ZM9.75579 10.2753L15.3638 13.4736C14.6216 15.3779 13.4565 17.0486 12.0157 18.7303C7.77426 18.7688 3.9555 16.9719 1.71833 13.6347C5.75864 13.2523 8.22221 12.0529 9.75579 10.2753Z" fill="#787878"
                    />
                </svg>
            </button>
            <button class="header__button" id="minimizeButton"><svg width="20" height="2" viewBox="0 0 20 2" fill="none" xmlns="http://www.w3.org/2000/svg"><line y1="1" x2="20" y2="1" stroke="#787878" stroke-width="2" /></svg></button>
            <button class="header__button" id="closeButton"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 1.32086L18.6792 0.00012207L10 8.67927L1.32085 0.00012207L0 1.32086L8.67921 10.0001L0 18.6793L1.32085 20L10 11.3209L18.6792 20L20 18.6793L11.3208 10.0001L20 1.32086Z" fill="#787878" /></svg></button>
        </div>
    </div>
    <div class="account-info">
        <p class="account-info__login">Пользователь: <span>#####</span></p>
        ${functions.useAI ? '<div class="switcher"><label class="switcher__label switch"><input type="checkbox" id="useAI" class="switcher__input"/><span class="slider"></span></label><span class="switcher__text">AI обработка</span></div>' : ""}
    </div>
    <div class="tabs">
        <button class="tabs__button" id="main">Основное</button>
        ${functions.downloadPhotos ? '<button class="tabs__button" id="photo">Фото</button>' : ""}
        ${functions.parser ? '<button class="tabs__button" id="parser">Парсер УК</button>' : ""}
        ${functions.parserPDF ? '<button class="tabs__button" id="parserPDF">Парсер PDF</button>' : ""}
    </div>
    <div class="main">
        <div class="content" id="main">
            ${functions.saveData ? '<button class="main__button" id="copy">Копирование отчета</button>' : ""}
            ${functions.clearData ? '<button class="main__button" id="clean">Очистка отчета</button>' : ""}
            ${functions.loadData ? '<button class="main__button" id="paste">Вставка отчета</button>' : ""}
            ${functions.createFakeSelects ? '<button class="main__button" id="fakeSelects">Всплывающие поля</button>' : ""}
        </div>
        ${functions.downloadPhotos ? '<div class="content content_deactive" id="photo"><form class="form" action="submit"><div class="form__field"><label class="form__label" for="file">Выбрать фото для загрузки</label><input class="form__input" type="file" name="file" id="file" multiple /></div><div class="form__field"><label class="form__label" for="date">Выбор даты загрузки фото</label><input class="form__input" type="date" name="date" id="date" /></div><input class="form__button" type="submit" value="Загрузить" /></form></div>' : ""}
        ${functions.parser ? '<div class="content content_deactive" id="parser"><form class="form form_parser" action="submit"><div class="form__field"><label class="form__label" for="file">Выберите CSV файл</label><input class="form__input" type="file" id="fileInputParser" accept=".csv" /></div><button id="processBtnParser" class="form__button">Начать</button><div id="loader" class="form__loader"><div id="progressText" class="form__loader-text">Обработано: 0 / 0</div><div class="form__loader-inner"><div class="loader loader_spinner"></div></div></div></form><script src="libs/mammoth.browser.min.js"></script></div>' : ""}
        ${functions.parserPDF ? '<div class="content content_deactive" id="parserPDF"><form class="form form_parserPDF" action="submit"><div class="form__field"><label class="form__label" for="file">Выберите PDF файл</label><input class="form__input" type="file" id="fileInputParserPDF" accept=".pdf" /></div><button id="processBtnParserPDF" class="form__button">Начать</button><div id="loaderPDF" class="form__loader"><div id="progressTextPDF" class="form__loader-text">Обработано: 0 / 0</div><div class="form__loader-inner"><div class="loader loader_spinner"></div></div></div></form></div>' : ""}
    </div>`;
