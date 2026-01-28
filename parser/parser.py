#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер PDF файлов для извлечения данных технического обследования зданий.
Преобразует PDF в структурированный JSON согласно template.json
Использует pdfplumber для извлечения таблиц и текста
"""

import json
import re
import sys
from typing import Dict, List, Any, Optional
from pathlib import Path

try:
    import pdfplumber
    USE_PDFPLUMBER = True
except ImportError:
    try:
        from PyPDF2 import PdfReader
        USE_PDFPLUMBER = False
    except ImportError:
        print("❌ Ошибка: Не установлены библиотеки для работы с PDF (pdfplumber или PyPDF2)", file=sys.stderr)
        sys.exit(1)

try:
    import pandas as pd
    USE_PANDAS = True
except ImportError:
    USE_PANDAS = False


def extract_tables_from_pdf(file_path: str) -> List[List[List[str]]]:
    """Извлекает таблицы из PDF используя pdfplumber."""
    tables = []
    if not USE_PDFPLUMBER:
        return tables
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_tables = page.extract_tables()
                if page_tables:
                    tables.extend(page_tables)
    except Exception as e:
        print(f"⚠️ Ошибка при извлечении таблиц: {e}", file=sys.stderr)
    
    return tables


def read_pdf_text(file_path: str) -> str:
    """Чтение текста из PDF с использованием pdfplumber или PyPDF2."""
    text = ""
    
    if USE_PDFPLUMBER:
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"⚠️ Ошибка при чтении PDF через pdfplumber: {e}", file=sys.stderr)
            if not USE_PDFPLUMBER:
                reader = PdfReader(file_path)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
    else:
        reader = PdfReader(file_path)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    
    return text


def read_pdf_as_dataframe(file_path: str) -> Optional['pd.DataFrame']:
    """Читает PDF и преобразует таблицы в DataFrame."""
    if not USE_PDFPLUMBER or not USE_PANDAS:
        return None
    
    try:
        all_rows = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Извлекаем таблицы
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        all_rows.extend(table)
                
                # Если таблиц нет, пытаемся извлечь текст построчно
                if not tables:
                    text = page.extract_text()
                    if text:
                        lines = text.split('\n')
                        for line in lines:
                            if line.strip():
                                # Пытаемся разделить строку на колонки по пробелам/табуляции
                                cols = re.split(r'\s{2,}|\t', line.strip())
                                if len(cols) > 1:
                                    all_rows.append(cols)
        
        if all_rows:
            # Создаем DataFrame
            max_cols = max(len(row) for row in all_rows) if all_rows else 0
            # Нормализуем строки до одинаковой длины
            normalized_rows = []
            for row in all_rows:
                normalized = list(row) + [''] * (max_cols - len(row))
                normalized_rows.append(normalized[:max_cols])
            
            df = pd.DataFrame(normalized_rows)
            return df
    except Exception as e:
        print(f"⚠️ Ошибка при создании DataFrame: {e}", file=sys.stderr)
    
    return None


def load_template(template_path: str) -> Dict:
    """Загрузка шаблона JSON."""
    with open(template_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def normalize_text(text: str) -> str:
    """Нормализация текста (убираем переносы строк в словах)."""
    text = re.sub(r'(\S)-\n(\S)', r'\1\2', text)  # убираем переносы слов
    text = re.sub(r'\n{3,}', '\n\n', text)  # заменяем множественные переносы
    return text


def extract_header(text: str) -> Dict:
    """Извлечение данных из шапки документа."""
    company = re.search(r"(ООО «[^»]+»)", text)
    reg_number = re.search(r"Регистрационный\s+№\s*:?\s*(\S+)", text, re.IGNORECASE)
    date = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
    
    return {
        "Компания": company.group(1) if company else "",
        "Регистрационный №": reg_number.group(1) if reg_number else "",
        "Дата": date.group(1) if date else ""
    }


def extract_address(text: str) -> Dict:
    """Извлечение адресных данных."""
    address_match = re.search(r"по адресу:\s*(.+?)(?:\n|Район)", text, re.IGNORECASE | re.DOTALL)
    district_match = re.search(r"Район\s*/\s*поселение:\s*([^\n]+)", text, re.IGNORECASE)
    
    address = address_match.group(1).strip() if address_match else ""
    
    # Пытаемся извлечь дом, корпус, строение из адреса
    house_match = re.search(r"дом\s*№\s*(\d+[А-Яа-я]?)", address, re.IGNORECASE)
    korp_match = re.search(r"корп\.?\s*№\s*(\d+[А-Яа-я]?)", address, re.IGNORECASE)
    str_match = re.search(r"стр\.?\s*№\s*(\d+[А-Яа-я]?)", address, re.IGNORECASE)
    
    return {
        "По адресу": address,
        "дом №": house_match.group(1) if house_match else "",
        "корп. №": korp_match.group(1) if korp_match else "",
        "стр. №": str_match.group(1) if str_match else "",
        "Район / поселение:": district_match.group(1).strip() if district_match else "",
        "АО": "САО",
        "Объединение собственников жилья": "Да",
        "Назначение:": "МКД",
        "Управляющая организация": "ГБУ «Жилищник Головинского района»"
    }


def extract_passport_data(text: str) -> Dict:
    """Извлечение паспортных данных здания."""
    floors_match = re.search(r"(\d+)\s+этаж", text, re.IGNORECASE)
    entrances_match = re.search(r"(\d+)\s+подъезд", text, re.IGNORECASE)
    volume_match = re.search(r"(\d+)\s+кб\.?\s*м", text, re.IGNORECASE)
    apartments_match = re.search(r"(\d+)\s+квартир", text, re.IGNORECASE)
    series_match = re.search(r"Серия\s+проекта:\s*([^\n]+)", text, re.IGNORECASE)
    year_match = re.search(r"Год\s+постройки/реконстр\.?:\s*([^\n]+)", text, re.IGNORECASE)
    wear_match = re.search(r"Физический\s+износ.*?(\d+[.,]\d+)", text, re.IGNORECASE | re.DOTALL)
    
    # Площадь - более точный поиск
    useful_area_match = re.search(r"Полезная[^\d]*(\d+(?:[.,]\d+)?)", text, re.IGNORECASE)
    living_area_match = re.search(r"В\s+жилых\s+помещениях[^\d]*(\d+(?:[.,]\d+)?)", text, re.IGNORECASE)
    non_living_area_match = re.search(r"В\s+нежилых\s+помещениях[^\d]*(\d+(?:[.,]\d+)?)", text, re.IGNORECASE)
    
    # Дата износа
    wear_date_match = re.search(r"Физический\s+износ.*?на\s+(\d{2}\.\d{2}\.\d{4})", text, re.IGNORECASE | re.DOTALL)
    
    def safe_int(match):
        if not match:
            return 0
        try:
            val = match.group(1).replace(',', '.')
            return int(float(val))
        except:
            return 0
    
    def safe_float(match):
        if not match:
            return 0
        try:
            val = match.group(1).replace(',', '.')
            return float(val)
        except:
            return 0
    
    return {
        "этажей": safe_int(floors_match),
        "подъездов": safe_int(entrances_match),
        "Строительный объём здания (кб. м)": safe_int(volume_match),
        "Кол-во квартир": safe_int(apartments_match),
        "Площадь (кв.м)": {
            "Полезная": safe_int(useful_area_match),
            "В жилых помещениях": safe_int(living_area_match),
            "В нежилых помещениях": safe_int(non_living_area_match)
        },
        "Серия проекта:": series_match.group(1).strip() if series_match else "",
        "Год постройки/реконстр.": year_match.group(1).strip() if year_match else "",
        "Физический износ (%) по данным БТИ на": {
            "Дата": wear_date_match.group(1) if wear_date_match else "01.01.2023 г.",
            "%": safe_float(wear_match)
        },
        "Наличие встроенных / надстроенных инженерных сооружений": {
            "в т.ч. масляные ТП": "",
            "ТП": "",
            "Магистрали транзитные": ""
        },
        "Класс энергетической эффективности здания": "",
        "Фактическое удельное потребление тепловой энергии": 0,
        "Проектное удельное потребление тепловой энергии": 0,
        "Величина отклонения": 0
    }


def extract_conclusions(text: str) -> Dict:
    """Извлечение выводов и рекомендаций."""
    tech_condition_match = re.search(
        r"Техническое\s+состояние\s+здания.*?:\s*([^\n]+)", 
        text, 
        re.IGNORECASE | re.DOTALL
    )
    
    recommendations_match = re.search(
        r"РЕКОМЕНДАЦИИ.*?:\s*(.+?)(?=\n[A-ZА-Я]{3,}|$)", 
        text, 
        re.DOTALL | re.IGNORECASE
    )
    
    recommendations = []
    if recommendations_match:
        recommendations_text = recommendations_match.group(1)
        # Ищем пункты рекомендаций
        rec_items = re.findall(r"[-–•]\s*([^\n]+)", recommendations_text)
        recommendations = [item.strip() for item in rec_items if item.strip()]
    
    return {
        "Техническое состояние здания (в целом)": tech_condition_match.group(1).strip() if tech_condition_match else "",
        "РЕКОМЕНДАЦИИ по ремонтно-восстановительным работам в течение 5 лет": recommendations if recommendations else [""]
    }


def extract_metadata_from_description(description: str) -> Dict[str, Any]:
    """Извлекает метаданные из описания дефектов (материал, площадь и т.д.)."""
    metadata = {}
    
    # Ищем материал и площадь кровли (например, "Рулонная 462 кв.м")
    roof_material_match = re.search(r'([А-Яа-я]+(?:я|ая|ая|ая)?)\s+(\d+(?:[.,]\d+)?)\s*(?:кв\.?м|м²)', description, re.IGNORECASE)
    if roof_material_match:
        metadata['материал_кровли'] = roof_material_match.group(1).strip()
        metadata['площадь_кровли'] = float(roof_material_match.group(2).replace(',', '.'))
    
    # Ищем другие паттерны материала и площади
    material_patterns = [
        (r'([А-Яа-я]+(?:я|ая|ая)?)\s+(\d+(?:[.,]\d+)?)\s*(?:кв\.?м|м²)', 'материал', 'площадь'),
    ]
    
    return metadata


def parse_roof_section_from_text(text: str, template_roof: Dict) -> Dict:
    """Парсинг секции Крыша из текста с улучшенной логикой."""
    result = json.loads(json.dumps(template_roof))  # Deep copy
    
    # Ищем секцию "Крыша"
    roof_start = find_section_in_text(text, "Крыша")
    if roof_start is None:
        return result
    
    lines = text.split('\n')
    current_line = roof_start + 1
    
    # Ищем конструкцию крыши
    while current_line < len(lines) and current_line < roof_start + 10:
        line = lines[current_line].strip()
        if line and not re.match(r'^[А-Я]+:', line):
            if not result["Конструкция крыши"]:
                result["Конструкция крыши"] = line
            current_line += 1
            break
        current_line += 1
    
    # Ищем материал и площадь кровли
    roof_text = '\n'.join(lines[roof_start:min(roof_start + 50, len(lines))])
    
    # Ищем в описаниях дефектов
    for key in ["Кровля", "Свесы", "Чердак", "Все элементы"]:
        if key in result and isinstance(result[key], dict):
            desc = result[key].get("Описание дефектов", "")
            if desc:
                # Ищем материал кровли (например, "Рулонная 462 кв.м")
                material_area_match = re.search(r'([А-Яа-я]+(?:я|ая)?)\s+(\d+(?:[.,]\d+)?)\s*(?:кв\.?м|м²)', desc, re.IGNORECASE)
                if material_area_match and not result["Материал кровли"]:
                    result["Материал кровли"] = material_area_match.group(1).strip()
                    try:
                        result["Площадь кровли, м²"] = float(material_area_match.group(2).replace(',', '.'))
                    except:
                        pass
    
    # Парсим вложенные элементы
    current_nested = None
    for i in range(roof_start, min(roof_start + 100, len(lines))):
        line = lines[i].strip()
        if not line:
            continue
        
        # Проверяем, не началась ли следующая секция
        if re.match(r'^[А-Я][А-Я\s]{2,}$', line) and line.lower() not in ["крыша", "кровля", "свесы"]:
            if line.lower() in ["водоотвод", "межпанельные", "фасад"]:
                break
        
        # Ищем вложенные элементы (формат: "Кровля: описание...")
        nested_match = re.match(r'^([А-Яа-я]+):\s*(.+)$', line)
        if nested_match:
            nested_key = nested_match.group(1).strip()
            nested_desc = nested_match.group(2).strip()
            
            if nested_key in result and isinstance(result[nested_key], dict):
                current_nested = nested_key
                result[nested_key]['Описание дефектов'] = nested_desc
            else:
                current_nested = None
        elif current_nested and line:
            # Продолжаем собирать описание
            if current_nested in result:
                result[current_nested]['Описание дефектов'] += " " + line
        
        # Ищем оценки в формате: У/Р/Н/А/О/Г и проценты
        eval_match = re.search(r'([УРНАОГ])\s*(\d+)\s*([УРНАОГ])?', line)
        if eval_match:
            target = result[current_nested] if current_nested and current_nested in result else result
            if isinstance(target, dict):
                if 'Оц. по пред. обсл.' in target:
                    target['Оц. по пред. обсл.'] = eval_match.group(1)
                if '% деф. части' in target:
                    try:
                        target['% деф. части'] = int(eval_match.group(2))
                    except:
                        pass
                if eval_match.group(3) and 'Оценка' in target:
                    target['Оценка'] = eval_match.group(3)
    
    return result


def parse_roof_section_from_df(df: 'pd.DataFrame', template_roof: Dict) -> Dict:
    """Парсинг секции Крыша из DataFrame (как в parser4)."""
    if df is None:
        return json.loads(json.dumps(template_roof))
    
    result = json.loads(json.dumps(template_roof))
    
    # Ищем строку "Крыша"
    start_row = None
    for i in range(len(df)):
        val = str(df.iloc[i, 0]).strip().lower() if not pd.isna(df.iloc[i, 0]) else ""
        if val == "крыша":
            start_row = i
            break
    
    if start_row is None:
        return result
    
    row = start_row + 1
    
    # Конструкция крыши
    if row < len(df) and not pd.isna(df.iloc[row, 0]):
        result["Конструкция крыши"] = str(df.iloc[row, 0]).strip()
        row += 1
    
    # Материал и площадь кровли
    while row < len(df) and row < start_row + 10:
        val = str(df.iloc[row, 0]).strip() if not pd.isna(df.iloc[row, 0]) else ""
        if ":" in val:
            row += 1
            continue
        
        if val and not result["Материал кровли"]:
            result["Материал кровли"] = val
            row += 1
            
            # Следующая строка - площадь
            if row < len(df):
                val2 = str(df.iloc[row, 0]).strip() if not pd.isna(df.iloc[row, 0]) else ""
                area_match = re.search(r"(\d+[.,]?\d*)", val2)
                if area_match:
                    try:
                        result["Площадь кровли, м²"] = float(area_match.group(1).replace(",", "."))
                    except:
                        pass
            break
        row += 1
    
    # Парсим вложенные элементы
    current_nested = None
    for r in range(start_row, len(df)):
        first_col = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if first_col == "водоотвод":
            break
        
        for c in [1, 2]:
            if c >= len(df.columns):
                continue
            val = str(df.iloc[r, c]).strip() if not pd.isna(df.iloc[r, c]) else ""
            if not val:
                continue
            
            if ":" in val:
                key, description = val.split(":", 1)
                key = key.strip()
                if key in result and isinstance(result[key], dict):
                    result[key]["Описание дефектов"] = description.strip()
                    if len(df.columns) > 4:
                        result[key]["Оц. по пред. обсл."] = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
                    if len(df.columns) > 5:
                        try:
                            percent_val = df.iloc[r, 5]
                            if not pd.isna(percent_val):
                                result[key]["% деф. части"] = int(float(str(percent_val).replace(',', '.')))
                        except:
                            pass
                    if len(df.columns) > 6:
                        result[key]["Оценка"] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
                    current_nested = key
            elif current_nested and current_nested in result:
                result[current_nested]["Описание дефектов"] += " " + val.strip()
    
    return result


def parse_vodootvod_section_from_df(df: 'pd.DataFrame', template_vodootvod: Dict, start_row: int) -> Dict:
    """Парсинг секции Водоотвод из DataFrame."""
    if df is None:
        return json.loads(json.dumps(template_vodootvod))
    
    result = json.loads(json.dumps(template_vodootvod))
    row = start_row
    
    if row + 1 < len(df):
        result["Тип водоотвода"] = str(df.iloc[row + 1, 0]).strip() if not pd.isna(df.iloc[row + 1, 0]) else ""
    if row + 3 < len(df):
        result["Материал водоотвода"] = str(df.iloc[row + 3, 0]).strip() if not pd.isna(df.iloc[row + 3, 0]) else ""
    
    # Описание дефектов и оценки
    if len(df.columns) > 1:
        result["Описание дефектов"] = str(df.iloc[row, 1]).strip() if not pd.isna(df.iloc[row, 1]) else ""
    if len(df.columns) > 4:
        result["Оц. по пред. обсл."] = str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    if len(df.columns) > 5:
        try:
            percent_val = df.iloc[row, 5]
            if not pd.isna(percent_val):
                result["% деф. части"] = int(float(str(percent_val).replace(',', '.')))
        except:
            pass
    if len(df.columns) > 6:
        result["Оценка"] = str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    
    return result


def find_section_in_text(text: str, section_name: str) -> Optional[int]:
    """Находит начало секции в тексте."""
    patterns = [
        rf"^{re.escape(section_name)}",
        rf"^{re.escape(section_name)}:",
        rf"^\s*{re.escape(section_name)}\s*$",
    ]
    
    lines = text.split('\n')
    for i, line in enumerate(lines):
        line_clean = line.strip()
        for pattern in patterns:
            if re.match(pattern, line_clean, re.IGNORECASE):
                return i
    return None


def find_section_in_df(df: 'pd.DataFrame', section_name: str) -> Optional[int]:
    """Находит начало секции в DataFrame."""
    if df is None:
        return None
    
    for i in range(len(df)):
        val = str(df.iloc[i, 0]).strip().lower() if not pd.isna(df.iloc[i, 0]) else ""
        if val == section_name.lower():
            return i
    return None


def parse_simple_section(text: str, section_name: str, template_section: Dict) -> Dict:
    """Парсинг простых секций с одним уровнем вложенности."""
    result = json.loads(json.dumps(template_section))  # Deep copy
    
    section_start = find_section_in_text(text, section_name)
    if section_start is None:
        return result
    
    lines = text.split('\n')
    current_line_idx = section_start + 1
    
    while current_line_idx < len(lines):
        line = lines[current_line_idx].strip()
        if not line:
            current_line_idx += 1
            continue
        
        # Проверяем, не началась ли следующая секция
        if re.match(r'^[А-Я][А-Я\s]+$', line) and line != section_name:
            break
        
        # Собираем описание дефектов
        if 'Описание дефектов' in result and not result['Описание дефектов']:
            desc_parts = []
            temp_idx = current_line_idx
            while temp_idx < len(lines) and temp_idx < current_line_idx + 10:
                part = lines[temp_idx].strip()
                if part and not re.match(r'^[УРНАОГ]\s*\d+', part):
                    desc_parts.append(part)
                temp_idx += 1
            if desc_parts:
                result['Описание дефектов'] = ' '.join(desc_parts[:5])  # Ограничиваем длину
        
        # Ищем оценки
        eval_match = re.search(r'([УРНАОГ])\s*(\d+)\s*([УРНАОГ])?', line)
        if eval_match:
            if '% деф. части' in result:
                try:
                    result['% деф. части'] = int(eval_match.group(2))
                except:
                    pass
            if 'Оц. по пред. обсл.' in result:
                result['Оц. по пред. обсл.'] = eval_match.group(1)
            if eval_match.group(3) and 'Оценка' in result:
                result['Оценка'] = eval_match.group(3)
        
        current_line_idx += 1
    
    return result


def parse_nested_section(text: str, section_name: str, template_section: Dict) -> Dict:
    """Парсинг секций с вложенными элементами (например, Крыша, Балконы)."""
    result = json.loads(json.dumps(template_section))  # Deep copy
    
    section_start = find_section_in_text(text, section_name)
    if section_start is None:
        return result
    
    lines = text.split('\n')
    current_line_idx = section_start + 1
    current_nested_key = None
    description_buffer = []
    
    while current_line_idx < len(lines):
        line = lines[current_line_idx].strip()
        if not line:
            current_line_idx += 1
            continue
        
        # Проверяем, не началась ли следующая секция
        next_section_match = re.match(r'^([А-Я][А-Я\s]+)$', line)
        if next_section_match and line != section_name:
            break
        
        # Ищем вложенные элементы
        nested_match = re.match(r'^([^:]+):\s*(.+)$', line)
        if nested_match:
            nested_key = nested_match.group(1).strip()
            nested_desc = nested_match.group(2).strip()
            
            if nested_key in result and isinstance(result[nested_key], dict):
                current_nested_key = nested_key
                result[nested_key]['Описание дефектов'] = nested_desc
                description_buffer = [nested_desc]
            else:
                current_nested_key = None
                description_buffer = []
        elif current_nested_key and line:
            description_buffer.append(line)
            if current_nested_key in result:
                result[current_nested_key]['Описание дефектов'] = ' '.join(description_buffer)
        
        # Ищем оценки и проценты
        eval_match = re.search(r'([УРНАОГ])\s*(\d+)\s*([УРНАОГ])?', line)
        if eval_match:
            target = result[current_nested_key] if current_nested_key and current_nested_key in result else result
            if isinstance(target, dict):
                if 'Оц. по пред. обсл.' in target:
                    target['Оц. по пред. обсл.'] = eval_match.group(1)
                if '% деф. части' in target:
                    try:
                        target['% деф. части'] = int(eval_match.group(2))
                    except:
                        pass
                if eval_match.group(3) and 'Оценка' in target:
                    target['Оценка'] = eval_match.group(3)
        
        current_line_idx += 1
    
    return result


def fill_inspection_results(text: str, template: Dict, df: Optional['pd.DataFrame'] = None) -> Dict:
    """Заполнение секции 'РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ'."""
    results_template = template.get("РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ", {})
    result = json.loads(json.dumps(results_template))  # Deep copy
    
    # Список секций с вложенными элементами
    nested_sections = ["Крыша", "Балконы", "Места общего пользования", 
                      "Система отопления", "Система ГВС", "Система ХВС", "Канализация"]
    
    # Обрабатываем каждую секцию
    for section_name in result.keys():
        if section_name == "Крыша" and df is not None:
            # Используем DataFrame для более точного парсинга
            result[section_name] = parse_roof_section_from_df(df, result[section_name])
        elif section_name == "Водоотвод" and df is not None:
            start_row = find_section_in_df(df, "Водоотвод")
            if start_row is not None:
                result[section_name] = parse_vodootvod_section_from_df(df, result[section_name], start_row)
        elif section_name in nested_sections:
            result[section_name] = parse_nested_section(text, section_name, result[section_name])
        else:
            result[section_name] = parse_simple_section(text, section_name, result[section_name])
    
    return result


def create_final_object(text: str, template: Dict, df: Optional['pd.DataFrame'] = None) -> Dict:
    """Финальная сборка JSON с заполнением шаблона."""
    return {
        "Шапка": extract_header(text),
        "Адрес": extract_address(text),
        "ПАСПОРТНЫЕ ДАННЫЕ": extract_passport_data(text),
        "НАЛИЧИЕ ТЕХНИЧЕСКИХ ЗАКЛЮЧЕНИЙ И ПРОЕКТОВ РЕМОНТА": template.get("НАЛИЧИЕ ТЕХНИЧЕСКИХ ЗАКЛЮЧЕНИЙ И ПРОЕКТОВ РЕМОНТА", []),
        "Выводы по результатам предыдущего обследования": template.get("Выводы по результатам предыдущего обследования", {}),
        "Выполнение рекомендаций предыдущего обследования по капитальному ремонту элементов здания": template.get("Выполнение рекомендаций предыдущего обследования по капитальному ремонту элементов здания", {}),
        "РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ": fill_inspection_results(text, template, df),
        "Дополнительные данные": "",
        "ВЫВОДЫ ПО РЕЗУЛЬТАТАМ ОБСЛЕДОВАНИЯ": extract_conclusions(text)
    }


def extract_reports_from_text(text: str) -> List[str]:
    """Извлекает отдельные отчеты из текста (если их несколько)."""
    report_patterns = [
        r'ОТЧЕТ\s+№\s*\d+',
        r'РЕГИСТРАЦИОННЫЙ\s+№',
        r'ООО\s*«[^»]+»',
    ]
    
    reports = []
    
    for pattern in report_patterns:
        matches = list(re.finditer(pattern, text, re.IGNORECASE))
        if matches:
            if len(matches) > 1:
                for j in range(len(matches)):
                    start = matches[j].start()
                    end = matches[j + 1].start() if j + 1 < len(matches) else len(text)
                    reports.append(text[start:end])
                break
    
    if not reports:
        reports = [text]
    
    return reports


def main():
    """Основная функция."""
    if len(sys.argv) < 2:
        print("Использование: python parser.py <путь_к_PDF> [путь_для_сохранения]", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    template_path = Path(__file__).parent / "template.json"
    
    if not Path(pdf_path).exists():
        print(f"❌ Ошибка: Файл {pdf_path} не найден", file=sys.stderr)
        sys.exit(1)
    
    if not template_path.exists():
        print(f"❌ Ошибка: Шаблон {template_path} не найден", file=sys.stderr)
        sys.exit(1)
    
    try:
        template = load_template(str(template_path))
        
        # Читаем текст и пытаемся создать DataFrame
        text = read_pdf_text(pdf_path)
        text = normalize_text(text)
        df = read_pdf_as_dataframe(pdf_path) if USE_PANDAS else None
        
        # Извлекаем отдельные отчеты
        report_texts = extract_reports_from_text(text)
        
        # Парсим каждый отчет
        parsed_reports = []
        for i, report_text in enumerate(report_texts):
            try:
                parsed_data = create_final_object(report_text, template, df)
                if len(report_texts) > 1:
                    parsed_data["_report_number"] = i + 1
                parsed_reports.append(parsed_data)
            except Exception as e:
                print(f"⚠️ Ошибка при парсинге отчета {i+1}: {e}", file=sys.stderr)
                continue
        
        if not parsed_reports:
            parsed_reports = [create_final_object(text, template, df)]
        
        # Формируем JSON результат
        result_json = json.dumps(parsed_reports, ensure_ascii=False, indent=2)
        
        # Сохранение или вывод
        if len(sys.argv) >= 3:
            output_path = sys.argv[2]
            try:
                output_file = Path(output_path)
                output_file.parent.mkdir(parents=True, exist_ok=True)
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(result_json)
                print(f"✅ Результат сохранен в: {output_path}", file=sys.stderr)
            except Exception as e:
                print(f"⚠️ Не удалось сохранить в файл {output_path}: {e}", file=sys.stderr)
                print(result_json)
        else:
            print(result_json)
        
    except Exception as e:
        print(f"❌ Ошибка при парсинге: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
