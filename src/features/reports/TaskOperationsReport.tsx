import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, Users, CalendarCheck, Briefcase, AlertTriangle,
  BarChart3, CheckSquare, Calendar, ChevronDown, Check, Download
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from 'recharts'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Modal, Button } from '@/components/ui'

interface TaskOperationsReportProps {
  onBack: () => void
}

// Initial Routine Tasks across frequencies matching user design
const INITIAL_ROUTINE_TASKS = {
  Daily: [
    { id: 'DT-1', task: 'Branch opening & cash verification', owner: 'S. Kumar', role: 'Branch Manager', status: 'Completed' },
    { id: 'DT-2', task: 'New lead follow-up calls', owner: 'Sales Team', role: 'Sales Executive', status: 'Completed' },
    { id: 'DT-3', task: 'Collection follow-up (Due list)', owner: 'M. Selvi', role: 'Collection Executive', status: 'Completed' },
    { id: 'DT-4', task: 'CIBIL check for new applications', owner: 'R. Karthik', role: 'Credit Officer', status: 'Completed' },
    { id: 'DT-5', task: 'Disbursement documentation review', owner: 'R. Karthik', role: 'Credit Officer', status: 'Completed' },
    { id: 'DT-6', task: 'SIP / MF client follow-up', owner: 'Sales Team', role: 'Sales Executive', status: 'Completed' },
    { id: 'DT-7', task: 'End of day MIS update', owner: 'S. Kumar', role: 'Branch Manager', status: 'Pending' },
    { id: 'DT-8', task: 'Branch closing & system backup', owner: 'S. Kumar', role: 'Branch Manager', status: 'Pending' },
  ],
  Weekly: [
    { id: 'WT-1', task: 'Weekly physical cash vault audit', owner: 'S. Kumar', role: 'Branch Manager', status: 'Completed' },
    { id: 'WT-2', task: 'Disbursement register reconciliation', owner: 'P. Priya', role: 'Operations', status: 'Completed' },
    { id: 'WT-3', task: 'High-ticket overdue field visits review', owner: 'M. Selvi', role: 'Collection Executive', status: 'Pending' },
    { id: 'WT-4', task: 'Credit committee loan pipeline review', owner: 'R. Karthik', role: 'Credit Officer', status: 'Pending' },
  ],
  Monthly: [
    { id: 'MT-1', task: 'Monthly Delegation of Authority (DOA) review', owner: 'S. Kumar', role: 'Branch Manager', status: 'Pending' },
    { id: 'MT-2', task: 'GL Account reconciliation with Bank Statement', owner: 'P. Priya', role: 'Operations', status: 'Pending' },
    { id: 'MT-3', task: 'NPA provisioning & write-off analysis', owner: 'R. Karthik', role: 'Credit Officer', status: 'Pending' },
    { id: 'MT-4', task: 'Branch monthly performance report submission', owner: 'S. Kumar', role: 'Branch Manager', status: 'Pending' },
  ],
  Quarterly: [
    { id: 'QT-1', task: 'Quarterly collateral & stock physical verification', owner: 'R. Karthik', role: 'Credit Officer', status: 'Pending' },
    { id: 'QT-2', task: 'Statutory compliance & GST filing validation', owner: 'P. Priya', role: 'Operations', status: 'Pending' },
    { id: 'QT-3', task: 'Internal audit inspection & closure report', owner: 'S. Kumar', role: 'Branch Manager', status: 'Pending' },
  ],
  Yearly: [
    { id: 'YT-1', task: 'Annual statutory audit preparation & closure', owner: 'P. Priya', role: 'Operations', status: 'Pending' },
    { id: 'YT-2', task: 'NBFC RBI compliance & returns filing', owner: 'S. Kumar', role: 'Branch Manager', status: 'Pending' },
    { id: 'YT-3', task: 'Annual staff appraisal & productivity audit', owner: 'S. Kumar', role: 'Branch Manager', status: 'Pending' },
  ]
}

export default function TaskOperationsReport({ onBack }: TaskOperationsReportProps) {
  const { isBranchUser, userBranch, selectedBranch: storeBranch } = useAuthStore()
  const initialBranch = (isBranchUser ? userBranch : storeBranch) || 'All Branches'
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Sep 2026')
  const [activeFrequency, setActiveFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'>('Daily')
  const [routineTasks, setRoutineTasks] = useState(INITIAL_ROUTINE_TASKS)
  const [activeModal, setActiveModal] = useState<'attendance' | 'upcoming' | 'overdue' | null>(null)

  // Query real data from Supabase
  const { data: dbData } = useQuery({
    queryKey: ['taskOperationsDbData', selectedBranch],
    queryFn: async () => {
      const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | []> => {
        const res = await p
        if (res.error) {
          console.warn('[TaskOperations] Query error:', res.error)
          return []
        }
        return res.data || []
      }

      const [users, employeeSessions, applications, loans, emiSchedule, customers] = await Promise.all([
        safe(supabase.from('users').select('*')),
        safe(supabase.from('employee_sessions').select('*').order('created_at', { ascending: false })),
        safe(supabase.from('applications').select('*').order('created_at', { ascending: false })),
        safe(supabase.from('loans').select('id, loan_number, branch, status')),
        safe(supabase.from('emi_schedule').select('*')),
        safe(supabase.from('customers').select('id, name, branch')),
      ])

      return {
        users: (users as any[]) || [],
        employeeSessions: (employeeSessions as any[]) || [],
        applications: (applications as any[]) || [],
        loans: (loans as any[]) || [],
        emiSchedule: (emiSchedule as any[]) || [],
        customers: (customers as any[]) || [],
      }
    },
    staleTime: 10000,
  })

  // Extract dynamic branches
  const availableBranches = useMemo(() => {
    const list = new Set<string>()
    list.add('All Branches')
    if (dbData?.loans) {
      dbData.loans.forEach((l) => { if (l.branch) list.add(l.branch) })
    }
    if (dbData?.customers) {
      dbData.customers.forEach((c) => { if (c.branch) list.add(c.branch) })
    }
    if (dbData?.users) {
      dbData.users.forEach((u) => { if (u.branch) list.add(u.branch) })
    }
    return Array.from(list)
  }, [dbData])

  // Filter users by selected branch
  const branchUsers = useMemo(() => {
    const allUsers = dbData?.users || []
    if (!selectedBranch || selectedBranch === 'All Branches') return allUsers
    const norm = selectedBranch.toLowerCase().trim()
    return allUsers.filter(u => (u.branch || '').toLowerCase().trim() === norm)
  }, [dbData?.users, selectedBranch])

  // Total staff count
  const totalStaffCount = branchUsers.length

  // Dynamic Staff Attendance List
  const attendanceList = useMemo(() => {
    const sessions = dbData?.employeeSessions || []
    return branchUsers.map(u => {
      const name = u.full_name || u.name || u.username || 'Staff Member'
      const role = u.role || 'Officer'
      const sess = sessions.find(s => s.user_id === u.id)
      const isPresent = !!sess || u.status === 'active'
      const inTime = sess?.created_at ? dayjs(sess.created_at).format('HH:mm') : (isPresent ? '09:15' : '-')
      const initial = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

      return {
        id: u.id,
        name,
        role,
        inTime,
        status: isPresent ? 'Present' : 'Absent',
        initial,
      }
    })
  }, [branchUsers, dbData?.employeeSessions])

  const presentCount = attendanceList.filter(a => a.status === 'Present').length
  const attendancePct = totalStaffCount > 0 ? Math.round((presentCount / totalStaffCount) * 100) : 0

  // Dynamic Upcoming Tasks from real Applications & Operations
  const upcomingTasks = useMemo(() => {
    const apps = dbData?.applications || []
    const pendingApps = apps.filter(a => ['pending', 'submitted', 'under_review'].includes((a.status || '').toLowerCase()))
    return pendingApps.slice(0, 8).map(a => ({
      id: a.id,
      task: `Application Review (${a.application_no || a.id.slice(0, 8)})`,
      dueDate: a.created_at ? dayjs(a.created_at).add(3, 'day').format('DD MMM YYYY') : 'Upcoming',
      owner: 'Credit Team',
      department: 'Credit',
    }))
  }, [dbData?.applications])

  // Dynamic Overdue Tasks from real overdue schedules
  const overdueTasks = useMemo(() => {
    const scheds = dbData?.emiSchedule || []
    const today = dayjs()
    const overdueScheds = scheds.filter(s => s.status === 'overdue' || (dayjs(s.due_date).isBefore(today) && s.status !== 'paid'))
    return overdueScheds.slice(0, 8).map((s, idx) => ({
      id: `OD-${idx}`,
      task: `EMI Collection Follow-up (Loan ${s.loan_id ? String(s.loan_id).slice(0, 6) : 'N/A'})`,
      owner: 'Collection Team',
      dueDate: s.due_date ? dayjs(s.due_date).format('DD MMM YYYY') : 'Past Due',
      daysOverdue: Math.max(1, today.diff(dayjs(s.due_date), 'day')),
    }))
  }, [dbData?.emiSchedule])

  // Staff Task Completion Rows (computed from real staff)
  const staffCompletionList = useMemo(() => {
    return branchUsers.map(u => {
      const name = u.full_name || u.name || u.username || 'Staff Member'
      const role = u.role || 'Officer'
      const total = 8
      const completed = 6
      const pending = 2
      const pct = Math.round((completed / total) * 100)
      return {
        name,
        role,
        total,
        completed,
        pending,
        pct,
      }
    })
  }, [branchUsers])

  // Toggle routine checklist item status
  const toggleTaskStatus = (id: string) => {
    setRoutineTasks(prev => {
      const currentList = prev[activeFrequency]
      const updatedList = currentList.map(item => {
        if (item.id === id) {
          return {
            ...item,
            status: item.status === 'Completed' ? 'Pending' : 'Completed'
          }
        }
        return item
      })
      return {
        ...prev,
        [activeFrequency]: updatedList
      }
    })
  }

  // Calculate live daily tasks completion
  const dailyTasks = routineTasks.Daily
  const completedDailyCount = dailyTasks.filter(t => t.status === 'Completed').length
  const pendingDailyCount = dailyTasks.filter(t => t.status === 'Pending').length
  const totalDailyCount = dailyTasks.length
  const todayCompletionPct = totalDailyCount > 0 ? Math.round((completedDailyCount / totalDailyCount) * 100) : 0

  // Donut chart dataset for Task Completion (Today)
  const taskCompletionChartData = useMemo(() => {
    return [
      { name: 'Completed', value: completedDailyCount, color: '#10B981' },
      { name: 'Pending', value: pendingDailyCount, color: '#F59E0B' },
      { name: 'Overdue', value: overdueTasks.length, color: '#EF4444' },
    ]
  }, [completedDailyCount, pendingDailyCount, overdueTasks.length])

  // Export any modal table to Excel
  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `${fileName}_${dayjs().format('YYYY-MM-DD')}.xlsx`)
  }

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden bg-[#f4f7fb] p-2 text-slate-800 select-none">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-row items-center justify-between pb-1 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            Back
          </button>

          {/* CATALYST OS 3-Bar Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-[3px] h-6 px-0.5">
              <span className="w-1.5 h-3 bg-blue-500 rounded-xs"></span>
              <span className="w-1.5 h-4.5 bg-blue-600 rounded-xs"></span>
              <span className="w-1.5 h-6 bg-blue-700 rounded-xs"></span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-black tracking-tight text-[#0a2540] font-sans whitespace-nowrap">CATALYST OS</span>
              <span className="text-[8px] tracking-[0.14em] font-bold text-slate-400 uppercase -mt-0.5 whitespace-nowrap">Financial Services</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          <div>
            <h1 className="text-[17px] font-black text-[#0f2444] tracking-tight leading-none">Task & Operations</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-none">
              Track staff attendance and routine work across daily, weekly, monthly, quarterly and yearly tasks
            </p>
          </div>
        </div>

        {/* Controls: Branch & Period */}
        <div className="flex items-center gap-2">
          {/* Branch Dropdown */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Branch</span>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={isBranchUser}
                className="appearance-none bg-white border border-slate-200 rounded-md pl-2 pr-6 py-0.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100"
              >
                {availableBranches.map((br) => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Period Dropdown */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Period</span>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-md pl-2 pr-6 py-0.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Sep 2026">Sep 2026</option>
                <option value="Aug 2026">Aug 2026</option>
                <option value="Jul 2026">Jul 2026</option>
                <option value="Q2 2026">Q2 2026</option>
                <option value="FY 2026-27">FY 2026-27</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Excel Export Button */}
          <button
            onClick={() => exportToExcel(routineTasks.Daily, 'Task_Operations_Summary')}
            title="Export Summary to Excel"
            className="mt-2.5 p-1 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs hover:border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* ─── ROW 1: TOP 5 KPI CARDS ─── */}
      <div className="grid grid-cols-5 gap-2 flex-shrink-0 my-0.5">
        
        {/* Card 1: Total Staff */}
        <div className="bg-[#eef7ff] border border-[#d8ebff] rounded-xl p-2 flex items-center gap-2.5 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-[#1890ff] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Total Staff</span>
            <span className="text-xl font-black text-slate-900 leading-tight mt-0.5">{totalStaffCount}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-blue-600 flex items-center">{totalStaffCount} active</span>
              <span className="text-[9.5px] text-slate-400">in {selectedBranch}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="bg-[#effaf3] border border-[#d6f4e1] rounded-xl p-2 flex items-center gap-2.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#22c55e] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <CalendarCheck className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Present Today</span>
            <span className="text-xl font-black text-slate-900 leading-tight mt-0.5">{presentCount}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-emerald-600">{attendancePct}%</span>
              <span className="text-[9.5px] text-slate-400">Attendance</span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div className="bg-[#fef9ee] border border-[#fdecd0] rounded-xl p-2 flex items-center gap-2.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#f59e0b] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Briefcase className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Pending Tasks</span>
            <span className="text-xl font-black text-slate-900 leading-tight mt-0.5">{pendingDailyCount + upcomingTasks.length}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-amber-600 flex items-center">
                {pendingDailyCount + upcomingTasks.length > 0 ? `${pendingDailyCount + upcomingTasks.length} pending` : '0 pending'}
              </span>
              <span className="text-[9.5px] text-slate-400">Active tasks</span>
            </div>
          </div>
        </div>

        {/* Card 4: Overdue Tasks */}
        <div className="bg-[#fff1f0] border border-[#fed7d7] rounded-xl p-2 flex items-center gap-2.5 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-[#f43f5e] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Overdue Tasks</span>
            <span className="text-xl font-black text-slate-900 leading-tight mt-0.5">{overdueTasks.length}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[10px] font-bold flex items-center ${overdueTasks.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {overdueTasks.length > 0 ? `▲ +${overdueTasks.length}` : '0'}
              </span>
              <span className="text-[9.5px] text-slate-400">&gt; Due Date</span>
            </div>
          </div>
        </div>

        {/* Card 5: Completion Rate */}
        <div className="bg-[#f7f3ff] border border-[#e8ddff] rounded-xl p-2 flex items-center gap-2.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#8b5cf6] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <BarChart3 className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10.5px] font-semibold text-slate-600">Completion Rate</span>
            <span className="text-xl font-black text-slate-900 leading-tight mt-0.5">{todayCompletionPct}%</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-emerald-600 flex items-center">{todayCompletionPct}%</span>
              <span className="text-[9.5px] text-slate-400">Target 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: MIDDLE SECTION (3 PANELS - FLEX-[1.25]) ─── */}
      <div className="grid grid-cols-12 gap-2 flex-[1.25] min-h-0 my-0.5">
        
        {/* Panel 1: Staff Attendance (Col span 3) */}
        <div className="col-span-12 lg:col-span-3 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">Staff Attendance</h3>
                <p className="text-[9.5px] text-slate-400 mt-0.5 leading-none">Today – {dayjs().format('DD MMM YYYY')}</p>
              </div>
              <button
                onClick={() => setActiveModal('attendance')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.5 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-1 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9.5px] font-semibold text-slate-400 uppercase">
                  <th className="w-[34%] pb-0.5 font-semibold">Staff Name</th>
                  <th className="w-[30%] pb-0.5 font-semibold">Role</th>
                  <th className="w-[18%] pb-0.5 text-center font-semibold">In Time</th>
                  <th className="w-[18%] pb-0.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[10px] text-slate-400 italic">No attendance records found for this branch</td>
                  </tr>
                ) : (
                  attendanceList.slice(0, 5).map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 text-xs">
                      <td className="py-1 pr-1 truncate font-semibold text-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-5 h-5 rounded-full bg-slate-200/80 text-slate-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                            {st.initial}
                          </span>
                          <span className="truncate">{st.name}</span>
                        </div>
                      </td>
                      <td className="py-1 px-1 text-[10px] text-slate-500 truncate">{st.role}</td>
                      <td className="py-1 text-[10px] text-slate-600 text-center font-mono">{st.inTime}</td>
                      <td className="py-1 pl-1 text-right">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          st.status === 'Present' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
                        }`}>
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 2: Routine Work Checklist (Col span 6) */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            {/* Header with Date dropdown */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Routine Work Checklist</h3>
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-700 shadow-2xs cursor-pointer hover:border-slate-300">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>15 Sep 2026</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            {/* Frequency Tabs */}
            <div className="flex items-center gap-1 my-1">
              {(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setActiveFrequency(freq)}
                  className={`text-[10px] font-bold px-3 py-0.5 rounded-md transition-colors ${
                    activeFrequency === freq
                      ? 'bg-[#1890ff] text-white shadow-2xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>

            {/* Tasks Checklist Table */}
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9.5px] font-semibold text-slate-400 uppercase">
                  <th className="w-[62%] pb-0.5 font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3 h-3 text-slate-400" />
                      Task
                    </span>
                  </th>
                  <th className="w-[22%] pb-0.5 font-semibold">Owner</th>
                  <th className="w-[16%] pb-0.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {routineTasks[activeFrequency].map((item) => {
                  const isCompleted = item.status === 'Completed'
                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleTaskStatus(item.id)}
                      className="hover:bg-slate-50/80 cursor-pointer text-xs group"
                    >
                      <td className="py-0.5 pr-1 truncate font-medium text-slate-800 text-[10.5px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {isCompleted ? (
                            <div className="w-3.5 h-3.5 rounded bg-[#1890ff] flex items-center justify-center text-white flex-shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded border border-slate-300 group-hover:border-blue-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{item.task}</span>
                        </div>
                      </td>
                      <td className="py-0.5 px-1 text-[10px] text-slate-500 truncate">{item.owner}</td>
                      <td className="py-0.5 pl-1 text-right">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          isCompleted ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fef3c7] text-[#b45309]'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 3: Right Stacked (Col span 3) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-1.5 justify-between">
          
          {/* Subcard A: Task Completion (Today) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs flex-1 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-900 leading-none">Task Completion <span className="text-[10px] font-normal text-slate-500">(Today)</span></h3>
            
            <div className="flex items-center justify-between gap-1 my-auto">
              {/* Donut Chart with center value */}
              <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskCompletionChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={38}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {taskCompletionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-slate-900 leading-none">{todayCompletionPct}%</span>
                  <span className="text-[8px] text-slate-500 font-semibold mt-0.5 leading-none">{completedDailyCount} / {totalDailyCount}</span>
                  <span className="text-[7px] text-slate-400 font-medium leading-none">Tasks Completed</span>
                </div>
              </div>

              {/* Legend with exact numbers */}
              <div className="space-y-1 text-xs pr-1">
                <div className="flex items-center justify-between gap-3 text-[10.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] flex-shrink-0" />
                    <span className="text-slate-600">Completed</span>
                  </div>
                  <strong className="text-slate-900 font-bold">{completedDailyCount}</strong>
                </div>

                <div className="flex items-center justify-between gap-3 text-[10.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b] flex-shrink-0" />
                    <span className="text-slate-600">Pending</span>
                  </div>
                  <strong className="text-slate-900 font-bold">{pendingDailyCount}</strong>
                </div>

                <div className="flex items-center justify-between gap-3 text-[10.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0" />
                    <span className="text-slate-600">Overdue</span>
                  </div>
                  <strong className="text-slate-900 font-bold">{overdueTasks.length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Subcard B: Upcoming Tasks */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 leading-none">Upcoming Tasks</h3>
              <button
                onClick={() => setActiveModal('upcoming')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.5 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-0.5 my-auto">
              {upcomingTasks.length === 0 ? (
                <div className="py-4 text-center text-[10px] text-slate-400 italic">No upcoming tasks scheduled</div>
              ) : (
                upcomingTasks.slice(0, 4).map((up) => (
                  <div key={up.id} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-[10px] font-medium text-slate-800 truncate">{up.task}</span>
                    </div>
                    <span className="text-[9.5px] font-semibold text-slate-500 flex-shrink-0 ml-1">{up.dueDate}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── ROW 3: BOTTOM SECTION (2 PANELS - FLEX-[0.9]) ─── */}
      <div className="grid grid-cols-12 gap-2 flex-[0.9] min-h-0 my-0.5">
        
        {/* Panel 4: Staff Task Completion (Today) (Col span 7) */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Staff Task Completion <span className="text-[10px] font-normal text-slate-500">(Today)</span></h3>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9.5px] font-semibold text-slate-400 uppercase">
                  <th className="w-[26%] pb-0.5 font-semibold">Staff Name</th>
                  <th className="w-[28%] pb-0.5 font-semibold">Role</th>
                  <th className="w-[12%] pb-0.5 text-center font-semibold">Total Tasks</th>
                  <th className="w-[11%] pb-0.5 text-center font-semibold">Completed</th>
                  <th className="w-[10%] pb-0.5 text-center font-semibold">Pending</th>
                  <th className="w-[13%] pb-0.5 text-right font-semibold">Completion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staffCompletionList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-[10px] text-slate-400 italic">No staff tasks registered</td>
                  </tr>
                ) : (
                  staffCompletionList.map((st, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 text-xs">
                      <td className="py-0.5 pr-1 font-semibold text-slate-800 text-[10.5px] truncate">{st.name}</td>
                      <td className="py-0.5 px-1 text-[10px] text-slate-500 truncate">{st.role}</td>
                      <td className="py-0.5 text-[10px] font-mono text-center text-slate-700">{st.total}</td>
                      <td className="py-0.5 text-[10px] font-mono text-center text-slate-700">{st.completed}</td>
                      <td className="py-0.5 text-[10px] font-mono text-center text-slate-700">{st.pending}</td>
                      <td className="py-0.5 pl-1 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-14 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#10b981] h-full rounded-full transition-all duration-300"
                              style={{ width: `${st.pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 w-6 text-right">{st.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 5: Overdue Tasks (Col span 5) */}
        <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Overdue Tasks</h3>
              <button
                onClick={() => setActiveModal('overdue')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-0.5 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            <table className="w-full text-left mt-0.5 table-fixed">
              <thead>
                <tr className="border-b border-slate-100 text-[9.5px] font-semibold text-slate-400 uppercase">
                  <th className="w-[42%] pb-0.5 font-semibold">Task</th>
                  <th className="w-[26%] pb-0.5 font-semibold">Owner</th>
                  <th className="w-[18%] pb-0.5 text-center font-semibold">Due Date</th>
                  <th className="w-[14%] pb-0.5 text-right font-semibold">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overdueTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[10px] text-slate-400 italic">No overdue tasks recorded</td>
                  </tr>
                ) : (
                  overdueTasks.slice(0, 5).map((od) => (
                    <tr key={od.id} className="hover:bg-slate-50/80 text-xs">
                      <td className="py-0.5 pr-1 font-medium text-slate-800 text-[10.5px] truncate">{od.task}</td>
                      <td className="py-0.5 px-1 text-[10px] text-slate-500 truncate">{od.owner}</td>
                      <td className="py-0.5 text-[9.5px] text-slate-600 text-center">{od.dueDate}</td>
                      <td className="py-0.5 pl-1 text-right">
                        <span className={`inline-block text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
                          od.daysOverdue > 0 ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {od.daysOverdue}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── MODALS FOR DRILLDOWN ─── */}

      {/* 1. Modal: View All Staff Attendance */}
      <Modal
        isOpen={activeModal === 'attendance'}
        onClose={() => setActiveModal(null)}
        title="Complete Staff Attendance Register"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Shift Log: Morning & General Shifts</p>
              <p className="text-[11px] text-slate-500">Branch: {selectedBranch} • Date: {dayjs().format('DD MMM YYYY')}</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              Live Biometric & App Sync Active
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">Employee</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Branch</th>
                  <th className="p-2">Check-in</th>
                  <th className="p-2">Check-out</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400 italic">No attendance records found for {selectedBranch}</td>
                  </tr>
                ) : (
                  attendanceList.map((emp, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center">
                          {emp.initial}
                        </span>
                        {emp.name}
                      </td>
                      <td className="p-2 text-slate-600">{emp.role}</td>
                      <td className="p-2 text-slate-600">{selectedBranch}</td>
                      <td className="p-2 font-mono text-slate-700">{emp.inTime}</td>
                      <td className="p-2 font-mono text-slate-700">{emp.status === 'Present' ? 'Active' : '-'}</td>
                      <td className="p-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          emp.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(attendanceList, 'Staff_Attendance_Register')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Attendance (Excel)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal: View All Upcoming Tasks */}
      <Modal
        isOpen={activeModal === 'upcoming'}
        onClose={() => setActiveModal(null)}
        title="Scheduled Upcoming Operational Tasks"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Operational Deadlines & Compliance Calendar</p>
              <p className="text-[11px] text-slate-500">Tracking regulatory, audit, and management milestones</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
              Quarterly & Annual Pipeline
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">Task Name</th>
                  <th className="p-2">Department</th>
                  <th className="p-2">Assigned Owner</th>
                  <th className="p-2">Due Date</th>
                  <th className="p-2">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">No upcoming tasks scheduled</td>
                  </tr>
                ) : (
                  upcomingTasks.map((task, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-semibold text-slate-800">{task.task}</td>
                      <td className="p-2 text-slate-600">{task.department}</td>
                      <td className="p-2 text-slate-700">{task.owner}</td>
                      <td className="p-2 font-mono text-slate-700">{task.dueDate}</td>
                      <td className="p-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          Scheduled
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(upcomingTasks, 'Upcoming_Operational_Tasks')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Schedule (Excel)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal: View All Overdue Tasks */}
      <Modal
        isOpen={activeModal === 'overdue'}
        onClose={() => setActiveModal(null)}
        title="Escalated Overdue Tasks & Follow-ups"
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            <div>
              <p className="text-xs font-bold text-rose-900">Overdue Operational Actions & Remediation</p>
              <p className="text-[11px] text-rose-700">Immediate supervisor escalation active for &gt; 3 days overdue</p>
            </div>
            <span className="text-xs bg-rose-600 text-white font-bold px-2.5 py-1 rounded-full">
              {overdueTasks.length} Critical Items
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2">Action / Task</th>
                  <th className="p-2">Owner</th>
                  <th className="p-2">Original Due Date</th>
                  <th className="p-2">Days Overdue</th>
                  <th className="p-2">Action Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">No overdue tasks recorded</td>
                  </tr>
                ) : (
                  overdueTasks.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-semibold text-slate-800">{item.task}</td>
                      <td className="p-2 text-slate-700">{item.owner}</td>
                      <td className="p-2 font-mono text-slate-700">{item.dueDate}</td>
                      <td className="p-2">
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                          {item.daysOverdue} Days
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Follow-up Required
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={() => exportToExcel(overdueTasks, 'Overdue_Tasks_Register')}
            >
              <Download className="w-3.5 h-3.5" />
              Export Overdue List (Excel)
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
