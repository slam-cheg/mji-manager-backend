import sys
import json
import re
from PyPDF2 import PdfReader
from pathlib import Path

def read_pdf(file_path: str) -> str:
    """Читает PDF и убирает лишние пробелы, переносы строк, дефисы."""
    reader = PdfReader(file_path)
    text = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
    text = re.sub(r'(\S)-\n(\S)', r'\1\2', text)  # Убираем переносы с дефисами
    text = re.sub(r'\s+', ' ', text)  # Убираем лишние пробелы
    return text.strip()

def load_template(template_path: str) -> dict:
    """Загружает `template.json`."""
    with open(template_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_reports(text: str) -> list:
    """Разделяет PDF на отдельные отчеты по `Регистрационный №`."""
    report_regex = re.compile(r"рег\.?\s?№\s?С-\d{2}-\d{7}", re.IGNORECASE)
    reports = []
    current_report = None

    for line in text.split("\n"):
        match = report_regex.search(line)
        if match:
            if current_report:
                reports.append(current_report)  # Сохраняем предыдущий отчет
            current_report = {
                "report_number": match.group(),
                "content": ""
            }
        if current_report:
            current_report["content"] += line + " "

    if current_report:
        reports.append(current_report)  # Добавляем последний отчет

    return reports

def recursive_fill(template: dict, text: str) -> dict:
    """Рекурсивное заполнение JSON из текста."""
    def find_value(key):
        pattern = rf"{re.escape(key)}[:\s]+(.*?)(?=\s{2,}|$)"
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else ""

    result = {}
    for key, value in template.items():
        if isinstance(value, dict):
            result[key] = recursive_fill(value, text)  # Рекурсивно проходим по объектам
        elif isinstance(value, list):
            result[key] = [recursive_fill(item, text) for item in value]
        else:
            result[key] = find_value(key)  # Ищем значение для ключа
    return result

def create_report(text: str, template: dict) -> dict:
    """Создает отчет в формате `template.json`."""
    return {
        "Шапка": extract_header(text),
        "Адрес": extract_address(text),
        "ПАСПОРТНЫЕ ДАННЫЕ": extract_passport_data(text),
        "ВЫВОДЫ ПО РЕЗУЛЬТАТАМ ОБСЛЕДОВАНИЯ": extract_conclusions(text),
        "РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ": recursive_fill(template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"], text)
    }

def extract_header(text: str) -> dict:
    """Извлекает `Шапку` из отчета."""
    company = re.search(r"(ООО «.*?»)", text)
    reg_number = re.search(r"Регистрационный №\s*(\S+)", text)
    date = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
    return {
        "Компания": company.group(1) if company else "",
        "Регистрационный №": reg_number.group(1) if reg_number else "",
        "Дата": date.group(1) if date else ""
    }

def extract_address(text: str) -> dict:
    """Извлекает `Адрес`."""
    address = re.search(r"по адресу: (.*?)\n", text)
    district = re.search(r"Район / поселение: (.*?)\s", text)
    return {
        "По адресу": address.group(1) if address else "",
        "дом №": "",
        "корп. №": "",
        "стр. №": "",
        "Район / поселение:": district.group(1) if district else "",
        "АО": "САО",
        "Объединение собственников жилья": "Да",
        "Назначение:": "МКД",
        "Управляющая организация": "ГБУ «Жилищник Головинского района»"
    }

def extract_passport_data(text: str) -> dict:
    """Извлекает `ПАСПОРТНЫЕ ДАННЫЕ`."""
    floors = re.search(r"(\d+)\s+этажей", text)
    entrances = re.search(r"(\d+)\s+подъездов", text)
    series = re.search(r"Серия проекта: (.*?)\n", text)
    year = re.search(r"Год постройки/реконстр.: (.*?)\n", text)
    return {
        "этажей": int(floors.group(1)) if floors else 0,
        "подъездов": int(entrances.group(1)) if entrances else 0,
        "Серия проекта:": series.group(1).strip() if series else "",
        "Год постройки/реконстр.": year.group(1).strip() if year else ""
    }

def extract_conclusions(text: str) -> dict:
    """Извлекает `ВЫВОДЫ ПО РЕЗУЛЬТАТАМ ОБСЛЕДОВАНИЯ`."""
    tech_condition = re.search(r"Техническое состояние здания.*?:\s*(.*?)\n", text)
    recommendations = re.findall(r"[-–•]\s*(.*)", text)
    return {
        "Техническое состояние здания (в целом)": tech_condition.group(1).strip() if tech_condition else "",
        "РЕКОМЕНДАЦИИ по ремонтно-восстановительным работам в течение 5 лет": recommendations
    }

def main():
    if len(sys.argv) < 2:
        print("Использование: python parser2.py <путь к PDF>")
        return

    pdf_path = sys.argv[1]
    template_path = Path(__file__).parent / "template.json"
    output_path = "output.json"

    template = load_template(template_path)
    text = read_pdf(pdf_path)

    reports = extract_reports(text)
    parsed_reports = []

    for report in reports:
        parsed_data = create_report(report["content"], template)
        parsed_reports.append({report["report_number"]: parsed_data})

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(parsed_reports, f, ensure_ascii=False, indent=4)

    print(f"✅ Парсинг завершен! Файл сохранен в {output_path}")

if __name__ == "__main__":
    main()
