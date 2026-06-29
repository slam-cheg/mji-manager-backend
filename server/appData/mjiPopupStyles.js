export const mjiPopupStyles = `<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");

.mji-manager-app {
  --mji-primary: #1f2022;
  --mji-primary-hover: #3d3f45;
  --mji-text: #24262b;
  --mji-text-muted: rgba(36, 38, 43, 0.64);
  --mji-border: #e1e1e1;
  --mji-surface: #ffffff;
  --mji-surface-muted: rgba(24, 28, 33, 0.06);
  --mji-surface-hover: rgba(24, 28, 33, 0.1);
  --mji-success: #2e8b2e;
  --mji-error: #c62828;
  --mji-radius: 12px;
  --mji-radius-sm: 8px;
  --mji-shadow: 0 8px 32px rgba(21, 32, 47, 0.16), 0 2px 8px rgba(21, 32, 47, 0.08);
}

.inputErrorValidity {
  border: 2px solid var(--mji-error) !important;
  border-radius: var(--mji-radius-sm) !important;
}

.mji-manager-app * {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.mji-manager-app {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  z-index: 2147483646;
  background: var(--mji-surface);
  color: var(--mji-text);
  position: fixed;
  width: 420px;
  top: 50px;
  right: 20px;
  border-radius: var(--mji-radius);
  box-shadow: var(--mji-shadow);
  border: 1px solid var(--mji-border);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

.header {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 12px 10px;
  background: var(--mji-surface);
  border-bottom: 1px solid var(--mji-border);
}

.header__title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.header__logo {
  display: block;
  width: auto;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.header__titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.header__title {
  color: var(--mji-text);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header__version {
  color: var(--mji-text-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

.header__drag-button {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(36, 38, 43, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  padding: 2px 8px;
  border-radius: 999px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.header__drag-button:hover {
  color: var(--mji-text-muted);
  background: var(--mji-surface-muted);
}

.header__toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.header__buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header__button {
  outline: none;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--mji-radius-sm);
  color: var(--mji-text-muted);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.header__button:hover {
  background: var(--mji-surface-hover);
  color: var(--mji-text);
}

.header__button_close:hover {
  background: rgba(198, 40, 40, 0.1);
  color: var(--mji-error);
}

.header__ai.switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mji-text-muted);
  padding: 4px 8px 4px 6px;
  border-radius: 999px;
  background: var(--mji-surface-muted);
}

.header__ai-label {
  white-space: nowrap;
  user-select: none;
}

.switcher .switch input {
  display: none;
}

.switcher .switch {
  display: inline-block;
  width: 34px;
  height: 20px;
  position: relative;
  flex-shrink: 0;
}

.switcher .slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(36, 38, 43, 0.16);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.switcher .slider:before {
  position: absolute;
  content: "";
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease;
}

.switcher input:checked + .slider {
  background: var(--mji-primary);
}

.switcher input:checked + .slider:before {
  transform: translateX(14px);
}

.account-info {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--mji-surface-muted);
  border-bottom: 1px solid var(--mji-border);
}

.account-info__login {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--mji-text-muted);
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-info__login span {
  color: var(--mji-text);
  font-weight: 600;
}

.app_minimized {
  top: unset !important;
  bottom: 16px !important;
  right: 16px !important;
  left: unset !important;
  max-height: 52px;
  width: auto;
  min-width: 280px;
}

.app_minimized .header__drag-button,
.app_minimized #cleanButton,
.app_minimized .account-info,
.app_minimized .tabs,
.app_minimized .main {
  display: none;
}

.app_minimized #minimizeButton svg {
  transform: rotate(180deg);
}

.app_not-auth {
  width: 360px;
}

.app_not-auth #cleanButton {
  display: none;
}

.app_not-auth .tabs,
.app_not-auth .main {
  display: none !important;
}

.app_not-auth .auth {
  display: block !important;
}

.auth {
  padding: 20px 16px;
  display: none;
}

.auth__form {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 12px;
}

.auth__input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.auth__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--mji-border);
  border-radius: var(--mji-radius-sm);
  color: var(--mji-text);
  font-size: 14px;
  font-family: inherit;
  height: 40px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth__input:focus {
  border-color: var(--mji-primary);
  box-shadow: 0 0 0 3px rgba(31, 32, 34, 0.08);
}

.auth__error {
  color: var(--mji-error);
  font-size: 12px;
  position: absolute;
  right: 10px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.auth__error_visible {
  opacity: 1;
}

.auth__button {
  background: var(--mji-primary);
  border: none;
  outline: none;
  padding: 10px 16px;
  border-radius: var(--mji-radius-sm);
  text-align: center;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  height: 40px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.auth__button:hover {
  background: var(--mji-primary-hover);
}

.app_minimized .header {
  padding: 10px 12px;
}

.animation path,
.animation {
  animation: mji-icon-pulse 1s ease-in-out 1;
}

@keyframes mji-icon-pulse {
  0%, 100% { color: var(--mji-text-muted); }
  50% { color: var(--mji-success); }
}

.tabs {
  display: flex;
  gap: 4px;
  width: 100%;
  padding: 8px 12px 0;
  background: var(--mji-surface);
}

.tabs__button {
  outline: none;
  border: none;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  background: transparent;
  padding: 8px 6px;
  color: var(--mji-text-muted);
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.2;
  border-radius: var(--mji-radius-sm) var(--mji-radius-sm) 0 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.tabs__button:hover {
  color: var(--mji-text);
  background: var(--mji-surface-muted);
}

.tabs__button_active {
  color: var(--mji-text);
  background: var(--mji-surface-muted);
  border-bottom-color: var(--mji-primary);
  font-weight: 600;
}

.main {
  padding: 12px 12px 16px;
  border-top: 1px solid var(--mji-border);
}

.content_deactive {
  display: none !important;
}

.content#main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.main__button {
  outline: none;
  border: 1px solid transparent;
  color: var(--mji-text);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.3;
  background: var(--mji-surface-muted);
  padding: 14px 10px;
  min-height: 52px;
  border-radius: var(--mji-radius-sm);
  transition: background-color 0.2s ease, transform 0.15s ease, border-color 0.2s ease;
}

.main__button:hover {
  background: var(--mji-surface-hover);
  cursor: pointer;
}

.main__button:active {
  transform: scale(0.98);
}

.main__button_done {
  color: var(--mji-success) !important;
  background: rgba(46, 139, 46, 0.1) !important;
  border-color: rgba(46, 139, 46, 0.2) !important;
}

.main__button_error {
  color: var(--mji-error) !important;
  background: rgba(198, 40, 40, 0.08) !important;
  border-color: rgba(198, 40, 40, 0.18) !important;
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 16px;
}

.form__label {
  color: var(--mji-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}

.form_photo .form__field {
  margin-bottom: 14px;
}

.form__input_file {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.file-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px dashed var(--mji-border);
  border-radius: var(--mji-radius-sm);
  background: var(--mji-surface-muted);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.file-picker:hover {
  border-color: rgba(31, 32, 34, 0.35);
  background: var(--mji-surface-hover);
}

.form__field:focus-within .file-picker {
  border-color: var(--mji-primary);
  box-shadow: 0 0 0 3px rgba(31, 32, 34, 0.08);
}

.file-picker__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--mji-surface);
  color: var(--mji-text);
  flex-shrink: 0;
  border: 1px solid var(--mji-border);
}

.file-picker__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.file-picker__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--mji-text);
  line-height: 1.2;
}

.file-picker__hint {
  font-size: 12px;
  color: var(--mji-text-muted);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-picker__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.file-picker__list:not([hidden]) {
  display: flex;
}

.file-picker__item {
  font-size: 12px;
  color: var(--mji-text);
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--mji-surface);
  border: 1px solid var(--mji-border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form__input_date {
  width: 100%;
  border: 1px solid var(--mji-border);
  border-radius: var(--mji-radius-sm);
  padding: 11px 12px;
  color: var(--mji-text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  background: var(--mji-surface);
  min-height: 44px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form__input_date:focus {
  border-color: var(--mji-primary);
  box-shadow: 0 0 0 3px rgba(31, 32, 34, 0.08);
}

.form__input[type="file"]:not(.form__input_file) {
  font-family: inherit;
  font-size: 13px;
  width: 100%;
}

.form__input[type="file"]:not(.form__input_file)::file-selector-button {
  border: none;
  background: var(--mji-primary);
  padding: 10px 14px;
  margin-right: 10px;
  border-radius: var(--mji-radius-sm);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  transition: background-color 0.2s ease;
}

.form__input[type="file"]:not(.form__input_file)::file-selector-button:hover {
  background: var(--mji-primary-hover);
}

.form__input[type="date"]:not(.form__input_date) {
  width: 100%;
  border: 1px solid var(--mji-border);
  border-radius: var(--mji-radius-sm);
  padding: 10px 12px;
  color: var(--mji-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.form__input[type="date"]:not(.form__input_date):focus {
  border-color: var(--mji-primary);
  box-shadow: 0 0 0 3px rgba(31, 32, 34, 0.08);
}

.form__button {
  width: 100%;
  outline: none;
  border: none;
  background: var(--mji-primary);
  color: #fff;
  border-radius: var(--mji-radius-sm);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 12px 16px;
  min-height: 44px;
  transition: background-color 0.2s ease, transform 0.15s ease;
}

.form__button_submit {
  margin-top: 4px;
}

.form__button:active {
  transform: scale(0.99);
}

.form__button:hover {
  background: var(--mji-primary-hover);
}

.form__button_done {
  background: var(--mji-success) !important;
}

.fakeSelect {
  margin: 0;
  background: var(--mji-surface);
  border-radius: var(--mji-radius);
  box-shadow: var(--mji-shadow);
  border: 1px solid var(--mji-border);
  padding: 16px 12px;
  position: absolute;
  width: 500px;
  z-index: 2147483647;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}

.fakeSelect-wrapper {
  position: relative;
}

.fakeSelect_opened {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.fakeSelect__selector {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--mji-primary);
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.fakeSelect__selector:hover {
  background: var(--mji-primary-hover);
}

.fakeSelect__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fakeSelect__list label {
  text-align: left;
}

.fakeSelect__close-selector {
  position: absolute;
  top: -16px;
  left: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--mji-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fakeSelect__close-selector:hover {
  background: var(--mji-primary-hover);
}

.fakeSelect__item-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.fakeSelect__item {
  outline: none;
  border: none;
  cursor: pointer;
  width: fit-content;
  color: var(--mji-text);
  font-size: 12px;
  font-family: inherit;
  background: transparent;
  transition: color 0.2s ease;
}

.fakeSelect__item:hover {
  color: var(--mji-primary-hover);
}

.mji-manager-app .pdf-step {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 13px;
}

.mji-manager-app .pdf-step-icon_done {
  color: var(--mji-success);
}

.mji-manager-app .pdf-step-icon_error {
  color: var(--mji-error);
}

.mji-manager-app .loader_spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--mji-border);
  border-top-color: var(--mji-primary);
  border-radius: 50%;
  animation: mji-spin 0.8s linear infinite;
}

@keyframes mji-spin {
  to { transform: rotate(360deg); }
}
</style>
`;
