import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// Загружаем шаблон
const templatePath = path.resolve(__dirname, '../../parser/template.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

const MULTILINE_KEYS = [
  'Межпанельные стыки', 'Гараж-стоянка (подземный)', 'Места общего пользования',
  'Система отопления', 'Система промывки и прочистки стволов мусоропроводов',
  'ОЗДС (охранно-защитная дератизационная система)',
  'Подъёмное устройство для маломобильной группы населения',
  'Устройство для автоматического опускания лифта',
  'Система ЭС (ВРУ - вводно-распределительное устройство)',
  'ВКВ (второй кабельный ввод)', 'АВР (автоматическое включение резервного питания)',
  'Система ППАиДУ', 'Система оповещения о пожаре', 'Система видеонаблюдения'
]

export function parseToTemplate(buffer: ArrayBuffer): typeof template {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })

  const result = JSON.parse(JSON.stringify(template)) // deep copy
  const section = result["РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"]
  let currentKey = ''
  let description = ''
  let rowIndex = 0

  while (rowIndex < data.length) {
    const row = data[rowIndex]
    const colA = row?.[0]?.trim()

    if (colA && section.hasOwnProperty(colA)) {
      currentKey = colA
      description = ''
      rowIndex++

      if (MULTILINE_KEYS.includes(currentKey)) {
        rowIndex = parseMultilineElement(data, rowIndex, section[currentKey])
      } else if (typeof section[currentKey] === 'object' && !Array.isArray(section[currentKey])) {
        rowIndex = parseFlatElement(data, rowIndex, section[currentKey])
      }
    } else {
      rowIndex++
    }
  }

  return result
}

function parseFlatElement(data: string[][], row: number, target: any): number {
  let description = ''
  while (row < data.length) {
    const [colA, colB, colC, colD, colE, colF, colG] = data[row].map((v) => v?.trim() ?? '')

    const nextHeaderCandidate = colA
    if (!colA && !colB && !colC && !colD && !colE && !colF && !colG) {
      row++
      continue
    }

    // Прерывание: встречен новый ключ
    if (nextHeaderCandidate && /^[А-Я]/.test(nextHeaderCandidate)) {
      break
    }

    if (colA) {
      description += (description ? ' ' : '') + colA
    }
    if (colB) {
      description += (description ? ' ' : '') + colB
    }

    if ('Описание дефектов' in target) {
      target['Описание дефектов'] = description
    }

    if ('Оц. по пред. обсл.' in target) target['Оц. по пред. обсл.'] = colE
    if ('% деф. части' in target) target['% деф. части'] = parseFloat(colF) || 0
    if ('Оценка' in target) target['Оценка'] = colG

    row++
  }
  return row
}

function parseMultilineElement(data: string[][], row: number, section: any): number {
  let currentSubKey = ''
  let description = ''
  while (row < data.length) {
    const rowData = data[row]
    const colA = rowData?.[0]?.trim()
    const colB = rowData?.[1]?.trim()
    const colC = rowData?.[2]?.trim()
    const colD = rowData?.[3]?.trim()
    const colE = rowData?.[4]?.trim()
    const colF = rowData?.[5]?.trim()
    const colG = rowData?.[6]?.trim()

    const newKeyDetected = colA && colA.includes(':')
    const isNewKey = newKeyDetected ? colA.split(':')[0].trim() : null

    if (!colA && !colB && !colC && !colD && !colE && !colF && !colG) {
      row++
      continue
    }

    if (newKeyDetected) {
      currentSubKey = isNewKey!
      description = colA
    } else {
      description += ' ' + colA
    }

    if (currentSubKey && section[currentSubKey]) {
      section[currentSubKey]['Описание дефектов'] = description.trim()
      section[currentSubKey]['Оц. по пред. обсл.'] = colE
      section[currentSubKey]['% деф. части'] = parseFloat(colF) || 0
      section[currentSubKey]['Оценка'] = colG
    }

    row++
  }
  return row
}
