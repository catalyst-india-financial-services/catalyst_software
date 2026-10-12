import React, { useState } from 'react'
import {
  Download, Printer, Filter, ChevronDown, RefreshCw,
  Building2, Calendar, FileSpreadsheet, Info, ArrowLeft, Search
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface ColumnDef {
  key: string
  label: string
  subLabel?: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface RowData {
  sNo: string
  particulars: string
  opening?: string
  lastYear?: string
  yoy?: string
  lastMonthEnd?: string
  mom?: string
  prevDay?: string
  today?: string
  dod?: string
  targetQuarter?: string
  achievement?: string
  achPercent?: string
  gap?: string
  gapPercent?: string
  ytd?: string
  ytdPercent?: string
  qtd?: string
  qtdPercent?: string
  mtd?: string
  isHeader?: boolean
  isSummary?: boolean
  sectionColor?: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'sNo', label: 'S.No', width: 'w-16 min-w-[64px]', align: 'center' },
  { key: 'particulars', label: 'Particulars', width: 'w-64 min-w-[250px]', align: 'left' },
  { key: 'opening', label: 'Opening', subLabel: '01-04-2026', width: 'w-28 min-w-[100px]', align: 'right' },
  { key: 'lastYear', label: 'Last Year', subLabel: '31-03-2026', width: 'w-28 min-w-[100px]', align: 'right' },
  { key: 'yoy', label: 'YOY %', width: 'w-24 min-w-[90px]', align: 'right' },
  { key: 'lastMonthEnd', label: 'Last Month End', subLabel: '31-05-2026', width: 'w-32 min-w-[115px]', align: 'right' },
  { key: 'mom', label: 'MOM %', width: 'w-24 min-w-[90px]', align: 'right' },
  { key: 'prevDay', label: 'Previous Day', subLabel: '08-06-2026', width: 'w-28 min-w-[105px]', align: 'right' },
  { key: 'today', label: 'Today', subLabel: '09-06-2026', width: 'w-28 min-w-[105px]', align: 'right' },
  { key: 'dod', label: 'DOD %', width: 'w-24 min-w-[90px]', align: 'right' },
  { key: 'targetQuarter', label: 'Target for', subLabel: 'Current Quarter', width: 'w-32 min-w-[120px]', align: 'right' },
  { key: 'achievement', label: 'Achievement', subLabel: '(as on date)', width: 'w-32 min-w-[120px]', align: 'right' },
  { key: 'achPercent', label: 'Ach %', width: 'w-24 min-w-[85px]', align: 'right' },
  { key: 'gap', label: 'GAP', width: 'w-24 min-w-[85px]', align: 'right' },
  { key: 'gapPercent', label: 'Gap %', width: 'w-24 min-w-[85px]', align: 'right' },
  { key: 'ytd', label: 'YTD', width: 'w-24 min-w-[90px]', align: 'right' },
  { key: 'ytdPercent', label: 'YTD %', width: 'w-24 min-w-[85px]', align: 'right' },
  { key: 'qtd', label: 'QTD', width: 'w-24 min-w-[90px]', align: 'right' },
  { key: 'qtdPercent', label: 'QTD %', width: 'w-24 min-w-[85px]', align: 'right' },
  { key: 'mtd', label: 'MTD', width: 'w-28 min-w-[100px]', align: 'right' },
]

const REPORT_SECTIONS: {
  id: number
  title: string
  colorClass: string
  headerBg: string
  rows: RowData[]
}[] = [
  {
    id: 1,
    title: '1  BUSINESS GROWTH (DISBURSEMENTS)',
    colorClass: 'bg-[#103055] text-white',
    headerBg: '#103055',
    rows: [
      { sNo: '1.1', particulars: 'Term Loan', opening: '8.45', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '13.70', mom: '7.3%', prevDay: '14.70', today: '14.70', dod: '0.0%', targetQuarter: '15.70', achievement: '15.70', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '7.25', ytdPercent: '', qtd: '7.25', qtdPercent: '', mtd: '15.70' },
      { sNo: '1.2', particulars: 'Working Capital', opening: '3.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '5.00', mom: '0.0%', prevDay: '5.00', today: '5.00', dod: '0.0%', targetQuarter: '7.00', achievement: '7.00', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '4.00', ytdPercent: '', qtd: '4.00', qtdPercent: '', mtd: '7.00' },
      { sNo: '1.3', particulars: 'Composite Loan', opening: '-', lastYear: '-', yoy: '', lastMonthEnd: '4.00', mom: '0.0%', prevDay: '4.00', today: '4.00', dod: '0.0%', targetQuarter: '4.00', achievement: '4.00', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '4.00', ytdPercent: '', qtd: '4.00', qtdPercent: '', mtd: '4.00' },
      { sNo: '1.4', particulars: 'Total Disbursements', opening: '11.45', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '22.70', mom: '4.4%', prevDay: '23.70', today: '23.70', dod: '0.0%', targetQuarter: '26.70', achievement: '26.70', achPercent: '100.0%', gap: '-', gapPercent: '0.0%', ytd: '15.25', ytdPercent: '', qtd: '15.25', qtdPercent: '', mtd: '26.70', isSummary: true },
    ]
  },
  {
    id: 2,
    title: '2  COLLECTION PERFORMANCE',
    colorClass: 'bg-[#15803d] text-white',
    headerBg: '#15803d',
    rows: [
      { sNo: '2.1', particulars: 'Total Demand Due (EMI + Other)', opening: '10.50', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '12.30', mom: '-88.6%', prevDay: '1.25', today: '1.40', dod: '12.0%', targetQuarter: '14.00', achievement: '12.30', achPercent: '87.9%', gap: '1.70', gapPercent: '12.1%', ytd: '11.80', ytdPercent: '', qtd: '11.80', qtdPercent: '', mtd: '12.30' },
      { sNo: '2.2', particulars: 'Principal Collection', opening: '8.20', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '9.60', mom: '-88.5%', prevDay: '0.95', today: '1.10', dod: '15.8%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '9.40', ytdPercent: '', qtd: '9.40', qtdPercent: '', mtd: '9.60' },
      { sNo: '2.3', particulars: 'Interest Collection', opening: '1.60', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '1.90', mom: '-88.4%', prevDay: '0.15', today: '0.22', dod: '46.7%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '1.80', ytdPercent: '', qtd: '1.80', qtdPercent: '', mtd: '1.90' },
      { sNo: '2.4', particulars: 'Total Collection', opening: '9.80', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '11.50', mom: '-88.5%', prevDay: '1.10', today: '1.32', dod: '20.0%', targetQuarter: '13.00', achievement: '11.50', achPercent: '88.5%', gap: '1.50', gapPercent: '11.5%', ytd: '11.20', ytdPercent: '', qtd: '11.20', qtdPercent: '', mtd: '11.50', isSummary: true },
      { sNo: '2.5', particulars: 'Collection Efficiency', opening: '83.7%', lastYear: '-', yoy: '', lastMonthEnd: '83.5%', mom: '', prevDay: '86.4%', today: '83.3%', dod: '', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '83.9%', ytdPercent: '', qtd: '83.9%', qtdPercent: '', mtd: '83.5%' },
    ]
  },
  {
    id: 3,
    title: '3  LOAN PORTFOLIO & OUTSTANDING',
    colorClass: 'bg-[#6b21a8] text-white',
    headerBg: '#6b21a8',
    rows: [
      { sNo: '3.1', particulars: 'Principal Outstanding', opening: '36.50', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '37.60', mom: '-1.3%', prevDay: '37.40', today: '37.10', dod: '-0.8%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '37.10', ytdPercent: '', qtd: '37.10', qtdPercent: '', mtd: '37.10' },
      { sNo: '3.2', particulars: 'Interest Outstanding', opening: '1.50', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '1.60', mom: '-0.6%', prevDay: '1.55', today: '1.59', dod: '2.6%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '1.59', ytdPercent: '', qtd: '1.59', qtdPercent: '', mtd: '1.59' },
      { sNo: '3.3', particulars: 'Total Loan Portfolio Outstanding', opening: '38.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '39.20', mom: '-1.3%', prevDay: '38.95', today: '38.69', dod: '-0.7%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '38.69', ytdPercent: '', qtd: '38.69', qtdPercent: '', mtd: '38.69', isSummary: true },
      { sNo: '3.4', particulars: 'Active Loan Accounts', opening: '142.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '148.00', mom: '1.4%', prevDay: '144.00', today: '150.00', dod: '4.2%', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '150.00', ytdPercent: '', qtd: '150.00', qtdPercent: '', mtd: '150.00' },
      { sNo: '3.5', particulars: 'Loan Closures (During Period)', opening: '2.00', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '5.00', mom: '-100.0%', prevDay: '-', today: '-', dod: '', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '5.00', ytdPercent: '', qtd: '5.00', qtdPercent: '', mtd: '-' },
      { sNo: '3.6', particulars: 'Net Portfolio Growth', opening: '11.45', lastYear: '-', yoy: '-100.0%', lastMonthEnd: '16.50', mom: '', prevDay: '', today: '', dod: '', targetQuarter: '', achievement: '', achPercent: '', gap: '', gapPercent: '', ytd: '15.25', ytdPercent: '', qtd: '15.25', qtdPercent: '', mtd: '26.70' },
    ]
  },
  {
    id: 4,
    title: '4  LIQUIDITY & CAPITAL POSITION',
    colorClass: 'bg-[#b45309] text-white',
    headerBg: '#b45309',
    rows: [
      { sNo: '4.1', particulars: 'Capital' },
      { sNo: '4.2', particulars: 'Deposits' },
      { sNo: '4.3', particulars: 'Loans (Borrowings)' },
      { sNo: '4.4', particulars: 'Capital Employed' },
      { sNo: '4.5', particulars: 'Cash Balance' },
      { sNo: '4.6', particulars: 'Bank Balance', prevDay: '11.99', today: '11.99', dod: '0.0%', ytd: '11.99', qtd: '11.99', mtd: '11.99' },
      { sNo: '4.8', particulars: 'Capital Deployed', prevDay: '38.69', today: '38.69', dod: '0.0%', ytd: '38.69', qtd: '38.69', mtd: '38.69' },
      { sNo: '4.9', particulars: 'Difference' },
    ]
  },
  {
    id: 5,
    title: '5  PROFITABILITY (INCOME & EXPENSES)',
    colorClass: 'bg-[#991b1b] text-white',
    headerBg: '#991b1b',
    rows: [
      { sNo: '5.1', particulars: 'Interest Income' },
      { sNo: '5.2', particulars: 'Interest Expense' },
      { sNo: '5.3', particulars: 'Net Interest Income', today: '-' },
      { sNo: '5.4', particulars: 'Operating Expenses' },
      { sNo: '5.5', particulars: 'Credit Loss Provisions' },
      { sNo: '5.6', particulars: 'Profit' },
    ]
  },
  {
    id: 6,
    title: '6  ASSET QUALITY',
    colorClass: 'bg-[#0284c7] text-white',
    headerBg: '#0284c7',
    rows: [
      { sNo: '6.1', particulars: 'PAR 30+' },
      { sNo: '6.2', particulars: 'PAR 90+' },
      { sNo: '6.3', particulars: 'SMA - 0' },
      { sNo: '6.4', particulars: 'SMA - 1' },
      { sNo: '6.5', particulars: 'SMA - 2' },
      { sNo: '6.6', particulars: 'Total Overdue Accounts' },
      { sNo: '6.7', particulars: 'Total Overdue Amount' },
      { sNo: '6.8', particulars: 'NPA Accounts' },
      { sNo: '6.9', particulars: 'NPA Amount' },
      { sNo: '6.10', particulars: 'NPA % of Portfolio' },
      { sNo: '6.11', particulars: 'Recovery from Overdue Accounts' },
      { sNo: '6.12', particulars: 'Recovery from NPA Accounts' },
      { sNo: '6.13', particulars: 'Total Recovery' },
    ]
  },
  {
    id: 7,
    title: '7  Ranking',
    colorClass: 'bg-[#2563eb] text-white',
    headerBg: '#2563eb',
    rows: [
      { sNo: '7.1', particulars: 'Disbursement Rank' },
      { sNo: '7.2', particulars: 'Collection Rank' },
      { sNo: '7.3', particulars: 'NPA Rank' },
      { sNo: '7.4', particulars: 'Profitability Rank' },
      { sNo: '7.5', particulars: 'Overdue Rank' },
      { sNo: '7.6', particulars: 'Growth Rank' },
      { sNo: '7.7', particulars: 'Overall Rank' },
    ]
  }
]

interface BusinessPerformanceReportProps {
  onBack: () => void
}

export default function BusinessPerformanceReport({ onBack }: BusinessPerformanceReportProps) {
  const [activeTab, setActiveTab] = useState<'sheet' | 'notes'>('sheet')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('Namakkal')

  const handleExportExcel = () => {
    // Generate workbook
    const exportData: Record<string, string | number>[] = []

    REPORT_SECTIONS.forEach((section) => {
      // Add section title row
      exportData.push({
        'S.No': section.title,
        'Particulars': '',
        'Opening (01-04-2026)': '',
        'Last Year (31-03-2026)': '',
        'YOY %': '',
        'Last Month End (31-05-2026)': '',
        'MOM %': '',
        'Previous Day (08-06-2026)': '',
        'Today (09-06-2026)': '',
        'DOD %': '',
        'Target for Current Quarter': '',
        'Achievement (as on date)': '',
        'Ach %': '',
        'GAP': '',
        'Gap %': '',
        'YTD': '',
        'YTD %': '',
        'QTD': '',
        'QTD %': '',
        'MTD': ''
      })

      section.rows.forEach((r) => {
        exportData.push({
          'S.No': r.sNo,
          'Particulars': r.particulars,
          'Opening (01-04-2026)': r.opening || '',
          'Last Year (31-03-2026)': r.lastYear || '',
          'YOY %': r.yoy || '',
          'Last Month End (31-05-2026)': r.lastMonthEnd || '',
          'MOM %': r.mom || '',
          'Previous Day (08-06-2026)': r.prevDay || '',
          'Today (09-06-2026)': r.today || '',
          'DOD %': r.dod || '',
          'Target for Current Quarter': r.targetQuarter || '',
          'Achievement (as on date)': r.achievement || '',
          'Ach %': r.achPercent || '',
          'GAP': r.gap || '',
          'Gap %': r.gapPercent || '',
          'YTD': r.ytd || '',
          'YTD %': r.ytdPercent || '',
          'QTD': r.qtd || '',
          'QTD %': r.qtdPercent || '',
          'MTD': r.mtd || ''
        })
      })
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Business Performance')
    XLSX.writeFile(workbook, `Business_Performance_Report_${selectedBranch}_09062026.xlsx`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Reports
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Namakkal">Namakkal</option>
              <option value="Salem">Salem</option>
              <option value="Erode">Erode</option>
              <option value="Karur">Karur</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hidden md:flex">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Date:</span>
            <span className="font-semibold text-slate-700">09/06/2026</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search particulars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-48 placeholder-slate-400 font-medium"
            />
          </div>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Download Excel Sheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-sm transition-all cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'sheet' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Excel Sheet Metadata Header */}
            <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-black tracking-tight text-slate-900 font-mono">
                    CATALYST OS | BUSINESS PERFORMANCE REPORT
                  </h2>
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
                    {selectedBranch} Branch
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Business position as on <strong className="text-slate-700 font-semibold">09/06/2026</strong></span>
                  <span>•</span>
                  <span className="italic text-slate-400">Template: replace illustrative figures with actual data before operational use.</span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Values: In Lakhs
                </span>
              </div>
            </div>

            {/* Scrollable Spreadsheet Table */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative border-b border-slate-200">
              <table className="w-full border-collapse text-xs select-text">
                {/* Sticky Header Row */}
                <thead className="sticky top-0 z-30 shadow-sm">
                  <tr className="bg-[#0f2942] text-white">
                    {COLUMNS.map((col, idx) => (
                      <th
                        key={col.key}
                        className={`px-3 py-2.5 border-r border-[#1a3d5e] font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap select-none ${
                          col.width || ''
                        } ${
                          idx < 2 ? 'sticky z-40 bg-[#0f2942]' : ''
                        } ${
                          idx === 0 ? 'left-0' : idx === 1 ? 'left-16 shadow-[2px_0_4px_rgba(0,0,0,0.1)]' : ''
                        } ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        <div className={`flex items-center gap-1 ${
                          col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                        }`}>
                          <span>{col.label}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400 opacity-60 inline-block" />
                        </div>
                        {col.subLabel && (
                          <div className="text-[9px] font-medium text-slate-300 normal-case tracking-normal mt-0.5 opacity-90">
                            {col.subLabel}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200">
                  {REPORT_SECTIONS.map((section) => {
                    // Filter section rows if searching
                    const filteredRows = section.rows.filter(
                      (row) => !searchTerm || row.particulars.toLowerCase().includes(searchTerm.toLowerCase()) || row.sNo.includes(searchTerm)
                    )

                    if (searchTerm && filteredRows.length === 0) {
                      return null
                    }

                    return (
                      <React.Fragment key={section.id}>
                        {/* Section Header Row */}
                        <tr className={`${section.colorClass} border-t-2 border-b border-slate-300`}>
                          <td className="px-3 py-1.5 font-black text-center sticky left-0 z-20 bg-inherit border-r border-white/20">
                            {section.id}
                          </td>
                          <td
                            colSpan={COLUMNS.length - 1}
                            className="px-3 py-1.5 font-black uppercase tracking-wider text-xs sticky left-16 z-10 bg-inherit"
                          >
                            <div className="flex items-center gap-2">
                              <span>{section.title}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Section Rows */}
                        {filteredRows.map((row, rIdx) => {
                          const isEven = rIdx % 2 === 0
                          const rowBg = row.isSummary
                            ? 'bg-slate-100 font-extrabold text-slate-900 border-t border-b border-slate-300'
                            : isEven
                            ? 'bg-white hover:bg-blue-50/40 text-slate-700'
                            : 'bg-slate-50/50 hover:bg-blue-50/40 text-slate-700'

                          return (
                            <tr
                              key={`${section.id}-${row.sNo}`}
                              className={`transition-colors border-b border-slate-200 ${rowBg}`}
                            >
                              {/* S.No column (sticky left) */}
                              <td
                                className={`px-3 py-1.5 font-bold text-center border-r border-slate-200 whitespace-nowrap sticky left-0 z-10 ${
                                  row.isSummary ? 'bg-slate-100' : isEven ? 'bg-white' : 'bg-slate-50'
                                }`}
                              >
                                {row.sNo}
                              </td>

                              {/* Particulars column (sticky left after S.No) */}
                              <td
                                className={`px-3 py-1.5 font-semibold border-r border-slate-200 whitespace-nowrap sticky left-16 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.03)] ${
                                  row.isSummary ? 'bg-slate-100 text-slate-900 font-bold' : isEven ? 'bg-white' : 'bg-slate-50'
                                }`}
                              >
                                <span className={row.isSummary ? 'font-black' : ''}>{row.particulars}</span>
                              </td>

                              {/* Data Columns */}
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.opening || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.lastYear || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.yoy?.startsWith('-') ? 'text-rose-600 font-semibold' : ''
                              }`}>
                                {row.yoy || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.lastMonthEnd || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.mom?.startsWith('-') ? 'text-rose-600 font-semibold' : row.mom ? 'text-emerald-600 font-semibold' : ''
                              }`}>
                                {row.mom || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.prevDay || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] font-bold text-slate-900 bg-amber-50/30">
                                {row.today || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.dod?.startsWith('-') ? 'text-rose-600 font-semibold' : row.dod && row.dod !== '0.0%' ? 'text-emerald-600 font-semibold' : ''
                              }`}>
                                {row.dod || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.targetQuarter || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.achievement || '-'}
                              </td>
                              <td className={`px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] ${
                                row.achPercent === '100.0%' ? 'text-emerald-600 font-bold' : ''
                              }`}>
                                {row.achPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.gap || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.gapPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.ytd || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.ytdPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.qtd || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px]">
                                {row.qtdPercent || '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                                {row.mtd || '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Definitions & Notes Tab Content */
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
            <div className="max-w-4xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold">Report Definitions & Formulae</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This Business Performance Report aggregates core financial, collection, portfolio, and operational indicators across business periods for Branch auditing and executive decision-making.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">DOD (Day On Day %)</h4>
                  <p className="text-xs text-slate-600">Calculated as (Today - Previous Day) / Previous Day * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">MOM (Month On Month %)</h4>
                  <p className="text-xs text-slate-600">Calculated as (Today - Last Month End) / Last Month End * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">YOY (Year On Year %)</h4>
                  <p className="text-xs text-slate-600">Calculated as (Today - Opening 01-04-2026) / Opening * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Collection Efficiency %</h4>
                  <p className="text-xs text-slate-600">Total Collection / Total Demand Due (EMI + Other) * 100.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">SMA & PAR Definitions</h4>
                  <p className="text-xs text-slate-600">Special Mention Accounts (SMA-0, SMA-1, SMA-2) and Portfolio at Risk (PAR 30+, PAR 90+) based on overdue aging days.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Net Portfolio Growth</h4>
                  <p className="text-xs text-slate-600">Total Disbursements minus Total Principal Collections & Closures.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Excel Sheet Bottom Tabs (just like screenshot) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 border-t border-slate-300 text-xs flex-shrink-0 select-none">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-t-md font-bold text-xs transition-colors cursor-pointer border-t-2 ${
              activeTab === 'sheet'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Business Performance
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-t-md font-bold text-xs transition-colors cursor-pointer border-t-2 ${
              activeTab === 'notes'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Definitions & Notes
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-3">
          <span>Ready</span>
          <span>•</span>
          <span>7 Sections • 62 Rows • 20 Indicators</span>
        </div>
      </div>
    </div>
  )
}
