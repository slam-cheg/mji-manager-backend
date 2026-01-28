import sys
import json
import re
from pathlib import Path
import pandas as pd
import re


# --- ДОЧЕРНИЕ ФУНКЦИИ ПАРСЕРА ---
def parse_roof_section(df, template_roof):
    result = json.loads(json.dumps(template_roof))
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    start_row = None
    for i in range(len(df)):
        val = str(df.iloc[i, 0]).strip().lower() if not pd.isna(df.iloc[i, 0]) else ""
        if val == "крыша":
            start_row = i
            log(f"\U0001f50d Найдена строка 'Крыша' на {i} строке")
            break

    if start_row is None:
        log("\u274c Строка 'Крыша' не найдена")
        return result, log_output

    row = start_row + 1
    col = 0

    result["Конструкция крыши"] = (
        str(df.iloc[row, col]).strip() if not pd.isna(df.iloc[row, col]) else ""
    )
    log(f"[{row}, A] Конструкция крыши: {result['Конструкция крыши']}")
    row += 1

    while row < len(df):
        val = str(df.iloc[row, col]) if not pd.isna(df.iloc[row, col]) else ""
        log(f"[{row}, A] '{val}'")

        if ":" in val:
            log(f"⏭ Пропускаем '{val}' (метка, не вложенный элемент)")
            row += 1
            continue

        result["Материал кровли"] = val.strip()
        log(f"Материал кровли: {val.strip()}")
        row += 1

        val2 = str(df.iloc[row, col]) if not pd.isna(df.iloc[row, col]) else ""
        match = re.search(r"(\d+[.,]?\d*)", val2)
        if match:
            result["Площадь кровли, м²"] = float(match.group(1).replace(",", "."))
            log(
                f"📏 Площадь кровли, м²: {result['Площадь кровли, м²']} (из строки '{val2}')"
            )
        else:
            log(f"⚠ Не удалось извлечь площадь из: '{val2}'")
        row += 1
        break

    current_nested = None
    for r in range(start_row, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )
        if first_col_value == "водоотвод":
            log(f"✅ Достигнут элемент 'Водоотвод', прекращаем обработку крыши")
            break

        for c in [1, 2]:
            if c >= len(df.columns):
                continue
            val = str(df.iloc[r, c]) if not pd.isna(df.iloc[r, c]) else ""
            if not val:
                continue

            log(f"[{r}, {chr(65+c)}] '{val}'")

            if ":" in val:
                key, description = val.split(":", 1)
                key = key.strip()
                if key in result:
                    result[key]["Описание дефектов"] = description.strip()
                    result[key]["Оц. по пред. обсл."] = (
                        str(df.iloc[r, 4])
                        if len(df.columns) > 4 and not pd.isna(df.iloc[r, 4])
                        else ""
                    )
                    result[key]["% деф. части"] = (
                        int(df.iloc[r, 5])
                        if len(df.columns) > 5
                        and not pd.isna(df.iloc[r, 5])
                        and str(df.iloc[r, 5]).isdigit()
                        else 0
                    )
                    result[key]["Оценка"] = (
                        str(df.iloc[r, 6])
                        if len(df.columns) > 6 and not pd.isna(df.iloc[r, 6])
                        else ""
                    )
                    log(f"🟩 Вложенный элемент '{key}': {result[key]}")
                    current_nested = key
            elif current_nested:
                result[current_nested]["Описание дефектов"] += " " + val.strip()
                log(f"➕ Дополнение к описанию '{current_nested}': {val.strip()}")

    return result, log_output


def parse_vodootvod_section(df, template_vodootvod, start_row):
    result = json.loads(json.dumps(template_vodootvod))
    row = start_row

    result["Тип водоотвода"] = (
        str(df.iloc[row + 1, 0]).strip() if not pd.isna(df.iloc[row + 1, 0]) else ""
    )
    result["Материал водоотвода"] = (
        str(df.iloc[row + 3, 0]).strip() if not pd.isna(df.iloc[row + 3, 0]) else ""
    )
    result["Описание дефектов"] = (
        str(df.iloc[row, 1]).strip() if not pd.isna(df.iloc[row, 1]) else ""
    )
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )
    result["% деф. части"] = (
        int(df.iloc[row, 5])
        if not pd.isna(df.iloc[row, 5]) and str(df.iloc[row, 5]).isdigit()
        else 0
    )
    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    current_row = row + 1
    while current_row < len(df):
        next_key = (
            str(df.iloc[current_row, 0]).strip().lower()
            if not pd.isna(df.iloc[current_row, 0])
            else ""
        )
        if next_key in ("межпанельные стыки", "фасад", "балконы"):
            break

        for c in [1, 2]:
            val = (
                str(df.iloc[current_row, c])
                if not pd.isna(df.iloc[current_row, c])
                else ""
            )
            if val:
                result["Описание дефектов"] += " " + val.strip()

        current_row += 1

    return result


def parse_styki_section(df, template_styki, row):
    result = json.loads(json.dumps(template_styki))

    result["Тип стыков"] = (
        str(df.iloc[row + 2, 0]).strip() if not pd.isna(df.iloc[row + 2, 0]) else ""
    )
    result["Описание дефектов"] = (
        str(df.iloc[row, 1]).strip() if not pd.isna(df.iloc[row, 1]) else ""
    )
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )
    result["% деф. части"] = (
        int(df.iloc[row, 5])
        if not pd.isna(df.iloc[row, 5]) and str(df.iloc[row, 5]).isdigit()
        else 0
    )
    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    current_row = row + 1
    while current_row < len(df):
        next_key = (
            str(df.iloc[current_row, 0]).strip().lower()
            if not pd.isna(df.iloc[current_row, 0])
            else ""
        )
        if next_key in ("фасад", "балконы", "стены"):
            break

        for c in [1, 2]:
            val = (
                str(df.iloc[current_row, c])
                if not pd.isna(df.iloc[current_row, c])
                else ""
            )
            if val:
                result["Описание дефектов"] += " " + val.strip()

        current_row += 1

    return result


def parse_fasad_section(df, template_fasad, row):
    result = json.loads(json.dumps(template_fasad))
    result["Площадь фасада, м²"] = (
        float(
            re.search(r"(\d+[.,]?\d*)", str(df.iloc[row + 1, 0]))
            .group(1)
            .replace(",", ".")
        )
        if not pd.isna(df.iloc[row + 1, 0])
        else 0
    )

    def extract_text(start, end_keys):
        text = ""
        current_row = start
        while current_row < len(df):
            val = (
                str(df.iloc[current_row, 0])
                if not pd.isna(df.iloc[current_row, 0])
                else ""
            )
            if any(key in val.lower() for key in end_keys):
                break
            text += " " + val.strip()
            current_row += 1
        return text.strip(), current_row

    result["Отделка стен"], next_row = extract_text(row + 3, ["отделка цоколя"])
    result["Отделка цоколя"], next_row = extract_text(next_row + 1, ["оконные заполне"])
    result["Оконные заполнения"], next_row = extract_text(
        next_row + 1, ["балконы", "следующий элемент"]
    )

    result["Описание дефектов"] = (
        str(df.iloc[row, 1]).strip() if not pd.isna(df.iloc[row, 1]) else ""
    )
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )
    result["% деф. части"] = (
        int(df.iloc[row, 5])
        if not pd.isna(df.iloc[row, 5]) and str(df.iloc[row, 5]).isdigit()
        else 0
    )
    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    return result


def parse_balkony_section(df, template_balkony, row):
    result = json.loads(json.dumps(template_balkony))
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    log(f"➡ Обработка элемента 'Балконы' на строке {row}")

    # Функция для извлечения числа из строки (например, "95 шт." → 95)
    def extract_number(cell_value):
        match = re.search(r"(\d+)", str(cell_value))
        return int(match.group(1)) if match else 0

    # Читаем числовые характеристики из столбца A
    current_row = row + 1
    while current_row < len(df):
        val = (
            str(df.iloc[current_row, 0]) if not pd.isna(df.iloc[current_row, 0]) else ""
        )

        # Если наткнулись на новый элемент (например, "Лестницы"), выходим
        if val.lower() in ["лестницы", "следующий элемент"]:
            log(f"✅ Достигнут следующий раздел, завершаем обработку 'Балконы'")
            break

        # Сопоставляем данные
        if "шт." in val:
            prev_val = (
                str(df.iloc[current_row - 1, 0]).strip().lower()
                if current_row > 0
                else ""
            )

            if prev_val == "балконы":
                result["Количество балконов"] = extract_number(val)
            elif prev_val == "лоджии:":
                result["Количество лоджий"] = extract_number(val)
            elif prev_val == "- над входами:":
                result["Козырьков над входами"] = extract_number(val)
            elif prev_val == "- над лоджиями /":
                next_val = (
                    str(df.iloc[current_row + 1, 0]).strip().lower()
                    if current_row + 1 < len(df)
                    else ""
                )
                if next_val == "балконами верхних":
                    current_row += 1  # Пропускаем строку "балконами верхних"
                result["Козырьков на верхних этажах"] = extract_number(val)
            elif prev_val == "- непроектные:":
                result["Козырьков непроектных"] = extract_number(val)
            elif prev_val == "эркеры:":
                result["Количество эркеров"] = extract_number(val)

        current_row += 1

    # 🔹 Парсим вложенные элементы (дефекты, оценки, проценты)
    current_nested = None
    for r in range(row, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )
        if first_col_value in ["лестницы", "следующий элемент"]:
            log(f"✅ Достигнут следующий раздел, завершаем обработку 'Балконы'")
            break

        for c in [1, 2]:
            if c >= len(df.columns):
                continue
            val = str(df.iloc[r, c]) if not pd.isna(df.iloc[r, c]) else ""
            if not val:
                continue

            log(f"[{r}, {chr(65+c)}] '{val}'")

            if ":" in val:
                key, description = val.split(":", 1)
                key = key.strip()
                if key in result:
                    result[key]["Описание дефектов"] = description.strip()
                    result[key]["Оц. по пред. обсл."] = (
                        str(df.iloc[r, 4]) if not pd.isna(df.iloc[r, 4]) else ""
                    )
                    result[key]["% деф. части"] = (
                        int(df.iloc[r, 5])
                        if not pd.isna(df.iloc[r, 5]) and str(df.iloc[r, 5]).isdigit()
                        else 0
                    )
                    result[key]["Оценка"] = (
                        str(df.iloc[r, 6]) if not pd.isna(df.iloc[r, 6]) else ""
                    )
                    log(f"🟩 Вложенный элемент '{key}': {result[key]}")
                    current_nested = key
            elif current_nested:
                result[current_nested]["Описание дефектов"] += " " + val.strip()
                log(f"➕ Дополнение к описанию '{current_nested}': {val.strip()}")

    log(f"📊 Итоговые характеристики балконов: {result}")

    return result


def parse_steny_section(df, template_steny, start_row):
    result = json.loads(json.dumps(template_steny))
    row = start_row

    # 🏗️ Читаем "Материал"
    material_row = row + 1
    if "материал" in str(df.iloc[material_row, 0]).lower():
        material_row += 1
    result["Материал"] = (
        str(df.iloc[material_row, 0]).strip()
        if not pd.isna(df.iloc[material_row, 0])
        else ""
    )

    # 🏗️ Читаем "Теплофизические свойства"
    heat_props_row = material_row + 1
    if "теплофизические" in str(df.iloc[heat_props_row, 0]).lower():
        heat_props_row += 1
    if "свойства" in str(df.iloc[heat_props_row, 0]).lower():
        heat_props_row += 1
    result["Теплофизические свойства"] = (
        str(df.iloc[heat_props_row, 0]).strip()
        if not pd.isna(df.iloc[heat_props_row, 0])
        else ""
    )

    # 🏗️ Читаем **описание дефектов** (столбцы C-D объединены, много строк)
    description = []
    current_row = row

    while current_row < len(df):
        val_c = (
            str(df.iloc[current_row, 2]).strip()
            if not pd.isna(df.iloc[current_row, 2])
            else ""
        )
        if val_c:
            description.append(val_c)  # Добавляем все строки
        else:
            break  # Остановить, если достигли пустой строки
        current_row += 1

    result["Описание дефектов"] = " ".join(description).strip()

    # 🏗️ Читаем **оценки и проценты** (столбцы E, F, G)
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )

    # 🔥 ФИКС ПРОЦЕНТА: Проверяем, что значение является числом!
    percent_def = df.iloc[row, 5]
    try:
        result["% деф. части"] = (
            int(float(str(percent_def).replace(",", ".")))
            if not pd.isna(percent_def)
            else 0
        )
    except ValueError:
        result["% деф. части"] = 0  # Если не число, оставляем 0

    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    return result


def parse_podval_section(df, template_podval, start_row):
    result = json.loads(json.dumps(template_podval))
    row = start_row

    # 🔹 Записываем "Наличие подвала" (оно всегда есть в строке под названием элемента)
    result["Наличие подвала"] = (
        str(df.iloc[row + 1, 0]).strip() if not pd.isna(df.iloc[row + 1, 0]) else ""
    )

    # Если в ячейке под названием элемента написано "Отсутствует", то парсинг останавливается
    if "отсутствует" in result["Наличие подвала"].lower():
        print(f"⛔ Подвал отсутствует на строке {row + 1}, пропускаем обработку.")
        return result  # Вернем пустую структуру, но с заполненным "Наличие подвала"

    # 📏 Читаем площадь подвала (если есть)
    podval_area_row = row + 2
    area_str = (
        str(df.iloc[podval_area_row, 0]).strip()
        if not pd.isna(df.iloc[podval_area_row, 0])
        else ""
    )
    match = re.search(r"(\d+)\s?кв.м", area_str)
    result["Площадь, м²"] = int(match.group(1)) if match else 0

    # 📌 Читаем **описание дефектов** (из объединенных ячеек, как у стен)
    description = []
    current_row = row
    while current_row < len(df):
        val_c = (
            str(df.iloc[current_row, 2]).strip()
            if not pd.isna(df.iloc[current_row, 2])
            else ""
        )
        if val_c:
            description.append(val_c)  # Добавляем строку в описание
        else:
            break  # Останавливаемся, если пустая строка
        current_row += 1

    result["Описание дефектов"] = " ".join(description).strip()

    # 🏗️ Читаем **оценки и проценты**
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )

    # 🔥 ФИКС ПРОЦЕНТА
    percent_def = df.iloc[row, 5]
    try:
        result["% деф. части"] = (
            int(float(str(percent_def).replace(",", ".")))
            if not pd.isna(percent_def)
            else 0
        )
    except ValueError:
        result["% деф. части"] = 0

    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    return result


def parse_tech_podpolye_section(df, template_tech_podpolye, row):
    result = json.loads(json.dumps(template_tech_podpolye))

    # Записываем наличие тех.подполья
    result["Наличие тех.подполья"] = (
        str(df.iloc[row + 1, 0]).strip() if not pd.isna(df.iloc[row + 1, 0]) else ""
    )

    # Если тех.подполье отсутствует или пусто — прекращаем парсинг
    if (
        not result["Наличие тех.подполья"]
        or "отсутствует" in result["Наличие тех.подполья"].lower()
    ):
        print(f"⏭ Тех. подполье отсутствует — пропуск")
        return result

    # Описание дефектов (объединенные ячейки, как в стенах)
    description = str(df.iloc[row, 2]).strip() if not pd.isna(df.iloc[row, 2]) else ""
    current_row = row + 1
    while current_row < len(df):
        desc_value = (
            str(df.iloc[current_row, 2]).strip()
            if not pd.isna(df.iloc[current_row, 2])
            else ""
        )
        if desc_value:
            description += " " + desc_value
        else:
            break  # Если строка пустая, прекращаем дополнять
        current_row += 1
    result["Описание дефектов"] = description.strip()

    # Оценки и процент дефектов (как в стенах)
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )

    # 🔥 ФИКС ПРОЦЕНТА: Аналогия со стенами
    percent_def = df.iloc[row, 5]
    try:
        result["% деф. части"] = (
            int(float(str(percent_def).replace(",", ".")))
            if not pd.isna(percent_def)
            else 0
        )
    except ValueError:
        result["% деф. части"] = 0  # Если не число, оставляем 0

    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    return result


def parse_tech_etazh_section(df, template_tech_etazh, row):
    result = json.loads(json.dumps(template_tech_etazh))

    # Записываем наличие тех. этажа
    result["Наличие тех.этажа"] = (
        str(df.iloc[row + 1, 0]).strip() if not pd.isna(df.iloc[row + 1, 0]) else ""
    )

    # Если тех. этаж отсутствует, прекращаем парсинг
    if (
        not result["Наличие тех.этажа"]
        or "отсутствует" in result["Наличие тех.этажа"].lower()
    ):
        print(f"⏭ Тех. этаж отсутствует — пропуск")
        return result

    # Местонахождение этажа (если оно есть)
    next_row = row + 2  # "Местонахождение:" находится на строке ниже
    if next_row < len(df):
        result["Местонахождение, этаж"] = (
            str(df.iloc[next_row, 0]).strip()
            if not pd.isna(df.iloc[next_row, 0])
            else ""
        )

    # Описание дефектов (из столбца C-D)
    description = ""
    current_row = row
    while current_row < len(df):
        desc_value = (
            str(df.iloc[current_row, 2]).strip()
            if not pd.isna(df.iloc[current_row, 2])
            else ""
        )
        if desc_value:
            description += " " + desc_value
        else:
            break  # Если строка пустая, прекращаем дополнять
        current_row += 1
    result["Описание дефектов"] = description.strip()

    # Оценки и процент дефектов
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )
    result["% деф. части"] = (
        int(df.iloc[row, 5])
        if not pd.isna(df.iloc[row, 5]) and str(df.iloc[row, 5]).isdigit()
        else 0
    )
    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    return result


def parse_garage_section(df, template_garage, row):
    result = json.loads(json.dumps(template_garage))

    # 📌 Название элемента многострочное, объединяем
    garage_type = (
        f"{str(df.iloc[row, 0]).strip()} {str(df.iloc[row + 1, 0]).strip()}".strip()
    )
    result["Тип"] = (
        str(df.iloc[row + 2, 0]).strip() if not pd.isna(df.iloc[row + 2, 0]) else ""
    )

    # 🛑 Если гараж-стоянка отсутствует, прекращаем обработку
    if not result["Тип"] or "отсутствует" in result["Тип"].lower():
        print(f"⏭ Гараж-стоянка отсутствует — пропуск")
        return result

    # 📏 Заполняем основные параметры
    result["Площадь,м²"] = extract_numeric_value(df.iloc[row + 4, 0])  # "Площадь:"
    result["Этажность, эт"] = extract_numeric_value(df.iloc[row + 6, 0])  # "Этажность:"
    result["Количество маш.мест, шт"] = extract_numeric_value(
        df.iloc[row + 8, 0]
    )  # "Количество маш.мест:"

    # 🏗️ Описание дефектов (аналогично другим элементам)
    description = str(df.iloc[row, 2]).strip() if not pd.isna(df.iloc[row, 2]) else ""
    current_row = row + 1
    while current_row < len(df):
        desc_value = (
            str(df.iloc[current_row, 2]).strip()
            if not pd.isna(df.iloc[current_row, 2])
            else ""
        )
        if desc_value:
            description += " " + desc_value
        else:
            break  # Если строка пустая, прекращаем дополнять
        current_row += 1
    result["Описание дефектов"] = description.strip()

    # 🔥 Парсим оценки и процент (как в стенах)
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )

    percent_def = df.iloc[row, 5]
    try:
        result["% деф. части"] = (
            int(float(str(percent_def).replace(",", ".")))
            if not pd.isna(percent_def)
            else 0
        )
    except ValueError:
        result["% деф. части"] = 0

    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    return result


def extract_numeric_value(cell_value):
    """Функция извлекает числовое значение из строки, если есть"""
    try:
        match = re.search(r"(\d+)", str(cell_value))
        return int(match.group(1)) if match else 0
    except (ValueError, AttributeError):
        return 0


def parse_common_areas_section(df, template_common_areas, row):
    result = json.loads(json.dumps(template_common_areas))
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    log(f"➡ Обработка элемента 'Места общего пользования' на строках {row}, {row+1}")

    # 🔹 Функция для извлечения чисел (например, "95 шт." → 95)
    def extract_number(cell_value):
        match = re.search(r"(\d+)", str(cell_value))
        return int(match.group(1)) if match else 0

    # 🔹 Парсим числовые характеристики (количество пандусов, сходов)
    result["Пандусы наружные, шт"] = extract_number(df.iloc[row + 1, 0])
    result["Пандусы внутренние, шт"] = extract_number(df.iloc[row + 3, 0])
    result["Сходы-съезды, шт."] = extract_number(df.iloc[row + 5, 0])

    # 🔹 Парсим вложенные элементы (дефекты, оценки, проценты)
    current_nested = None
    for r in range(row, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )
        if first_col_value in ["лестницы", "перекрытия", "следующий элемент"]:
            log(
                f"✅ Достигнут следующий раздел, завершаем обработку 'Места общего пользования'"
            )
            break

        for c in [1, 2]:  # 🔥 Дефекты находятся в объединенных ячейках C-D
            if c >= len(df.columns):
                continue
            val = str(df.iloc[r, c]).strip() if not pd.isna(df.iloc[r, c]) else ""
            if not val:
                continue

            log(f"[{r}, {chr(65+c)}] '{val}'")

            if ":" in val:
                key, description = val.split(":", 1)
                key = key.strip()
                if key in result:
                    result[key]["Описание дефектов"] = description.strip()
                    result[key]["Оц. по пред. обсл."] = (
                        str(df.iloc[r, 4]) if not pd.isna(df.iloc[r, 4]) else ""
                    )

                    # 🔥 ФИКС ПРОЦЕНТА
                    percent_def = df.iloc[r, 5]
                    try:
                        result[key]["% деф. части"] = (
                            int(float(str(percent_def).replace(",", ".")))
                            if not pd.isna(percent_def)
                            else 0
                        )
                    except ValueError:
                        result[key]["% деф. части"] = 0

                    result[key]["Оценка"] = (
                        str(df.iloc[r, 6]) if not pd.isna(df.iloc[r, 6]) else ""
                    )
                    log(f"🟩 Вложенный элемент '{key}': {result[key]}")
                    current_nested = key
            elif current_nested:
                result[current_nested]["Описание дефектов"] += " " + val.strip()
                log(f"➕ Дополнение к описанию '{current_nested}': {val.strip()}")

    log(f"📊 Итоговые данные для 'Мест общего пользования': {result}")

    return result


def parse_stairs_section(df, template_stairs, row):
    result = json.loads(json.dumps(template_stairs))
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    log(f"➡ Обработка элемента 'Лестницы' на строке {row}")

    # 🔹 Конструкция лестниц (ячейка под названием элемента)
    result["Конструкция"] = (
        str(df.iloc[row + 1, 0]).strip() if not pd.isna(df.iloc[row + 1, 0]) else ""
    )

    # 🔹 Описание дефектов (объединенные ячейки C-D)
    result["Описание дефектов"] = (
        str(df.iloc[row, 2]).strip() if not pd.isna(df.iloc[row, 2]) else ""
    )

    # 🔹 Оценки и проценты (столбцы E, F, G)
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )

    # 🔥 ФИКС ПРОЦЕНТА (учитываем возможные ошибки формата)
    percent_def = df.iloc[row, 5]
    try:
        result["% деф. части"] = (
            int(float(str(percent_def).replace(",", ".")))
            if not pd.isna(percent_def)
            else 0
        )
    except ValueError:
        result["% деф. части"] = 0

    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    # 🔹 Дополняем описание дефектов строками ниже (если есть)
    current_row = row + 1
    while current_row < len(df):
        next_a = (
            str(df.iloc[current_row, 0]).strip()
            if not pd.isna(df.iloc[current_row, 0])
            else ""
        )

        # Если наткнулись на новый элемент (например, "Перекрытия"), завершаем парсинг
        if next_a:
            log(f"✅ Достигнут следующий раздел, завершаем обработку 'Лестницы'")
            break

        # 🔥 Дополняем описание дефектов (столбцы C-D)
        for c in [2, 3]:
            val = (
                str(df.iloc[current_row, c]).strip()
                if not pd.isna(df.iloc[current_row, c])
                else ""
            )
            if val:
                result["Описание дефектов"] += " " + val
                log(f"➕ Дополнение к описанию 'Лестницы': {val}")

        current_row += 1

    log(f"📊 Итоговые данные для 'Лестницы': {result}")

    return result


def parse_perekrytiya_section(df, template_perekrytiya, row):
    result = json.loads(json.dumps(template_perekrytiya))
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    log(f"➡ Обработка элемента 'Перекрытия' на строке {row}")

    # 🔹 Материал перекрытия (ячейка под названием элемента)
    result["Материал перекрытия"] = (
        str(df.iloc[row + 1, 0]).strip() if not pd.isna(df.iloc[row + 1, 0]) else ""
    )

    # 🔹 Описание дефектов (ячейка с объединением C-D)
    result["Описание дефектов"] = (
        str(df.iloc[row, 2]).strip() if not pd.isna(df.iloc[row, 2]) else ""
    )

    # 🔹 Оценки и проценты
    result["Оц. по пред. обсл."] = (
        str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
    )

    # 🔥 ФИКС ПРОЦЕНТА
    percent_def = df.iloc[row, 5]
    try:
        result["% деф. части"] = (
            int(float(str(percent_def).replace(",", ".")))
            if not pd.isna(percent_def)
            else 0
        )
    except ValueError:
        result["% деф. части"] = 0

    result["Оценка"] = (
        str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
    )

    # 🔹 Дополнение описания из строк ниже
    current_row = row + 1
    while current_row < len(df):
        next_a = (
            str(df.iloc[current_row, 0]).strip()
            if not pd.isna(df.iloc[current_row, 0])
            else ""
        )
        if next_a:
            log(f"✅ Достигнут следующий раздел, завершение 'Перекрытия'")
            break

        for c in [2, 3]:
            val = (
                str(df.iloc[current_row, c]).strip()
                if not pd.isna(df.iloc[current_row, c])
                else ""
            )
            if val:
                result["Описание дефектов"] += " " + val
                log(f"➕ Дополнение описания 'Перекрытия': {val}")

        current_row += 1

    log(f"📊 Итог по 'Перекрытиям': {result}")
    return result


def parse_heating_system_section(df, template_section, row_start):
    result = json.loads(json.dumps(template_section))  # deep copy шаблона
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    def fill_merged_cells(df):
        df_filled = df.copy()
        for col in df_filled.columns:
            last_val = ""
            for i in range(len(df_filled)):
                cell = df_filled.at[i, col]
                if pd.isna(cell) or str(cell).strip() == "":
                    df_filled.at[i, col] = last_val
                else:
                    last_val = df_filled.at[i, col]
        return df_filled

    def extract_number(cell_value):
        match = re.search(r"(\d+)", str(cell_value))
        return int(match.group(1)) if match else 0

    df = fill_merged_cells(df)

    log(
        f"➡ Обработка элемента 'Система отопления' на строках {row_start}, {row_start+1}"
    )

    # 🔹 Карта соответствий
    field_map = [
        ("Материал трубопроводов", r"трубопровод[а-я]+"),
        ("Тип приборов", r"прибор[а-я]+"),
        ("Терморегуляторы квартирные", r"терморегулятор[а-я ]*квартирн"),
        ("АУУ (автоматизированный узел управления)", r"АУУ"),
        ("ОДУУ (общедомовой узел учёта)", r"ОДУУ"),
        ("Элеваторный узел", r"элеваторный узел"),
        ("Тепловой узел", r"тепловой узел"),
        ("Тип стояков", r"тип стояков"),
    ]
    found_fields = set()

    # 🔹 Поиск начала блока характеристик и явная вставка "Вид отопления"
    characteristics_started = False
    current_field = None
    r = row_start + 1
    while r < len(df):
        val_raw = str(df.iloc[r, 0]) if not pd.isna(df.iloc[r, 0]) else ""
        val_norm = re.sub(r"[\n\r\-]+", " ", val_raw).strip().lower()

        if "система гвс" in val_norm:
            break

        # Явная вставка "Вид отопления" на второй строке
        if not characteristics_started:
            result["Вид отопления"] = val_raw.strip()
            log(f"📌 Найдено поле 'Вид отопления' = '{result['Вид отопления']}'")
            characteristics_started = True
            r += 1
            continue

        matched = False
        for field_name, pattern in field_map:
            if field_name in found_fields:
                continue

            if re.search(pattern, val_norm):
                next_val = ""
                if ":" in val_raw:
                    next_val = (
                        str(df.iloc[r + 1, 0])
                        if r + 1 < len(df) and not pd.isna(df.iloc[r + 1, 0])
                        else ""
                    )
                else:
                    next_val = str(df.iloc[r, 0])

                if "шт" in next_val.lower():
                    result[field_name] = extract_number(next_val)
                else:
                    result[field_name] = next_val.strip()

                log(f"📌 Найдено поле '{field_name}' = '{result[field_name]}'")
                found_fields.add(field_name)
                matched = True
                break

        if matched:
            r += 2  # Пропускаем строку со значением
        else:
            r += 1

    # 🔹 Парсинг вложенных элементов (дефекты и оценки)
    current_nested = None
    for r in range(row_start, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )
        if "система гвс" in first_col_value:
            log("✅ Достигнут следующий раздел 'Система ГВС'. Завершаем парсинг.")
            break

        for c in [2]:  # столбец C
            if c >= len(df.columns):
                continue
            val = str(df.iloc[r, c]).strip() if not pd.isna(df.iloc[r, c]) else ""
            if not val:
                continue

            log(f"[{r}, {chr(65 + c)}] '{val}'")

            if ":" in val:
                key, description = val.split(":", 1)
                key = key.strip()
                if key in result:
                    result[key]["Описание дефектов"] = description.strip()
                    result[key]["Оц. по пред. обсл."] = (
                        str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
                    )
                    percent_def = df.iloc[r, 5]
                    try:
                        result[key]["% деф. части"] = (
                            int(float(str(percent_def).replace(",", ".")))
                            if not pd.isna(percent_def)
                            else 0
                        )
                    except ValueError:
                        result[key]["% деф. части"] = 0
                    result[key]["Оценка"] = (
                        str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
                    )
                    log(f"🟩 Вложенный элемент '{key}': {result[key]}")
                    current_nested = key
            elif current_nested:
                result[current_nested]["Описание дефектов"] += " " + val.strip()
                log(f"➕ Дополнение к описанию '{current_nested}': {val.strip()}")

    log(f"📊 Итоговые данные для 'Система отопления': {result}")
    return result


def parse_hot_water_system_section(df, template_section, row_start):

    result = json.loads(json.dumps(template_section))  # deep copy шаблона
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    def extract_number(cell_value):
        match = re.search(r"(\d+)", str(cell_value))
        return int(match.group(1)) if match else 0

    log(f"➡ Обработка элемента 'Система ГВС' начиная со строки {row_start}")

    current_nested = None
    for r in range(row_start, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )
        if (
            "система водоотведения" in first_col_value
            or "система канализации" in first_col_value
        ):
            log("✅ Достигнут следующий раздел. Завершаем парсинг.")
            break

        for c in [2]:
            if c >= len(df.columns):
                continue
            val = str(df.iloc[r, c]).strip() if not pd.isna(df.iloc[r, c]) else ""
            if not val:
                continue

            log(f"[{r}, {chr(65 + c)}] '{val}'")

            if ":" in val:
                key, description = val.split(":", 1)
                key = key.strip()
                if key in result:
                    result[key]["Описание дефектов"] = description.strip()
                    result[key]["Оц. по пред. обсл."] = (
                        str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
                    )

                    percent_def = df.iloc[r, 5]
                    try:
                        result[key]["% деф. части"] = (
                            int(float(str(percent_def).replace(",", ".")))
                            if not pd.isna(percent_def)
                            else 0
                        )
                    except ValueError:
                        result[key]["% деф. части"] = 0

                    result[key]["Оценка"] = (
                        str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
                    )
                    log(f"🟩 Вложенный элемент '{key}': {result[key]}")
                    current_nested = key
            elif current_nested:
                result[current_nested]["Описание дефектов"] += " " + val.strip()
                log(f"➕ Дополнение к описанию '{current_nested}': {val.strip()}")

    log(f"📊 Итоговые данные для 'Система ГВС': {result}")
    return result


def parse_cold_water_system_section(df, template_section, row_start):

    result = json.loads(json.dumps(template_section))
    log_output = []

    def log(msg):
        print(msg)
        log_output.append(msg)

    def extract_number(cell_value):
        match = re.search(r"(\d+)", str(cell_value))
        return int(match.group(1)) if match else 0

    def get_clean_value(r, c):
        val = df.iloc[r, c]
        return str(val).strip() if not pd.isna(val) else ""

    log(f"➡ Обработка элемента 'Система ХВС' на строке {row_start}")

    # === Парсинг характеристик ===
    field_map = [
        ("Материал трубопроводов", r"трубопровод[а-я]+"),
        ("Трубопроводы", r"трубопроводы"),
        ("ОДУУ (общедомовой узел учёта)", r"ОДУУ"),
        ("Тип стояков", r"тип стояков"),
    ]

    found_fields = set()
    for r in range(row_start + 1, len(df)):
        a_val = get_clean_value(r, 0).replace("\n", " ").replace("-", "").lower()
        if "система водоотведения" in a_val:
            break
        for field_name, pattern in field_map:
            if field_name in found_fields:
                continue
            if re.search(pattern, a_val):
                next_val = get_clean_value(r + 1, 0)
                if "шт" in next_val:
                    result[field_name] = extract_number(next_val)
                else:
                    result[field_name] = next_val
                found_fields.add(field_name)
                log(f"📌 Найдено поле '{field_name}' = '{result[field_name]}'")

    # === Парсинг дефектов и оценок ===
    current_nested = None
    for r in range(row_start, len(df)):
        a_val = get_clean_value(r, 0).lower()
        if "система водоотведения" in a_val:
            log(
                "✅ Достигнут следующий раздел 'Система водоотведения'. Завершаем парсинг."
            )
            break

        val = get_clean_value(r, 2)
        if not val:
            continue

        log(f"[{r}, C] '{val}'")

        if ":" in val:
            key, description = val.split(":", 1)
            key = key.strip()
            if key in result:
                result[key]["Описание дефектов"] = description.strip()
                result[key]["Оц. по пред. обсл."] = get_clean_value(r, 4)
                try:
                    result[key]["% деф. части"] = int(
                        float(get_clean_value(r, 5).replace(",", "."))
                    )
                except ValueError:
                    result[key]["% деф. части"] = 0
                result[key]["Оценка"] = get_clean_value(r, 6)
                log(f"🟩 Вложенный элемент '{key}': {result[key]}")
                current_nested = key
        elif current_nested:
            result[current_nested]["Описание дефектов"] += " " + val
            log(f"➕ Дополнение к описанию '{current_nested}': {val}")

    log(f"📊 Итог по 'Система ХВС': {result}")
    return result


def parse_sewage_section(df, template_section, row_start):
    result = json.loads(json.dumps(template_section))
    current_key = None

    # Мапинг ключей
    defect_keys = {
        "тех.подполье/тех.этаж": "Тех.подполье/тех.этаж",
        "этажи": "Этажи",
        "вся система": "Вся система",
    }

    # Поиск характеристик
    for i in range(row_start, len(df)):
        val = str(df.iloc[i, 0]).strip().lower()

        if "материал" in val:
            result["Материал"] = str(df.iloc[i + 1, 0]).strip()
        if "тип стояков" in val:
            result["Тип стояков"] = str(df.iloc[i + 1, 0]).strip()

        if "мусоропровод" in val:
            break  # закончили канализацию

        # Обработка дефектов
        if not pd.isna(df.iloc[i, 2]):
            raw_text = str(df.iloc[i, 2]).strip().lower()

            for pattern, key in defect_keys.items():
                if raw_text.startswith(pattern):
                    current_key = key
                    description = raw_text.split(":", 1)[-1].strip()
                    result[current_key]["Описание дефектов"] = description
                    result[current_key]["Оц. по пред. обсл."] = str(
                        df.iloc[i, 5]
                    ).strip()
                    try:
                        percent_val = df.iloc[i, 7]
                        result[current_key]["% деф. части"] = int(
                            float(str(percent_val).replace(",", "."))
                        )
                    except:
                        result[current_key]["% деф. части"] = 0
                    result[current_key]["Оценка"] = str(df.iloc[i, 9]).strip()
                elif current_key:
                    # Дополнение к предыдущему описанию
                    result[current_key]["Описание дефектов"] += " " + raw_text

    return result


# Начать доработку необходимо с нее.
# Все функции которые выше - заполняют шаблон исправно.
# Отдельной! задачей потом обсудим рефакторинг всех функций для большей устойчивости к разному формату xlsx таблиц.


# Нужно дописать обработку
# "Мусоропроводы", "Связь с ОДС", "Вентиляция",
# "Система промывки и прочистки стволов мусоропроводов",
# "ОЗДС (охраннозащитная дератизационная система)", "Газоходы", "Лифты",
# "Подъёмное устройство для маломобильной группы населения",
# "Устройство для	автоматического	опускания лифта", "Система ЭС (ВРУ - вводнораспределительное устройство)",
# "ВКВ (второй кабельный ввод)",
# "АВР (автоматическое включение резервного питания)", "Система	ППАиДУ",
# "Система оповещения о пожаре", "Система ГС", "Система видеонаблюдения"





# НАШИ ФУНКЦИИ



def parse_musoroprovody_section(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))
    row = start_row
    col = 0
    found_row = None

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "мусоропроводы" in val:
            found_row = row
            next_row = row + 1
            result["Мусоропроводы"] = str(df.iloc[next_row, col]).strip() if not pd.isna(df.iloc[next_row, col]) else ""
            result["Мусорокамеры"] = str(df.iloc[next_row + 2, col]).strip() if not pd.isna(df.iloc[next_row + 2, col]) else ""
            row = next_row + 4
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "мусоропроводы" in first_col_value:

            # Описание дефектов
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip().replace("- ", "")

            # Оц. по пред. обсл.
            result["Оц. по пред. обсл."] = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 5]) else ""

            # Оценка
            result["Оценка"] = str(df.iloc[r, 9]).strip() if not pd.isna(df.iloc[r, 9]) else ""


            break

    # % деф. части — если в первой строке найдено число
    if found_row is not None:
        for c in range(df.shape[1]):
            cell = str(df.iloc[found_row, c]).strip()
            if re.search(r"\d+", cell):
                match = re.search(r"\d+([.,]\d+)?", cell)
                if match:
                    num_str = match.group().replace(",", ".")
                    try:
                        result["% деф. части"] = int(float(num_str))
                    except ValueError:
                        result["% деф. части"] = 0
                break

    if "% деф. части" not in result:
        result["% деф. части"] = 0

    return result




def parse_odc_connection(df, template_device, start_row):
    result = json.loads(
        json.dumps(template_device)
    )  

    row = start_row
    col = 0

    while row < len(df):
        val = (
            str(df.iloc[row, col]).strip().lower()
            if not pd.isna(df.iloc[row, col])
            else ""
        )

        if "связь с одс" in val:
            next_row = row + 1
            parts = []

            while next_row < len(df):
                cur_val = (
                    str(df.iloc[next_row, col]).strip()
                    if not pd.isna(df.iloc[next_row, col])
                    else ""
                )

                if "вентиляция" in cur_val.lower():
                    break

                if cur_val:  # Только непустые строки
                    parts.append(cur_val)

                next_row += 1

            result["Тип"] = " ".join(parts).strip().replace('- ', '').strip()
            row = next_row
            break

        row += 1



    for r in range(start_row, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )

        if "связь с одс" in first_col_value:


            # Описание дефектов (C)
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 6]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"




            result["Оценка"]["Пред."] = (
                str(df.iloc[r, 8]).strip() if not pd.isna(df.iloc[r, 8]) else ""
            )
            result["Оценка"]["Тек."] = (
                str(df.iloc[r, 10]).strip() if not pd.isna(df.iloc[r, 10]) else ""
            )

            break

    return result



def parse_ventilation(df, template_device, start_row):
    result = json.loads(
        json.dumps(template_device)
    ) 

    row = start_row
    col = 0

    while row < len(df):
        val = (
            str(df.iloc[row, col]).strip().lower()
            if not pd.isna(df.iloc[row, col])
            else ""
        )

        if "вентиляция" in val:
            next_row = row + 1

            row = (
                next_row + 2
            ) 
            break

        row += 1

    for r in range(start_row, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )

        if "вентиляция" in first_col_value:


            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip().replace(" В работоспособном состоянии", "")

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 6]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"


            

            result["Оценка"]["Пред."] = (
                str(df.iloc[r, 8]).strip() if not pd.isna(df.iloc[r, 8]) else ""
            )
            result["Оценка"]["Тек."] = (
                str(df.iloc[r, 10]).strip() if not pd.isna(df.iloc[r, 10]) else ""
            )

            break

    return result





def parse_ozds_section(df, template_section, start_row):
    result = template_section.copy()

    def get_full_label(r):
        lines = []
        for i in range(4):  
            val = (
                str(df.iloc[r + i, 0]).strip().lower()
                if not pd.isna(df.iloc[r + i, 0])
                else ""
            )
            if not val:
                break
            lines.append(val)
        return (
            " ".join(lines)
            .replace("\n", " ")
            .replace("-", " ")
            .replace("  ", " ")
            .strip()
        )

    for row in range(start_row, len(df)):
        label = get_full_label(row)
        if "охранно защитная дератизационная система" in label or "оздс" in label:
            value_row = row + 4
            result["Тип"] = (
                str(df.iloc[value_row, 0]).strip()
                if not pd.isna(df.iloc[value_row, 0])
                else ""
            )
            if result["Тип"] == "Наличие:":
                result["Тип"] = (
                    str(df.iloc[value_row+1, 0]).strip()
                if not pd.isna(df.iloc[value_row+1, 0])
                    else ""
            )



            desc = str(df.iloc[row, 2]).strip() if not pd.isna(df.iloc[row, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if row + offset < len(df):
                        extra = str(df.iloc[row + offset, 2]).strip() if not pd.isna(df.iloc[row + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[row, 4]).strip() if not pd.isna(df.iloc[row, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if row + offset < len(df):
                        extra = str(df.iloc[row + offset, 4]).strip() if not pd.isna(df.iloc[row + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[row, 6]).strip() if not pd.isna(df.iloc[row, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if row + offset < len(df):
                        extra = str(df.iloc[row + offset, 6]).strip() if not pd.isna(df.iloc[row + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"




            result["Оценка"]["Пред."] = (
                str(df.iloc[value_row, 8]).strip()
                if not pd.isna(df.iloc[value_row, 8])
                else ""
            )
            result["Оценка"]["Тек."] = (
                str(df.iloc[value_row, 10]).strip()
                if not pd.isna(df.iloc[value_row, 10])
                else ""
            )

            print(f"➡ Обработка 'ОЗДС' на строке {row}")
            print(f"[DEBUG] Тип: {result['Тип']}")
            break

    return result


def parse_gazohody_section(df, template_device, start_row):
    result = json.loads(
        json.dumps(template_device)
    )  

    row = start_row
    col = 0

    while row < len(df):
        val = (
            str(df.iloc[row, col]).strip().lower()
            if not pd.isna(df.iloc[row, col])
            else ""
        )

        if "газоходы" in val:
            next_row = row + 1

            result["Тип"] = (
                str(df.iloc[next_row, col]).strip()
                if not pd.isna(df.iloc[next_row, col])
                else ""
            )

            row = (
                next_row + 2
            )  
            break

        row += 1

    for r in range(start_row, len(df)):
        first_col_value = (
            str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        )

        if "газоходы" in first_col_value:




            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 6]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"




            result["Оценка"]["Пред."] = (
                str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            )
            result["Оценка"]["Тек."] = (
                str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""
            )

            break

    return result


def extract_number(cell_value):
    match = re.search(r"(\d+)", str(cell_value))
    return int(match.group(1)) if match else 0



def parse_lifts_section(df, template_lifts, start_row):
    result = json.loads(json.dumps(template_lifts)) 

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""

        if "лифты" in val:
            next_row = row + 1
            result["Пассажирские, шт"] = extract_number(df.iloc[next_row + 1, col]) if next_row + 1 < len(df) else 0
            result["Грузопассажирские, шт"] = extract_number(df.iloc[next_row + 3, col]) if next_row + 3 < len(df) else 0
            result["В т.ч. навесные, шт"] = extract_number(df.iloc[next_row + 5, col]) if next_row + 5 < len(df) else 0
            row = next_row + 6
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""

        if "лифты" in first_col_value:
            # result["Описание дефектов"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""


            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""


            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip().replace(" В работоспособном состоянии", "")

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 5]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 5]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"





            break

    return result



def parse_podjemnoe_ustroistvo(df, template_podjemnoe, start_row):
    result = json.loads(json.dumps(template_podjemnoe))

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "подъёмное" in val:
            next_row = row + 1

            if next_row + 4 < len(df):
                raw_qty = str(df.iloc[next_row + 4, col]).strip() if not pd.isna(df.iloc[next_row + 4, col]) else "0"
                result["Кол-во, шт"] = raw_qty.strip(" шт.")
            else:
                result["Кол-во, шт"] = "0"

            row = next_row + 2
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "подъёмное" in first_col_value:
            # result["Описание дефектов"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""





            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"



            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""

            break

    return result


def parse_automatic_lift_lowering_device(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "устройство для" in val:
            next_row = row + 1
            if next_row < len(df):
                result["Наличие"] = str(df.iloc[next_row + 2, col]).strip() if not pd.isna(df.iloc[next_row, col]) else ""
            row = next_row + 2
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "устройство для" in first_col_value:
            # result["Описание дефектов"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""



            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"



            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else "0"
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else "0"

            break

    return result


def parse_es(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0


    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "система эс" in val:
            next_row = row + 1

            if next_row < len(df):

                if next_row + 5 < len(df):
                    result["Размещение ВРУ"] = str(df.iloc[next_row + 5, col]).strip() if not pd.isna(df.iloc[next_row + 5, col]) else ""
                else:
                    result["Размещение ВРУ"] = ""

                if next_row + 7 < len(df):
                    raw_count = str(df.iloc[next_row + 7, col]).strip() if not pd.isna(df.iloc[next_row + 7, col]) else ""
                    result["Кол-во ВРУ"] = raw_count.strip(" шт.")
                else:
                    result["Кол-во ВРУ"] = ""

            row = next_row + 2
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "система эс" in first_col_value:
            # result["Описание дефектов"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""

            
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip().replace("- ", "")

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 5]) else ""

            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 4):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 5]) else ""
                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"





            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else "0"
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else "0"

            break

    return result









def parse_vkv(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0


    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "вкв (второй ка-" or "вкв (второй ка" in val:
            next_row = row + 1
            # Наличие
            if next_row + 1 < len(df):
                result["Наличие"] = (
                    str(df.iloc[next_row + 1, col]).strip()
                    if not pd.isna(df.iloc[next_row, col])
                    else ""
                )
            row = next_row + 2
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "вкв (второй ка-" or "вкв (второй ка" in first_col_value:
            result["Состояние"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""




            
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 5]) else ""

            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 4):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 5]) else ""
                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"




            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else "0"
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else "0"

            break

    return result


def parse_avr(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "авр (автомати" in val:
            next_row = row + 1
            if next_row + 3 < len(df):
                result["Наличие"] = (
                    str(df.iloc[next_row + 3, col]).strip()
                    if not pd.isna(df.iloc[next_row, col])
                    else ""
                )
            row = next_row + 2
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "авр (автомати" in first_col_value:
            result["Состояние"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""



            
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 5]) else ""

            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 4):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 5]) else ""
                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"





            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""

            break

    return result


def parse_ppaidu(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "система" in val: 
            next_row = row + 1
            if next_row + 1 < len(df):
                result["Тип"] = (
                    str(df.iloc[next_row + 1, col]).strip()
                    if not pd.isna(df.iloc[next_row + 3, col])
                    else ""
                )
            row = next_row + 2
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "система" in first_col_value:
            result["Состояние"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""




            
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 5]) else ""

            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 4):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 5]) else ""
                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"





            result["Оц. по пред. обсл."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            result["Оценка"] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""

            break

    return result


def parse_fire_alarm_system(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "система опове" in val:
            next_row = row + 1
            if next_row + 1 < len(df):
                result["Наличие"] = (
                    str(df.iloc[next_row + 1, col]).strip()
                    if not pd.isna(df.iloc[next_row + 3, col])
                    else ""
                )
            row = next_row + 2
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "система опове" in first_col_value:
            result["Состояние"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""




            
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"




            # Оценка: Пред.(G=6), Тек.(H=7)
            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""

            break

    return result


def parse_gs_system(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "система гс" in val:
            next_row = row + 1
            if next_row + 3 < len(df):
                result["Вводы"] = (
                    str(df.iloc[next_row + 1, col]).strip() if not pd.isna(df.iloc[next_row + 1, col]) else ""
                )
                result["Разводка"] = (
                    str(df.iloc[next_row + 3, col]).strip() if not pd.isna(df.iloc[next_row + 3, col]) else ""
                )
            row = next_row + 4
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "система гс" in first_col_value:
            result["Состояние"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""



            
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"



            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""

            break

    return result


def parse_video_surveillance_system(df, template_device, start_row):
    result = json.loads(json.dumps(template_device))

    row = start_row
    col = 0

    while row < len(df):
        val = str(df.iloc[row, col]).strip().lower() if not pd.isna(df.iloc[row, col]) else ""
        if "система видео" in val:
            next_row = row + 1
            if next_row + 2 < len(df) and not pd.isna(df.iloc[next_row + 2, col]):
                place_1 = str(df.iloc[next_row + 1, col]).strip() if not pd.isna(df.iloc[next_row + 1, col]) else ""
                place_2 = str(df.iloc[next_row + 2, col]).strip() if not pd.isna(df.iloc[next_row + 2, col]) else ""
                result["Место"] = f"{place_1} {place_2}".strip().replace("- ", "")
            else:
                result["Место"] = str(df.iloc[next_row + 1, col]).strip().replace("- ", "") if not pd.isna(df.iloc[next_row + 1, col]) else ""
            row = next_row + 3
            break
        row += 1

    for r in range(start_row, len(df)):
        first_col_value = str(df.iloc[r, 0]).strip().lower() if not pd.isna(df.iloc[r, 0]) else ""
        if "система видео" in first_col_value:
            result["Состояние"] = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""



            
            desc = str(df.iloc[r, 2]).strip() if not pd.isna(df.iloc[r, 2]) else ""
            if desc.lower() != "н/п":
                parts = [desc]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 2]).strip() if not pd.isna(df.iloc[r + offset, 2]) else ""
                        parts.append(extra)
                result["Описание дефектов"] = " ".join(filter(None, parts)).strip()

            # №№ и дата последнего обследования (E)
            date_val = str(df.iloc[r, 4]).strip() if not pd.isna(df.iloc[r, 4]) else ""
            if date_val.lower() != "н/п":
                parts = [date_val]
                for offset in range(1, 2):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 4]).strip() if not pd.isna(df.iloc[r + offset, 4]) else ""
                        parts.append(extra)
                result["№№ и дата последнего обследования"] = " ".join(filter(None, parts)).strip()
            else:
                result["№№ и дата последнего обследования"] = "н/п"

            # Специализированная орг-я (F)
            org_val = str(df.iloc[r, 5]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            
            if org_val.lower() != "н/п":
                parts = [org_val]
                for offset in range(1, 3):
                    if r + offset < len(df):
                        extra = str(df.iloc[r + offset, 5]).strip() if not pd.isna(df.iloc[r + offset, 6]) else ""

                        parts.append(extra)
                result["Специализированная орг-я"] = " ".join(filter(None, parts)).replace('- ', '').strip()
            else:
                result["Специализированная орг-я"] = "н/п"




            result["Оценка"]["Пред."] = str(df.iloc[r, 6]).strip() if not pd.isna(df.iloc[r, 6]) else ""
            result["Оценка"]["Тек."] = str(df.iloc[r, 7]).strip() if not pd.isna(df.iloc[r, 7]) else ""

            break

    return result


# --- МАСТЕР ФУНКЦИЯ ---
def parse_excel_report(file_path: str, template: dict):
    xls = pd.ExcelFile(file_path)
    parsed_reports = []
    current_report = None  # Текущий заполняемый отчет
    parsing_started = False  # Флаг начала парсинга

    for sheet_name in xls.sheet_names:
        df = xls.parse(sheet_name, header=None)
        print(f"\n===== Обработка листа: {sheet_name} =====")

        if not parsing_started:
            for i in range(len(df)):
                val = (
                    str(df.iloc[i, 0]).strip().lower()
                    if not pd.isna(df.iloc[i, 0])
                    else ""
                )
                if "результаты обследования" in val:
                    parsing_started = True
                    print(
                        f"✅ Обнаружен раздел 'Результаты обследования' на странице {sheet_name}, строка {i}"
                    )
                    break

        if not parsing_started:
            print("⏭ Пропуск листа, нет раздела 'Результаты обследования'\n")
            continue

        # Если новый лист, но рег. номер тот же — продолжаем дополнять отчет
        report_data = (
            current_report if current_report else json.loads(json.dumps(template))
        )

        # Проверяем наличие регистрационного номера
        for i in range(min(10, len(df))):
            for j in range(min(5, len(df.columns))):
                val = str(df.iloc[i, j]) if not pd.isna(df.iloc[i, j]) else ""
                match = re.search(r"С-\d{2}-\d{7}", val)
                if match:
                    reg_number = match.group()
                    if (
                        current_report
                        and current_report["Шапка"]["Регистрационный №"] == reg_number
                    ):
                        print(f"🔄 Продолжаем заполнять отчет для {reg_number}")
                    else:
                        print(f"🆕 Создаем новый отчет для {reg_number}")
                        report_data["Шапка"]["Регистрационный №"] = reg_number
                        current_report = report_data  # Устанавливаем как текущий отчет
                    break

        for row in range(len(df)):
            val = (
                str(df.iloc[row, 0]).strip().lower()
                if not pd.isna(df.iloc[row, 0])
                else ""
            )
            if "дополнительные данные" in val:
                print(
                    f"⛔ Достигнут раздел 'Дополнительные данные' на строке {row}. Сохраняем отчет."
                )
                parsed_reports.append(current_report)  
                current_report = None  
                parsing_started = False
                break

            if not current_report:
                continue

            if val == "крыша":
                print(f"➡ Обработка элемента 'Крыша' на строке {row}")
                roof_data, _ = parse_roof_section(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Крыша"]
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Крыша"] = roof_data

            if val == "водоотвод":
                print(f"➡ Обработка элемента 'Водоотвод' на строке {row}")
                vod_data = parse_vodootvod_section(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Водоотвод"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Водоотвод"] = vod_data

            next_val = (
                str(df.iloc[row + 1, 0]).strip().lower()
                if row + 1 < len(df) and not pd.isna(df.iloc[row + 1, 0])
                else ""
            )
            full_val = f"{val} {next_val}".strip()
            if full_val == "межпанельные стыки":
                print(
                    f"➡ Обработка элемента 'Межпанельные стыки' на строках {row}, {row+1}"
                )
                styki_data = parse_styki_section(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Межпанельные стыки"],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Межпанельные стыки"
                ] = styki_data

            if val == "фасад":
                print(f"➡ Обработка элемента 'Фасад' на строке {row}")
                fasad_data = parse_fasad_section(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Фасад"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Фасад"] = fasad_data

            if val == "балконы":
                print(f"➡ Обработка элемента 'Балконы' на строке {row}")
                balkony_data = parse_balkony_section(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Балконы"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Балконы"] = balkony_data

            if val == "стены":
                print(f"➡ Обработка элемента 'Стены' на строке {row}")
                steny_data = parse_steny_section(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Стены"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Стены"] = steny_data

            if val == "подвал":
                print(f"➡ Обработка элемента 'Подвал' на строке {row}")
                podval_data = parse_podval_section(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Подвал"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Подвал"] = podval_data

            if val == "тех. подполье":
                print(f"➡ Обработка элемента 'Тех. подполье' на строке {row}")
                tech_podpolye_data = parse_tech_podpolye_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Тех. подполье"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Тех. подполье"
                ] = tech_podpolye_data

            if val == "тех. этаж":
                print(f"➡ Обработка элемента 'Тех. этаж' на строке {row}")
                tech_etazh_data = parse_tech_etazh_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Тех. этаж"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Тех. этаж"] = tech_etazh_data

            next_val = (
                str(df.iloc[row + 1, 0]).strip().lower()
                if row + 1 < len(df) and not pd.isna(df.iloc[row + 1, 0])
                else ""
            )
            full_val = f"{val} {next_val}".strip()

            if full_val == "гараж-стоянка (подземный)":
                print(
                    f"➡ Обработка элемента 'Гараж-стоянка (подземный)' на строках {row}, {row+1}"
                )
                garage_data = parse_garage_section(
                    df,
                    template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Гараж-стоянка (подземный)"],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Гараж-стоянка (подземный)"
                ] = garage_data

            if full_val == "места общего пользования":
                print(
                    f"➡ Обработка элемента 'Места общего пользования' на строках {row}, {row+1}"
                )
                common_areas_data = parse_common_areas_section(
                    df,
                    template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Места общего пользования"],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Места общего пользования"
                ] = common_areas_data

            if val == "лестницы":
                print(f"➡ Обработка элемента 'Лестницы' на строке {row}")
                lestnicy_data = parse_stairs_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Лестницы"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Лестницы"] = lestnicy_data

            if val == "перекрытия":
                print(f"➡ Обработка элемента 'Перекрытия' на строке {row}")
                perekrytiya_data = parse_perekrytiya_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Перекрытия"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Перекрытия"] = perekrytiya_data

            val_raw = str(df.iloc[row, 0]) if not pd.isna(df.iloc[row, 0]) else ""
            next_val_raw = (
                str(df.iloc[row + 1, 0])
                if row + 1 < len(df) and not pd.isna(df.iloc[row + 1, 0])
                else ""
            )

            val = (
                val_raw.replace("-", "")
                .replace("–", "")
                .replace("\n", " ")
                .strip()
                .lower()
            )
            next_val = (
                next_val_raw.replace("-", "")
                .replace("–", "")
                .replace("\n", " ")
                .strip()
                .lower()
            )
            combined_val = f"{val} {next_val}".replace("  ", " ").strip()

            combined_flat = (
                combined_val.replace(" ", "")
                .replace("-", "")
                .replace("–", "")
                .replace("\n", "")
                .lower()
            )

            combined_label = (
                " ".join(
                    [
                        (
                            str(df.iloc[row, 0]).strip().lower()
                            if not pd.isna(df.iloc[row, 0])
                            else ""
                        ),
                        (
                            str(df.iloc[row + 1, 0]).strip().lower()
                            if row + 1 < len(df) and not pd.isna(df.iloc[row + 1, 0])
                            else ""
                        ),
                        (
                            str(df.iloc[row + 2, 0]).strip().lower()
                            if row + 2 < len(df) and not pd.isna(df.iloc[row + 2, 0])
                            else ""
                        ),
                        (
                            str(df.iloc[row + 3, 0]).strip().lower()
                            if row + 3 < len(df) and not pd.isna(df.iloc[row + 3, 0])
                            else ""
                        ),
                    ]
                )
                .replace("-", " ")
                .replace("–", " ")
                .replace("  ", " ")
            )

            if "системаотопления" in combined_flat:
                print(
                    f"➡ Обработка элемента 'Система отопления' на строках {row}, {row+1}"
                )
                heating_data = parse_heating_system_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система отопления"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Система отопления"
                ] = heating_data

            if val == "система гвс":
                print(f"➡ Обработка элемента 'Система ГВС' на строке {row}")
                gvs_data = parse_hot_water_system_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система ГВС"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система ГВС"] = gvs_data

            if val == "система хвс":
                print(f"➡ Обработка элемента 'Система ХВС' на строке {row}")
                khvs_data = parse_cold_water_system_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система ХВС"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система ХВС"] = khvs_data

            if val == "канализация":
                print(f"➡ Обработка элемента 'Канализация' на строке {row}")
                kanaliz_data = parse_sewage_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Канализация"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Канализация"] = kanaliz_data

            if val == "мусоропроводы":
                print(f"➡ Обработка элемента 'Мусоропроводы' на строке {row}")
                musor_data = parse_musoroprovody_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Мусоропроводы"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Мусоропроводы"] = musor_data

            if val == "вентиляция":
                print(f"➡ Обработка элемента 'Вентиляция' на строке {row}")
                ventilation_data = parse_ventilation(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Вентиляция"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Вентиляция"] = ventilation_data

            if (
                "охранно защитная дератизационная система" in combined_label
                or "оздс" in combined_label
            ):
                print(f"➡ Обработка элемента 'ОЗДС' начиная с {row}")
                ozds_data = parse_ozds_section(
                    df,
                    template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                        "ОЗДС (охранно-защитная дератизационная система)"
                    ],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "ОЗДС (охранно-защитная дератизационная система)"
                ] = ozds_data

            if val == "газоходы":
                print(f"➡ Обработка элемента 'Газоходы' на строке {row}")
                gaz_data = parse_gazohody_section(
                    df, template["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Газоходы"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Газоходы"] = gaz_data

            if val == "лифты":
                lifts_data = parse_lifts_section(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Лифты"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Лифты"] = lifts_data

            if val == "подъёмное":
                podjemnoe_data = parse_podjemnoe_ustroistvo(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                        "Подъёмное устройство для маломобильной группы населения"
                    ],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Подъёмное устройство для маломобильной группы населения"
                ] = podjemnoe_data

            if val == "устройство для":
                opuskanie_data = parse_automatic_lift_lowering_device(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                        "Устройство для автоматического опускания лифта"
                    ],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Устройство для автоматического опускания лифта"
                ] = opuskanie_data

            if val == "система эс":
                es_data = parse_es(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                        "Система ЭС (ВРУ - вводно-распределительное устройство)"
                    ],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Система ЭС (ВРУ - вводно-распределительное устройство)"
                ] = es_data
 
            if val == "вкв (второй ка":
                vkv_data = parse_vkv(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                        "ВКВ (второй кабельный ввод)"
                    ],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "ВКВ (второй кабельный ввод)"
                ] = vkv_data

            if val == "авр (автомати":
                avr_data = parse_avr(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                        "АВР (автоматическое включение резервного питания)"
                    ],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "АВР (автоматическое включение резервного питания)"
                ] = avr_data

            if val == "система":
                podjemnoe_data = parse_ppaidu(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система ППАиДУ"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Система ППАиДУ"
                ] = podjemnoe_data

            if val == "система опове":
                fire_alarm_data = parse_fire_alarm_system(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                        "Система оповещения о пожаре"
                    ],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Система оповещения о пожаре"
                ] = fire_alarm_data

            if val == "система гс":
                gs_system_data = parse_gs_system(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система ГС"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система ГС"] = gs_system_data

            if val == "система видео":
                video_surveillance_data = parse_video_surveillance_system(
                    df,
                    report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Система видеонаблюдения"],
                    row,
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Система видеонаблюдения"
                ] = video_surveillance_data

            if val == "связь с одс":
                video_surveillance_data = parse_odc_connection(
                    df, report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]["Связь с ОДС"], row
                )
                report_data["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"][
                    "Связь с ОДС"
                ] = video_surveillance_data

    if current_report:
        parsed_reports.append(current_report)

    return parsed_reports


def load_template(template_path: str) -> dict:
    with open(template_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_output(data: list, path: str):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def main():
    if len(sys.argv) < 2:
        print("Использование: python parser.py <путь_к_xlsx>")
        return

    excel_path = sys.argv[1]
    template_path = Path(__file__).parent / "template.json"
    output_path = "output.json"

    print(f"📥 Загружаем шаблон из {template_path}")
    template = load_template(template_path)

    print(f"📊 Чтение файла Excel: {excel_path}")
    parsed_reports = parse_excel_report(excel_path, template)

    print(f"💾 Сохраняем в {output_path}")
    save_output(parsed_reports, output_path)

    print("✅ Готово! Все отчеты сохранены.")


if __name__ == "__main__":
    main()
