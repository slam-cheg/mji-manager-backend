export const mjiPopupStyles = `<style>
.inputErrorValidity {
    border: 2px solid #cb0000 !important;
    border-radius: 8px !important;
}
.mji-manager-app * {
padding: 0;
margin: 0;
box-sizing: border-box;
}

.mji-manager-app {
font-family: Inter;
z-index: 999;
background: #fff;
position: fixed;
width: 550px;
top: 50px;
right: 20px;
border-radius: 10px;
box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, 0.5);
padding: 0;
}

.account-info {
display: flex;
align-items: center;
padding: 10px;
justify-content: space-between;
}

.account-info__login {
font-size: 16px;
font-family: Arial;
}

.app_minimized {
top: unset !important;
bottom: 0 !important;
left: unset !important;
max-height: 48px;
width: auto;
}
.app_minimized .header__drag-button,
.app_minimized #cleanButton {
display: none;
}
.app_minimized #minimizeButton {
transform: rotate(180deg);
}
.app_not-auth {
width: 330px;
}
.app_not-auth #cleanButton {
display: none;
}
.app_not-auth .tabs {
display: none !important;
}
.app_not-auth .main {
display: none !important;
}
.app_not-auth .auth {
display: block !important;
}

.header {
position: relative;
width: 100%;
display: flex;
align-items: center;
justify-content: space-between;
padding: 14px 10px;
border-bottom: 1px solid #e9e9e9;
}

.header__title-wrapper {
display: flex;
align-items: center;
gap: 10px;
}

.header__logo {
width: 24px;
}

.header__title {
color: #1a1a18;
font-size: 20px;
font-style: normal;
font-weight: 400;
line-height: 100%;
}

.header__drag-button {
position: absolute;
top: 2px;
left: calc(50% - 10px);
height: 6px;
display: flex;
align-items: center;
cursor: grab;
}

.header__buttons {
display: flex;
align-items: center;
gap: 10px;
}

.header__button {
outline: none;
border: none;
display: flex;
width: 20px;
height: 20px;
transition: opacity 0.3s;
background-color: transparent;
cursor: pointer;
align-items: flex-end;
}

.header__button:hover {
opacity: 0.7;
transition: opacity 0.3s;
}

.auth {
padding: 20px 10px;
display: none;
}
.auth__form {
display: flex;
width: 100%;
justify-content: center;
flex-direction: column;
gap: 10px;
}
.auth__input-wrapper {
display: flex;
align-items: center;
position: relative;
}
.auth__input {
width: 100%;
padding: 10px;
border: 1px solid #1f5473;
color: #1a1a18;
font-size: 14px;
font-style: normal;
font-weight: 400;
line-height: 100%;
height: 34px;
outline: none;
}
.auth__error {
color: #9f0000;
font-size: 14px;
position: absolute;
right: 10px;
opacity: 0;
pointer-events: none;
transition: opacity 0.3s;
}
.auth__error_visible {
opacity: 1;
transition: opacity 0.3s;
}
.auth__button {
background: #1f5473;
border: none;
outline: none;
padding: 10px 30px;
text-align: center;
color: #fff;
font-size: 14px;
font-style: normal;
font-weight: 400;
line-height: 100%;
height: 34px;
cursor: pointer;
transition: opacity 0.3s;
}
.auth__button:hover {
opacity: 0.7;
transition: opacity 0.3s;
}

.app_minimized .header {
gap: 20px;
}

.animation {
animation: colorChange;
animation-duration: 1s;
animation-timing-function: ease-in-out;
animation-fill-mode: both;
animation-direction: normal;
animation-iteration-count: 1;
}

@keyframes colorChange {
0% {
    fill: #787878;
}
50% {
    fill: #008000;
}
100% {
    fill: #787878;
}
}
.tabs {
display: flex;
width: 100%;
border-bottom: 1px solid #e9e9e9;
margin-bottom: 20px;
}

.tabs__button {
outline: none;
border: none;
transition: 0.3s;
cursor: pointer;
background: #e9e9e9;
width: 50%;
padding: 8px;
color: #1a1a18;
text-align: center;
font-size: 14px;
font-style: normal;
font-weight: 400;
line-height: 100%;
border-right: 1px solid #bfbfbf;
}

.tabs__button:last-child {
border-right: none;
}

.tabs__button:hover {
opacity: 0.7;
transition: 0.3s;
}

.tabs__button_active {
background: #1f5473;
color: #fff;
}

.main {
padding: 0 10px 20px 10px;
}

.content_deactive {
display: none !important;
}

.content#main {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 10px;
}

.main__button {
outline: none;
border: none;
color: #1a1a18;
font-size: 14px;
font-style: normal;
font-weight: 400;
line-height: 100%;
background: #e9e9e9;
padding: 10px 0;
transition: opacity 0.3s;
}

.main__button:hover {
transition: opacity 0.3s;
opacity: 0.7;
cursor: pointer;
}

.main__button_done {
color: #00931a !important;
}

.main__button_error {
color: #9f0000 !important;
}

.form__field {
display: flex;
flex-direction: column;
gap: 10px;
width: 100%;
margin-bottom: 20px;
}

.form__label {
color: #1a1a18;
font-size: 12px;
font-style: normal;
font-weight: 400;
line-height: 100%;
}

.form__input[type=file]::file-selector-button {
width: 190px;
border: none;
background: #1f5473;
padding: 10px 30px;
margin-right: 10px;
color: #fff;
cursor: pointer;
transition: opacity 0.3s;
font-size: 14px;
font-style: normal;
font-weight: 400;
line-height: 100%;
}

.form__input[type=file]::file-selector-button:hover {
transition: opacity 0.3s;
opacity: 0.7;
}

.form__input[type=date] {
width: 190px;
border: 1px solid #1f5473;
padding: 11px 10px;
color: #1a1a18;
font-size: 12px;
font-style: normal;
font-weight: 400;
line-height: 100%;
outline: none;
}

.form__button {
width: 190px;
outline: none;
border: none;
background: #1f5473;
color: #fff;
transition: 0.3s;
font-size: 14px;
font-style: normal;
font-weight: 400;
line-height: 100%;
cursor: pointer;
padding: 10px 30px;
}

.form__button:hover {
transition: 0.3s;
opacity: 0.7;
}

.form__button_done {
background: #00931a !important;
}

.form__loader {
display: none;
}
.form__loader_visible {
display: block;
}
.form__loader_visible_flex {
display: flex;
flex-direction: column;
gap: 8px;
}
.form_parser .form__loader {
display: none;
}
.form_parser.form_parser_loading .form__field,
.form_parser.form_parser_loading .form__button {
display: none;
}
.form_parser.form_parser_loading .form__loader {
display: flex;
flex-direction: column;
gap: 8px;
}
.form__loader-inner {
margin: 10px auto;
}
.form__loader-text {
font-size: 14px;
color: #1a1a18;
}
.loader_spinner {
width: 16px;
height: 16px;
border: 2px solid #e9e9e9;
border-top-color: #1f5473;
border-radius: 50%;
display: inline-block;
vertical-align: middle;
margin-right: 6px;
animation: loaderSpin 0.8s linear infinite;
}
@keyframes loaderSpin {
to { transform: rotate(360deg); }
}

.pdf-step {
margin: 6px 0;
display: flex;
align-items: center;
}
.pdf-step-icon {
min-width: 28px;
}
.pdf-step-label {
font-size: 14px;
color: #1a1a18;
}
.pdf-step-icon_done {
color: #00931a;
font-weight: bold;
margin-right: 6px;
}
.pdf-step-icon_error {
color: #c00;
margin-right: 6px;
}
.pdf-steps-result {
padding: 8px 0;
color: #333;
font-size: 14px;
}

.switcher__label {
margin: 0;
}
.switcher__text {
margin-left: 4px;
font-size: 12px;
color: #1a1a18;
}
.switcher__input {
display: none;
}

.fakeSelect {
margin: 0;
background: #fff;
border-radius: 10px;
box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, 0.5);
padding: 20px 10px;
position: absolute;
width: 500px;
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
transition: 0.4s;
}

.fakeSelect__selector {
position: absolute;
top: 3px;
right: 3px;
width: 15px;
height: 15px;
border-radius: 20px;
background: #1f5473;
cursor: pointer;
transition: 0.3s;
display: flex;
align-items: center;
justify-content: center;
z-index: 50;
}

.fakeSelect__selector:hover {
background: #fff;
transition: 0.3s;
}

.fakeSelect-wrapper {
position: relative;
}

.fakeSelect_opened {
opacity: 1;
visibility: visible;
pointer-events: auto;
transition: 0.4s;
}

.fakeSelect__list {
list-style: none;
display: flex;
flex-direction: column;
gap: 5px;
padding: 0;
margin: 0;
}

.fakeSelect__list label {
text-align: left;
}

.fakeSelect__close-selector {
position: absolute;
top: -17px;
left: -6px;
width: 15px;
height: 15px;
border-radius: 20px;
background: #1f5473;
cursor: pointer;
transition: 0.3s;
display: flex;
align-items: center;
justify-content: center;
transfor: rotate(180deg)
}

.fakeSelect__close-selector:hover {
background: #000;
transition: 0.3s;
}

.fakeSelect__item-wrapper {
display: flex;
align-items: flex-start;
gap: 6px;
}

.fakeSelect__item {
outline: none;
border: none;
transition: 0.3s;
cursor: pointer;
width: fit-content;
color: #1a1a18;
font-size: 12px;
font-style: normal;
font-weight: 400;
line-height: 100%;
font-family: Inter;
}

.fakeSelect__item:hover {
color: #1f5473;
transition: 0.3s;
}

.fakeSelect__selector {
position: absolute;
top: 3px;
right: 3px;
width: 15px;
height: 15px;
border-radius: 20px;
background: #1f5473;
cursor: pointer;
transition: 0.3s;
display: flex;
align-items: center;
justify-content: center;
z-index: 50;
}

.fakeSelect__selector:hover {
background: #fff;
transition: 0.3s;
}

.fakeSelect__selector:hover svg path {
fill: #1f5473;
transition: 0.3s;
}

.switcher {
	align-items: center;
	display: flex;
	font-size: 10px;
}

.switch input {
	display: none;
}

.switch {
	display: inline-block;
	width: 20px; /*=w*/
	height: 10px; /*=h*/
	margin-right: 4px;
	position: relative;
}

.slider {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
	border-radius: 30px;
	box-shadow: 0 0 0 2px #e9e9e9, 0 0 4px #e9e9e9;
	cursor: pointer;
	border: 1px solid transparent;
	overflow: hidden;
	transition: 0.2s;
}

.slider:before {
	position: absolute;
	content: "";
	width: 50%;
	height: 100%;
	background-color: #e9e9e9;
	border-radius: 30px;
	transform: translateX(0px); /*translateX(-(w-h))*/
	transition: 0.2s;
}

input:checked + .slider:before {
	transform: translateX(10px); /*translateX(w-h)*/
	background-color: #00931a;
}

input:checked + .slider {
	box-shadow: 0 0 0 2px #00931a, 0 0 8px #00931a;
}

</style>
`;
