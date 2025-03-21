import json
import re
import sys
from typing import Dict
from PyPDF2 import PdfReader
from pathlib import Path


def read_pdf(file_path: str) -> str:
    """Чтение текста из PDF."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text


def load_template(template_path: str) -> Dict:
    """Загрузка шаблона JSON."""
    with open(template_path, 'r', encoding='utf-8') as f:
        return json.load(f)


# --- БЛОКИ ШАПКИ И ПАСПОРТНЫХ ДАННЫХ (оставлены без изменений) --- #

def extract_header(text: str) -> Dict:
    company = re.search(r"(ООО «.*?»)", text)
    reg_number = re.search(r"Регистрационный №\s*(\S+)", text)
    date = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
    return {
        "Компания": company.group(1) if company else "",
        "Регистрационный №": reg_number.group(1) if reg_number else "",
        "Дата": date.group(1) if date else ""
    }


def extract_address(text: str) -> Dict:
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


def extract_passport_data(text: str) -> Dict:
    floors = re.search(r"(\d+)\s+этажей", text)
    entrances = re.search(r"(\d+)\s+подъездов", text)
    volume = re.search(r"(\d+)\s+кб. м", text)
    apartments = re.search(r"(\d+)\s+квартир", text)
    series = re.search(r"Серия проекта: (.*?)\n", text)
    year = re.search(r"Год постройки/реконстр.: (.*?)\n", text)
    wear = re.search(r"Физический износ.*?(\d+[\.,]\d+)", text)

    return {
        "этажей": int(floors.group(1)) if floors else 0,
        "подъездов": int(entrances.group(1)) if entrances else 0,
        "Строительный объём здания (кб. м)": int(volume.group(1)) if volume else 0,
        "Кол-во квартир": int(apartments.group(1)) if apartments else 0,
        "Площадь (кв.м)": {"Полезная": 0, "В жилых помещениях": 0, "В нежилых помещениях": 0},
        "Серия проекта:": series.group(1).strip() if series else "",
        "Год постройки/реконстр.": year.group(1).strip() if year else "",
        "Физический износ (%) по данным БТИ на": {
            "Дата": "01.01.2023 г.",
            "%": float(wear.group(1).replace(",", ".")) if wear else 0
        }
    }


def extract_conclusions(text: str) -> Dict:
    tech_condition = re.search(r"Техническое состояние здания.*?:\s*(.*?)\n", text)
    recommendations_match = re.search(r"РЕКОМЕНДАЦИИ.*?:\s*(.*?)(\n[A-ZА-Я ]{3,}|$)", text, re.DOTALL)
    recommendations_text = recommendations_match.group(1) if recommendations_match else ""
    recommendations = re.findall(r"[-–•]\s*(.*)", recommendations_text)
    return {
        "Техническое состояние здания (в целом)": tech_condition.group(1).strip() if tech_condition else "",
        "РЕКОМЕНДАЦИИ по ремонтно-восстановительным работам в течение 5 лет": recommendations
    }


def normalize_text(text: str) -> str:
    """Нормализация текста (убираем переносы строк в словах)."""
    text = re.sub(r'(\S)-\n(\S)', r'\1\2', text)  # убираем переносы слов
    text = re.sub(r'\n+', '\n', text)  # заменяем множественные переносы на один
    return text


def fill_inspection_results(text: str, template: Dict) -> Dict:
    """Заполняем шаблон 'РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ' построчно."""

    block_match = re.search(r"РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ(.*?)(?=ВЫВОДЫ|$)", text, re.DOTALL | re.IGNORECASE)
    if not block_match:
        print("❌ Блок 'РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ' не найден.")
        return template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]

    block_text = block_match.group(1).strip()
    lines = block_text.split("\n")

    current_section = None  # какая секция сейчас

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Ищем название секции
        for section_name in template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"].keys():
            if line.lower().startswith(section_name.lower()):
                current_section = section_name
                print(f"📌 Секция найдена: {current_section}")
                break

        # Если мы внутри секции — начинаем искать элементы
        if current_section:
            for element_name in template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][current_section].keys():
                # Ищем строку вида: "Кровля: Локальные застойные зоны. У 15 У"
                pattern = rf"{element_name}:\s*(.+?)\.\s+([УРНАОГ])\s*(\d+)\s*([УРНАОГ])"
                match = re.match(pattern, line)
                if match:
                    print(f"✅ Найдено '{current_section} -> {element_name}'")
                    template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][current_section][element_name] = {
                        "Описание дефектов": match.group(1).strip(),
                        "Оц. по пред. обсл.": match.group(2).strip(),
                        "% деф. части": int(match.group(3).strip()),
                        "Оценка": match.group(4).strip()
                    }

    return template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]




def normalize_text(text: str) -> str:
    # Убираем переносы внутри слов
    text = re.sub(r'(\S)-\n(\S)', r'\1\2', text)
    return text  # НЕ убираем другие переносы, чтобы видеть строки




def create_final_object(text: str, template: Dict) -> Dict:
    """Финальная сборка JSON с заполнением шаблона."""
    return {
        "Шапка": extract_header(text),
        "Адрес": extract_address(text),
        "ПАСПОРТНЫЕ ДАННЫЕ": extract_passport_data(text),
        "ВЫВОДЫ ПО РЕЗУЛЬТАТАМ ОБСЛЕДОВАНИЯ": extract_conclusions(text),
        "РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ": fill_inspection_results(text, template)
    }


if __name__ == "__main__":
    pdf_path = sys.argv[1]
    template_path = Path(__file__).parent / "template.json"  # Правильный путь к шаблону
    output_path = f"outputs/{Path(pdf_path).stem}_parsed.json"

    template = load_template(template_path)
    text = read_pdf(pdf_path)
    text = normalize_text(text)
    parsed_data = create_final_object(text, template)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(parsed_data, f, indent=4, ensure_ascii=False)

    print(f"✅ Готово! Файл сохранен: {output_path}")

