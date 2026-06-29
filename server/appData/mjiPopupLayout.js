import { MJI_POPUP_LOGO_DATA_URL } from "./mjiPopupLogo.js";
import { MJI_POPUP_VERSION } from "./mjiPopupVersion.js";

export function buildMjiPopupLayout(functions) {
  return `
<div class="mji-manager-app">
    <div class="header">
        <div class="header__title-wrapper">
            <img class="header__logo" src="${MJI_POPUP_LOGO_DATA_URL}" alt="ССЭ" width="72" height="28" decoding="async" />
            <div class="header__titles">
                <h1 class="header__title">МЖИ менеджер</h1>
                <span class="header__version">v${MJI_POPUP_VERSION}</span>
            </div>
        </div>
        <div class="header__drag-button" title="Перетащить" aria-label="Перетащить окно">
            <svg width="28" height="8" viewBox="0 0 28 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="4" cy="4" r="1.5" fill="currentColor"/>
                <circle cx="14" cy="4" r="1.5" fill="currentColor"/>
                <circle cx="24" cy="4" r="1.5" fill="currentColor"/>
            </svg>
        </div>
        <div class="header__toolbar">
            ${functions.useAI ? `<div class="header__ai switcher" title="AI: перефразирование при вставке и парсинге PDF"><label class="switch"><input type="checkbox" id="useAI" /><span class="slider"></span></label><span class="header__ai-label">AI</span></div>` : ""}
            <div class="header__buttons">
                <button class="header__button" id="cleanButton" type="button" title="Очистить кэш">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M18.8713 0L14.64 7.16364L11.5096 5.39618L10.186 7.51232L17.5073 11.6484L18.8308 9.52988L15.7535 7.79127L20 0.601178L18.8713 0ZM5.18284 3.99423C4.8392 3.99423 4.50963 4.12395 4.26664 4.35484C4.02364 4.58574 3.88713 4.8989 3.88713 5.22544C3.88713 5.55198 4.02364 5.86514 4.26664 6.09604C4.50963 6.32694 4.8392 6.45666 5.18284 6.45666C5.52649 6.45666 5.85605 6.32694 6.09905 6.09604C6.34204 5.86514 6.47855 5.55198 6.47855 5.22544C6.47855 4.8989 6.34204 4.58574 6.09905 4.35484C5.85605 4.12395 5.52649 3.99423 5.18284 3.99423ZM0.647855 5.22544C0.476033 5.22544 0.311249 5.2903 0.189753 5.40575C0.0682561 5.5212 0 5.67778 0 5.84105C0 6.00432 0.0682561 6.1609 0.189753 6.27635C0.311249 6.3918 0.476033 6.45666 0.647855 6.45666C0.819677 6.45666 0.984461 6.3918 1.10596 6.27635C1.22745 6.1609 1.29571 6.00432 1.29571 5.84105C1.29571 5.67778 1.22745 5.5212 1.10596 5.40575C0.984461 5.2903 0.819677 5.22544 0.647855 5.22544ZM2.59142 7.68787C2.24778 7.68787 1.91821 7.81759 1.67522 8.04848C1.43222 8.27938 1.29571 8.59254 1.29571 8.91908C1.29571 9.24562 1.43222 9.55878 1.67522 9.78968C1.91821 10.0206 2.24778 10.1503 2.59142 10.1503C2.93506 10.1503 3.26463 10.0206 3.50763 9.78968C3.75062 9.55878 3.88713 9.24562 3.88713 8.91908C3.88713 8.59254 3.75062 8.27938 3.50763 8.04848C3.26463 7.81759 2.93506 7.68787 2.59142 7.68787ZM9.06997 8.91908C7.62074 10.845 4.9697 12.3799 0 12.6127V13.8439C2.73876 17.9952 6.47855 20 11.6614 20H12.9571C14.6561 18.0458 16.0118 16.2665 16.8442 13.8439V12.6127L10.3657 8.91908H9.06997ZM9.75579 10.2753L15.3638 13.4736C14.6216 15.3779 13.4565 17.0486 12.0157 18.7303C7.77426 18.7688 3.9555 16.9719 1.71833 13.6347C5.75864 13.2523 8.22221 12.0529 9.75579 10.2753Z" fill="currentColor"/>
                    </svg>
                </button>
                <button class="header__button" id="minimizeButton" type="button" title="Свернуть">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <button class="header__button header__button_close" id="closeButton" type="button" title="Закрыть">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    <div class="account-info">
        <p class="account-info__login">Пользователь: <span>#####</span></p>
    </div>
    <div class="tabs" role="tablist">
        <button class="tabs__button" id="main" type="button" role="tab">Основное</button>
        ${functions.downloadPhotos ? '<button class="tabs__button" id="photo" type="button" role="tab">Фото</button>' : ""}
        ${functions.parser ? '<button class="tabs__button" id="parser" type="button" role="tab">Парсер УК</button>' : ""}
        ${functions.parserPDF ? '<button class="tabs__button" id="parserPDF" type="button" role="tab">Парсер PDF</button>' : ""}
    </div>
    <div class="main">
        <div class="content" id="main">
            ${functions.saveData ? '<button class="main__button" id="copy" type="button">Копирование отчёта</button>' : ""}
            ${functions.clearData ? '<button class="main__button" id="clean" type="button">Очистка отчёта</button>' : ""}
            ${functions.loadData ? '<button class="main__button" id="paste" type="button">Вставка отчёта</button>' : ""}
            ${functions.createFakeSelects ? '<button class="main__button" id="fakeSelects" type="button">Всплывающие поля</button>' : ""}
        </div>
        ${functions.downloadPhotos ? `<div class="content content_deactive" id="photo"><form class="form form_photo" action="submit"><div class="form__field"><span class="form__label">Фото для загрузки</span><label class="file-picker" for="file"><span class="file-picker__icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16V4M12 4L8 8M12 4L16 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="file-picker__body"><span class="file-picker__title">Выберите файлы</span><span class="file-picker__hint" id="filePickerHint">JPG, PNG — можно несколько</span></span></label><input class="form__input form__input_file" type="file" name="file" id="file" multiple accept="image/*" /><div class="file-picker__list" id="filePickerList" hidden></div></div><div class="form__field"><label class="form__label" for="date">Дата загрузки</label><input class="form__input form__input_date" type="date" name="date" id="date" /></div><input class="form__button form__button_submit" type="submit" value="Загрузить" /></form></div>` : ""}
        ${functions.parser ? '<div class="content content_deactive" id="parser"><form class="form form_parser" action="submit"><div class="form__field"><label class="form__label" for="fileInputParser">Выберите CSV файл</label><input class="form__input" type="file" id="fileInputParser" accept=".csv" /></div><button id="processBtnParser" class="form__button">Начать</button><div id="loader" style="display: none"><div id="progressText">Обработано: 0 / 0</div><div style="margin: 10px auto"><div class="loader"></div></div></div></form><script src="libs/mammoth.browser.min.js"></script></div>' : ""}
        ${functions.parserPDF ? '<div class="content content_deactive" id="parserPDF"><form class="form form_parserPDF" action="submit"><div class="form__field"><label class="form__label" for="fileInputParserPDF">Выберите PDF файл</label><input class="form__input" type="file" id="fileInputParserPDF" accept=".pdf" /></div><button id="processBtnParserPDF" class="form__button">Начать</button><div id="loaderPDF" style="display: none"><div id="progressTextPDF">Обработано: 0 / 0</div><div style="margin: 10px auto"><div class="loader"></div></div></div></form></div>' : ""}
    </div>`;
}
