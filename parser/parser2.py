import openpyxl
import re
import json
from pathlib import Path

def extract_reg_number(text: str) -> str:
    """Извлекает регистрационный номер по универсальному шаблону."""
    match = re.search(r'Регистрационный №\s*([A-ZА-ЯЁ]{1,3}-\d{2}-\d+)', text, re.IGNORECASE)
    return match.group(1) if match else None

def parse_inspection_results(report_raw_data, template):
    result_template = template['РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ'].copy()
    current_section = None
    current_element = None
    section_start_index = None

    for i, row in enumerate(report_raw_data):
        row = [str(cell).strip() if cell else "" for cell in row]

        # 🔹 Определение заголовка секции
        if row[0] in result_template:
            current_section = row[0]
            section_start_index = i  # Запоминаем строку начала раздела
            current_element = None
            print(f"\n📌 Секция найдена: {current_section}")
            continue

        if not current_section:
            continue

        # 🔹 Обработка характеристик элемента (идем по столбцам, начиная с первой строки раздела)
        if i == section_start_index + 1 and row[0]:
            result_template[current_section]["Конструкция крыши"] = row[0]
            print(f"✅ Конструкция крыши: {row[0]}")
        elif i == section_start_index + 3 and row[0]:
            result_template[current_section]["Материал кровли"] = row[0]
            print(f"✅ Материал кровли: {row[0]}")
        elif i == section_start_index + 4 and "кв.м" in row[0].lower():
            match = re.search(r'(\d+)', row[0].replace(' ', ''))
            if match:
                result_template[current_section]["Площадь кровли, м²"] = int(match.group(1))
                print(f"✅ Площадь крыши: {match.group(1)} м²")

        # 🔹 Обработка вложенных элементов (начинаем с той же строки, что и элемент!)
        if row[1] or row[2]:
            element_data = row[1] if row[1] else row[2]
            if ":" in element_data:
                element_name, defect_desc = map(str.strip, element_data.split(":", 1))
                
                # ✅ Проверяем, что ключ в секции является `dict`, иначе исправляем
                if element_name in result_template[current_section]:
                    if not isinstance(result_template[current_section][element_name], dict):
                        result_template[current_section][element_name] = {
                            "Описание дефектов": "",
                            "Оц. по пред. обсл.": "",
                            "% деф. части": 0,
                            "Оценка": ""
                        }
                    
                    result_template[current_section][element_name]["Описание дефектов"] = defect_desc
                    result_template[current_section][element_name]["Оц. по пред. обсл."] = row[4] if len(row) > 4 else ""
                    result_template[current_section][element_name]["% деф. части"] = int(row[5]) if len(row) > 5 and row[5].isdigit() else 0
                    result_template[current_section][element_name]["Оценка"] = row[6] if len(row) > 6 else ""
                    print(f"✅ Заполнено: {current_section} -> {element_name}")
                    current_element = element_name
                else:
                    print(f"⚠️ Ошибка: {element_name} в {current_section} не является словарем")
        
        # 🔹 Обработка многострочных описаний дефектов
        elif current_element and (row[1] or row[2]):
            continuation_text = row[1] if row[1] else row[2]
            result_template[current_section][current_element]["Описание дефектов"] += " " + continuation_text
            print(f"➕ Добавлено к описанию '{current_element}': {continuation_text}")

    return result_template

def find_reports_and_parse(xlsx_path: str, template: dict) -> list:
    wb = openpyxl.load_workbook(xlsx_path)
    all_reports = []
    current_report_raw = []
    current_reg_num = None

    for sheet in wb.worksheets:
        print(f"🔍 Обработка листа: {sheet.title}")
        for row in sheet.iter_rows(values_only=True):
            row_text = ' '.join([str(cell) for cell in row if cell is not None]).strip()
            reg_num = extract_reg_number(row_text)
            if reg_num:
                print(f"\n📑 Новый отчет найден: {reg_num}")
                if current_reg_num:
                    inspection_results = parse_inspection_results(current_report_raw, template)
                    all_reports.append({
                        "Регистрационный номер": current_reg_num,
                        "РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ": inspection_results
                    })
                current_reg_num = reg_num
                current_report_raw = []
            if current_reg_num:
                current_report_raw.append(row)

    if current_reg_num:
        inspection_results = parse_inspection_results(current_report_raw, template)
        all_reports.append({
            "Регистрационный номер": current_reg_num,
            "РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ": inspection_results
        })

    print(f"\n📊 Всего найдено отчетов: {len(all_reports)}")
    return all_reports

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("❗ Использование: python parser/parser2.py <xlsx_file_path>")
        sys.exit(1)

    xlsx_file = sys.argv[1]
    template_file = Path(__file__).parent / "template.json"
    output_file = Path("outputs") / (Path(xlsx_file).stem + "_final.json")
    Path("outputs").mkdir(exist_ok=True)

    with open(template_file, 'r', encoding='utf-8') as f:
        template = json.load(f)

    final_reports = find_reports_and_parse(xlsx_file, template)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_reports, f, indent=4, ensure_ascii=False)

    print(f"\n✅ Готово! Финальный JSON сохранен в: {output_file}")
