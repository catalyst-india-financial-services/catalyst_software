import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { ExtendedCustomer } from '@/services/customerProfileService'
import {
  ArrowLeft, Phone, MapPin, Building, CheckCircle2, FileText, CreditCard,
  ShieldCheck, HelpCircle, Building2, UserCheck, RefreshCw, BarChart2, Plus,
  Download, Eye, SquarePen, Trash2, Upload, SlidersHorizontal, UserPlus,
  Mail, Calendar, Briefcase, Award, TrendingUp, TrendingDown, Star, Activity,
  Clock, ShieldAlert, AlertTriangle, FileText as DocIcon, MessageSquare,
  Sparkles, Pin, Check, X, Printer, FileSpreadsheet, Lock, MoreVertical, Globe, Languages
} from 'lucide-react'
import {
  useCustomerProfile, useUpdateCustomerProfile, useCustomerProjects, useSaveCustomerProject,
  useDeleteCustomerProject, useCustomerQuotations, useSaveCustomerQuotation, useCustomerInvoices,
  useSaveCustomerInvoice, useCustomerPayments, useSaveCustomerPayment, useCustomerDocuments,
  useSaveCustomerDocument, useDeleteCustomerDocument, useCustomerCommunications,
  useSaveCustomerCommunication, useCustomerFollowups, useSaveCustomerFollowup, useCustomerNotes,
  useSaveCustomerNote, useDeleteCustomerNote, useCustomerActivities, useSaveCustomerActivity
} from '@/hooks/useDb'
import {
  Button, Card, CardHeader, CardTitle, CardBody, Avatar, StatusBadge, Badge,
  Input, Select, Textarea
} from '@/components/ui'
import { formatCurrency, formatDate, maskAadhaar, maskPAN, cn } from '@/utils'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import dayjs from 'dayjs'

const COMPLIANCE_STATUS_VARIANTS = {
  Compliant: 'success',
  Pending: 'warning',
  'Non-Compliant': 'destructive',
  Blocked: 'destructive',
} as any

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
]

const languageOptions = [
  { value: 'English', label: 'English' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Telugu', label: 'Telugu' },
  { value: 'Malayalam', label: 'Malayalam' },
  { value: 'Kannada', label: 'Kannada' }
]

const categoryOptions = [
  { value: 'Salaried', label: 'Salaried' },
  { value: 'Self-Employed', label: 'Self-Employed' },
  { value: 'Business Owner', label: 'Business Owner' },
  { value: 'Professional', label: 'Professional' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Student', label: 'Student' }
]

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' }
]

const typeOptions = [
  { value: 'Individual', label: 'Individual' },
  { value: 'Business', label: 'Business' }
]

const sourceOptions = [
  { value: 'Referral', label: 'Referral' },
  { value: 'Google Search', label: 'Google Search' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Email Campaign', label: 'Email Campaign' },
  { value: 'Cold Call', label: 'Cold Call' },
  { value: 'Advertisement', label: 'Advertisement' },
  { value: 'Exhibition', label: 'Exhibition' },
  { value: 'Other', label: 'Other' }
]

const branchOptions = [
  { value: 'Namakkal', label: 'Namakkal' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Coimbatore', label: 'Coimbatore' },
  { value: 'Salem', label: 'Salem' },
  { value: 'Erode', label: 'Erode' },
  { value: 'Trichy', label: 'Trichy' },
  { value: 'Madurai', label: 'Madurai' },
  { value: 'Vellore', label: 'Vellore' }
]

const employeeOptions = [
  { value: 'Karthik S', label: 'Karthik S (Sales)' },
  { value: 'Priya R', label: 'Priya R (Manager)' },
  { value: 'Arun Kumar', label: 'Arun Kumar (Officer)' },
  { value: 'Senthil S', label: 'Senthil S (Executive)' },
  { value: 'Admin', label: 'Admin (Director)' }
]

const verificationOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' }
]

const riskOptions = [
  { value: 'low', label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high', label: 'High Risk' }
]

const fraudOptions = [
  { value: 'passed', label: 'Passed' },
  { value: 'warning', label: 'Warning Flag' },
  { value: 'failed', label: 'Failed Check' }
]

const complianceStatusOptions = [
  { value: 'compliant', label: 'Compliant' },
  { value: 'pending', label: 'Pending Audit' },
  { value: 'non-compliant', label: 'Non-Compliant' },
  { value: 'blocked', label: 'Blocked / Suspended' }
]

const paymentTermOptions = [
  { value: 'Immediate', label: 'Immediate Payment' },
  { value: 'Net 15', label: 'Net 15 Days' },
  { value: 'Net 30', label: 'Net 30 Days' },
  { value: 'Net 60', label: 'Net 60 Days' },
  { value: 'COD', label: 'Cash on Delivery' }
]

const stateOptions = [
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' }
]

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customerId = id || ''

  // --- Auth Store & User Role ---
  const { user } = useAuthStore()
  const userRole = user?.role || 'staff'

  // --- Inline Edit Mode States ---
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<ExtendedCustomer>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // --- Dynamic Queries ---
  const { data: customer, isLoading: isCustLoading, refetch: refetchCust } = useCustomerProfile(customerId)
  const { data: projects = [], isLoading: isProjLoading } = useCustomerProjects(customerId)
  const { data: quotations = [], isLoading: isQuotsLoading } = useCustomerQuotations(customerId)
  const { data: invoices = [], isLoading: isInvsLoading } = useCustomerInvoices(customerId)
  const { data: payments = [], isLoading: isPaysLoading } = useCustomerPayments(customerId)
  const { data: documents = [], isLoading: isDocsLoading } = useCustomerDocuments(customerId)
  const { data: communications = [], isLoading: isCommsLoading } = useCustomerCommunications(customerId)
  const { data: followups = [], isLoading: isFupsLoading } = useCustomerFollowups(customerId)
  const { data: notes = [], isLoading: isNotesLoading } = useCustomerNotes(customerId)
  const { data: activities = [], isLoading: isActsLoading } = useCustomerActivities(customerId)

  // --- Mutations ---
  const updateProfile = useUpdateCustomerProfile()
  const saveProject = useSaveCustomerProject()
  const deleteProject = useDeleteCustomerProject()
  const saveQuotation = useSaveCustomerQuotation()
  const saveInvoice = useSaveCustomerInvoice()
  const savePayment = useSaveCustomerPayment()
  const saveDocument = useSaveCustomerDocument()
  const deleteDocument = useDeleteCustomerDocument()
  const saveCommunication = useSaveCustomerCommunication()
  const saveFollowup = useSaveCustomerFollowup()
  const saveNote = useSaveCustomerNote()
  const deleteNote = useDeleteCustomerNote()
  const saveActivity = useSaveCustomerActivity()

  // Track changes to prevent leaving with unsaved changes
  const hasChanges = useMemo(() => {
    if (!isEditing || !customer) return false

    // Check if any field differs between formData and customer
    for (const key in formData) {
      const typedKey = key as keyof ExtendedCustomer
      if (formData[typedKey] !== customer[typedKey]) {
        return true
      }
    }
    return false
  }, [isEditing, formData, customer])

  // Canvas Image Compression Helper
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const max_width = 400
          const max_height = 400
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > max_width) {
              height *= max_width / width
              width = max_width
            }
          } else {
            if (height > max_height) {
              width *= max_height / height
              height = max_height
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          resolve(compressedBase64)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Role permissions checks
  const canEditField = (fieldName: keyof ExtendedCustomer) => {
    if (userRole === 'admin') return true

    // Manager restrictions
    if (userRole === 'manager') {
      const managerReadOnly: (keyof ExtendedCustomer)[] = ['customer_id', 'compliance_status']
      return !managerReadOnly.includes(fieldName)
    }

    // Staff restrictions (Staff can only edit contact details, basic details, and addresses)
    if (userRole === 'staff') {
      const staffAllowed: (keyof ExtendedCustomer)[] = [
        'name', 'photo_url', 'mobile', 'whatsapp', 'alt_mobile', 'email',
        'dob', 'gender', 'occupation', 'company', 'pref_language',
        'address', 'billing_address', 'shipping_address', 'permanent_address',
        'city', 'district', 'state', 'pincode', 'country', 'google_maps_url'
      ]
      return staffAllowed.includes(fieldName)
    }

    return false
  }

  const handleFieldChange = (key: keyof ExtendedCustomer, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    // Clear validation error on change
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleStartEditInline = () => {
    if (!customer) return
    setFormData({ ...customer })
    setValidationErrors({})
    setIsEditing(true)
  }

  const handleCancelInlineProfile = () => {
    if (hasChanges) {
      const confirmDiscard = window.confirm("You have unsaved changes. Do you want to Discard them?")
      if (!confirmDiscard) return
    }
    setIsEditing(false)
    setFormData({})
    setValidationErrors({})
  }

  const handleSaveInlineProfile = async () => {
    if (!customer) return

    const errors: Record<string, string> = {}

    // Format checking using standard patterns
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid Email Address format'
    }
    if (formData.mobile && !/^[0-9]{10}$/.test(formData.mobile)) {
      errors.mobile = 'Mobile Number must be exactly 10 digits'
    }
    if (formData.alt_mobile && !/^[0-9]{10}$/.test(formData.alt_mobile)) {
      errors.alt_mobile = 'Alternate Mobile must be exactly 10 digits'
    }
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.pan)) {
      errors.pan = 'Invalid PAN format (e.g. ABCDE1234F)'
    }
    if (formData.aadhaar && !/^[0-9]{12}$/.test(formData.aadhaar.replace(/\s/g, ''))) {
      errors.aadhaar = 'Invalid Aadhaar format (must be 12 digits)'
    }
    if (formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifsc)) {
      errors.ifsc = 'Invalid IFSC format (e.g. SBIN0001234)'
    }
    if (formData.kyc_gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(formData.kyc_gst)) {
      errors.kyc_gst = 'Invalid GST format (e.g. 22AAAAA0000A1Z5)'
    }
    if (formData.website && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(formData.website)) {
      errors.website = 'Invalid Website URL format'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error('Please resolve validation errors before saving.')
      return
    }

    // Create changed payload delta (PATCH simulation)
    const patchPayload: Partial<ExtendedCustomer> = {}
    for (const key in formData) {
      const typedKey = key as keyof ExtendedCustomer
      if (formData[typedKey] !== customer[typedKey]) {
        patchPayload[typedKey] = formData[typedKey] as any
      }
    }

    if (Object.keys(patchPayload).length === 0) {
      setIsEditing(false)
      toast.info('No changes detected.')
      return
    }

    try {
      await updateProfile.mutateAsync({ customerId, payload: patchPayload })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Profile Updated',
          description: 'Profile details updated via in-place edit',
          icon_color: 'amber'
        }
      })
      setIsEditing(false)
      setValidationErrors({})
      toast.success('Profile Updated Successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes.')
    }
  }

  // React Router and beforeunload Navigation Blocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm("You have unsaved changes. Do you want to Discard them?")
      if (proceed) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Do you want to Save or Discard?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  // --- Editable Field Renderer Utility ---
  const renderEditableField = (
    label: string,
    key: keyof ExtendedCustomer,
    type: 'text' | 'number' | 'email' | 'url' | 'date' | 'textarea' | 'select' | 'checkbox',
    options?: { value: string; label: string }[],
    placeholder?: string
  ) => {
    const isEditable = canEditField(key)
    const val = formData[key]

    // Format check for empty values
    const hasValue = val !== undefined && val !== null && val !== ''
    const displayVal = hasValue ? val : ''

    if (!isEditing) {
      const dbVal = customer?.[key]
      const hasDbVal = dbVal !== undefined && dbVal !== null && dbVal !== ''
      let formattedDisplay = hasDbVal ? dbVal : ''

      if (type === 'checkbox') {
        formattedDisplay = dbVal ? 'Yes' : 'No'
      } else if (key === 'monthly_income' || key === 'annual_income' || key === 'credit_limit' || key === 'advance_received') {
        formattedDisplay = hasDbVal ? formatCurrency(Number(dbVal)) : ''
      } else if (key === 'aadhaar' && hasDbVal) {
        formattedDisplay = maskAadhaar(String(dbVal))
      } else if (key === 'pan' && hasDbVal) {
        formattedDisplay = maskPAN(String(dbVal))
      } else if (key === 'account_number' && hasDbVal) {
        const str = String(dbVal)
        formattedDisplay = str.length > 4 ? `XXXX XXXX ${str.slice(-4)}` : str
      }

      return (
        <div className="py-2.5">
          <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">
            {hasDbVal ? (
              type === 'url' ? (
                <a
                  href={String(dbVal).startsWith('http') ? String(dbVal) : `https://${dbVal}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {String(dbVal)}
                </a>
              ) : (
                String(formattedDisplay)
              )
            ) : (
              <span className="text-slate-350 italic font-medium">Enter {label}</span>
            )}
          </p>
        </div>
      )
    }

    // Edit Mode Input Components
    return (
      <div className="py-1">
        <label className="text-[10px] uppercase font-bold text-slate-405 flex items-center gap-1">
          {label} {!isEditable && <Lock className="h-3 w-3 text-slate-300" />}
        </label>
        <div className="mt-1">
          {type === 'textarea' ? (
            <textarea
              value={displayVal as string}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              disabled={!isEditable}
              placeholder={placeholder || `Enter ${label}`}
              className={cn(
                "form-input text-xs font-bold w-full border-blue-200 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-100 rounded-xl p-2.5 min-h-[60px]",
                !isEditable && "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
              )}
            />
          ) : type === 'select' ? (
            <select
              value={displayVal as string}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              disabled={!isEditable}
              className={cn(
                "form-input text-xs font-bold w-full border-blue-200 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-100 rounded-xl p-2.5 h-10 appearance-none bg-white",
                !isEditable && "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <option value="">Select {label}</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : type === 'checkbox' ? (
            <div className="flex items-center gap-2 h-10">
              <input
                type="checkbox"
                checked={!!val}
                onChange={(e) => handleFieldChange(key, e.target.checked)}
                disabled={!isEditable}
                className={cn(
                  "rounded text-brand-600 focus:ring-brand-500 h-4 w-4 border-blue-200",
                  !isEditable && "cursor-not-allowed opacity-50"
                )}
              />
              <span className="text-xs font-bold text-slate-600">{val ? 'Yes' : 'No'}</span>
            </div>
          ) : (
            <input
              type={type}
              value={displayVal as string | number}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              disabled={!isEditable}
              placeholder={placeholder || `Enter ${label}`}
              className={cn(
                "form-input text-xs font-bold w-full border-blue-200 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-100 rounded-xl p-2.5 h-10",
                !isEditable && "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
              )}
            />
          )}
        </div>
        {validationErrors[key] && (
          <p className="text-red-500 text-[10px] font-bold mt-1">{validationErrors[key]}</p>
        )}
      </div>
    )
  }

  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState<string>('basic')

  // --- UI Filter & Search States ---
  const [projectSearch, setProjectSearch] = useState('')
  const [projectStatusFilter, setProjectStatusFilter] = useState('all')
  const [noteSearch, setNoteSearch] = useState('')

  // --- Modal Open States ---
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [isCommModalOpen, setIsCommModalOpen] = useState(false)
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)

  // --- Form Data States ---
  const [profileForm, setProfileForm] = useState<any>(null)
  const [projectForm, setProjectForm] = useState<any>({ project_name: '', project_id: '', start_date: '', end_date: '', status: 'Running', amount: '', progress: 0, assigned_employee: '' })
  const [quotationForm, setQuotationForm] = useState<any>({ quotation_number: '', date: '', amount: '', status: 'Pending', converted: false })
  const [invoiceForm, setInvoiceForm] = useState<any>({ invoice_number: '', invoice_date: '', due_date: '', amount: '', paid: 0 })
  const [paymentForm, setPaymentForm] = useState<any>({ payment_date: '', amount: '', payment_method: 'UPI', reference_number: '', collected_by: '', status: 'Success' })
  const [docForm, setDocForm] = useState<any>({ document_name: '', document_type: 'Agreement', file_url: '#', file_size: '1.2 MB' })
  const [commForm, setCommForm] = useState<any>({ type: 'Call', date: '', time: '', employee: '', description: '', status: 'Completed' })
  const [followupForm, setFollowupForm] = useState<any>({ followup_date: '', reminder_date: '', reminder_time: '', customer_response: '', next_action: '', assigned_staff: '', status: 'pending' })
  const [noteForm, setNoteForm] = useState<any>({ content: '', is_pinned: false })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Check Loading ---
  const isGlobalLoading = isCustLoading || isProjLoading || isQuotsLoading || isInvsLoading || isPaysLoading || isDocsLoading || isCommsLoading || isFupsLoading || isNotesLoading || isActsLoading

  // --- Dynamic Stats calculation ---
  const totalOutstanding = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + Number(inv.pending), 0)
  }, [invoices])

  const totalPaid = useMemo(() => {
    return payments.filter(p => p.status === 'Success').reduce((sum, p) => sum + Number(p.amount), 0)
  }, [payments])

  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => p.status === 'Running').length
  }, [projects])

  const pendingPaymentsCount = useMemo(() => {
    return invoices.filter((inv) => Number(inv.pending) > 0).length
  }, [invoices])

  const lastActivityText = useMemo(() => {
    if (activities.length === 0) return 'None'
    const sorted = [...activities].sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix())
    return `${sorted[0].activity_type} (${dayjs(sorted[0].created_at).format('DD MMM YYYY')})`
  }, [activities])

  // --- Charts Data Format ---
  const revenueChartData = useMemo(() => {
    // Group payments by month
    const groups: Record<string, number> = {}
    payments.forEach(p => {
      if (p.status === 'Success') {
        const m = dayjs(p.payment_date).format('MMM YYYY')
        groups[m] = (groups[m] || 0) + Number(p.amount)
      }
    })
    const keys = Object.keys(groups).sort((a, b) => dayjs(a).unix() - dayjs(b).unix())
    return keys.map(k => ({ name: k, Revenue: groups[k] }))
  }, [payments])

  const paymentCollectionData = useMemo(() => {
    // Paid vs Pending
    return [
      { name: 'Paid Amount', value: totalPaid, color: '#10B981' },
      { name: 'Outstanding', value: totalOutstanding, color: '#EF4444' }
    ]
  }, [totalPaid, totalOutstanding])

  const outstandingProjectData = useMemo(() => {
    // Project status breakdown
    const running = projects.filter(p => p.status === 'Running').length
    const completed = projects.filter(p => p.status === 'Completed').length
    const pending = projects.filter(p => p.status === 'Pending').length
    return [
      { name: 'Running', value: running, color: '#3B82F6' },
      { name: 'Completed', value: completed, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#F59E0B' }
    ]
  }, [projects])

  // --- Export Actions ---
  const handleExportPDF = () => {
    if (!customer) return
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text(`Customer Profile Report - ${customer.name}`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Customer ID: ${customer.customer_id}`, 14, 28)
    doc.text(`Mobile: ${customer.mobile} | Email: ${customer.email || 'N/A'}`, 14, 34)
    doc.text(`Status: ${customer.status.toUpperCase()} | Type: ${customer.customer_type}`, 14, 40)

    // Add brief info
    doc.text(`Total Outstanding: Rs. ${totalOutstanding.toLocaleString('en-IN')}`, 14, 50)
    doc.text(`Total Paid: Rs. ${totalPaid.toLocaleString('en-IN')}`, 14, 56)

    // AutoTable for Invoices
    const invoiceRows = invoices.map(i => [i.invoice_number, i.invoice_date, i.due_date, `Rs. ${i.amount}`, `Rs. ${i.paid}`, `Rs. ${i.pending}`])
      ; (doc as any).autoTable({
        startY: 65,
        head: [['Invoice #', 'Date', 'Due Date', 'Amount', 'Paid', 'Pending']],
        body: invoiceRows,
      })

    doc.save(`Customer_Profile_${customer.customer_id}.pdf`)
    toast.success('PDF report exported successfully!')
  }

  const handleExportExcel = () => {
    if (!customer) return
    const data = [
      { Field: 'Customer ID', Value: customer.customer_id },
      { Field: 'Full Name', Value: customer.name },
      { Field: 'Mobile', Value: customer.mobile },
      { Field: 'Email', Value: customer.email || '' },
      { Field: 'Customer Since', Value: formatDate(customer.created_at) },
      { Field: 'Category', Value: customer.category },
      { Field: 'Type', Value: customer.customer_type },
      { Field: 'Branch', Value: customer.branch },
      { Field: 'Monthly Income', Value: customer.monthly_income || '' },
      { Field: 'Outstanding Amount', Value: totalOutstanding },
      { Field: 'Paid Amount', Value: totalPaid }
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Profile Info')
    XLSX.writeFile(wb, `Customer_Profile_${customer.customer_id}.xlsx`)
    toast.success('Excel spreadsheet exported successfully!')
  }

  const handlePrint = () => {
    window.print()
  }

  // --- Photo Uploader ---
  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const compressedBase64 = await compressImage(file)
        if (isEditing) {
          handleFieldChange('photo_url', compressedBase64)
          toast.success('Photo updated. Click Save to apply changes.')
        } else {
          await updateProfile.mutateAsync({ customerId, payload: { photo_url: compressedBase64 } })
          await saveActivity.mutateAsync({
            customerId,
            activity: {
              activity_type: 'Profile Updated',
              description: 'Customer profile photo uploaded',
              icon_color: 'amber'
            }
          })
          toast.success('Profile photo updated successfully!')
        }
      } catch (err: any) {
        toast.error('Failed to upload photo: ' + err.message)
      }
    }
  }


  // --- Save Form Callbacks ---
  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({ customerId, payload: profileForm })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Profile Updated',
          description: 'Personal details updated',
          icon_color: 'amber'
        }
      })
      setIsEditProfileOpen(false)
      toast.success('Profile updated successfully!')
    } catch {
      toast.error('Failed to update profile.')
    }
  }

  const handleAddProject = async () => {
    try {
      await saveProject.mutateAsync({ customerId, project: projectForm })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Order Completed',
          description: `Project "${projectForm.project_name}" recorded`,
          icon_color: 'blue'
        }
      })
      setIsProjectModalOpen(false)
      setProjectForm({ project_name: '', project_id: '', start_date: '', end_date: '', status: 'Running', amount: '', progress: 0, assigned_employee: '' })
      toast.success('Project/Order added successfully!')
    } catch {
      toast.error('Failed to add project.')
    }
  }

  const handleAddQuotation = async () => {
    try {
      await saveQuotation.mutateAsync({ customerId, quotation: quotationForm })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Quotation Sent',
          description: `Quotation ${quotationForm.quotation_number} generated`,
          icon_color: 'purple'
        }
      })
      setIsQuotationModalOpen(false)
      setQuotationForm({ quotation_number: '', date: '', amount: '', status: 'Pending', converted: false })
      toast.success('Quotation generated successfully!')
    } catch {
      toast.error('Failed to generate quotation.')
    }
  }

  const handleAddInvoice = async () => {
    try {
      const invPayload = {
        ...invoiceForm,
        pending: invoiceForm.amount - invoiceForm.paid
      }
      await saveInvoice.mutateAsync({ customerId, invoice: invPayload })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Invoice Generated',
          description: `Invoice ${invoiceForm.invoice_number} created`,
          icon_color: 'blue'
        }
      })
      setIsInvoiceModalOpen(false)
      setInvoiceForm({ invoice_number: '', invoice_date: '', due_date: '', amount: '', paid: 0 })
      toast.success('Invoice generated successfully!')
    } catch {
      toast.error('Failed to create invoice.')
    }
  }

  const handleAddPayment = async () => {
    try {
      await savePayment.mutateAsync({ customerId, payment: paymentForm })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Payment Received',
          description: `Payment of ${formatCurrency(paymentForm.amount)} received`,
          icon_color: 'emerald'
        }
      })
      setIsPaymentModalOpen(false)
      setPaymentForm({ payment_date: '', amount: '', payment_method: 'UPI', reference_number: '', collected_by: '', status: 'Success' })
      toast.success('Payment recorded successfully!')
    } catch {
      toast.error('Failed to record payment.')
    }
  }

  const handleAddDocument = async () => {
    try {
      await saveDocument.mutateAsync({ customerId, document: docForm })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Document Uploaded',
          description: `Document "${docForm.document_name}" uploaded`,
          icon_color: 'indigo'
        }
      })
      setIsDocModalOpen(false)
      setDocForm({ document_name: '', document_type: 'Agreement', file_url: '#', file_size: '1.2 MB' })
      toast.success('Document uploaded successfully!')
    } catch {
      toast.error('Failed to upload document.')
    }
  }

  const handleAddCommunication = async () => {
    try {
      await saveCommunication.mutateAsync({ customerId, communication: commForm })
      const activityMap: Record<string, string> = {
        Call: 'Call Completed',
        Email: 'Email Sent',
        WhatsApp: 'WhatsApp Sent',
        SMS: 'SMS Sent',
        Meeting: 'Meeting Done',
        Note: 'Note Added'
      }
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: activityMap[commForm.type] || 'Log Completed',
          description: `Communication of type ${commForm.type} logged`,
          icon_color: 'sky'
        }
      })
      setIsCommModalOpen(false)
      setCommForm({ type: 'Call', date: '', time: '', employee: '', description: '', status: 'Completed' })
      toast.success('Communication logged successfully!')
    } catch {
      toast.error('Failed to log communication.')
    }
  }

  const handleAddFollowup = async () => {
    try {
      await saveFollowup.mutateAsync({ customerId, followup: followupForm })
      await saveActivity.mutateAsync({
        customerId,
        activity: {
          activity_type: 'Follow-up Done',
          description: `Followup scheduled on ${followupForm.followup_date}`,
          icon_color: 'rose'
        }
      })
      setIsFollowupModalOpen(false)
      setFollowupForm({ followup_date: '', reminder_date: '', reminder_time: '', customer_response: '', next_action: '', assigned_staff: '', status: 'pending' })
      toast.success('Follow-up scheduled successfully!')
    } catch {
      toast.error('Failed to schedule follow-up.')
    }
  }

  const handleAddNote = async () => {
    try {
      const payload = {
        ...noteForm,
        date: dayjs().format('YYYY-MM-DD'),
        time: dayjs().format('hh:mm A'),
        employee_name: customer?.employee_assigned || 'Karthik S'
      }
      await saveNote.mutateAsync({ customerId, note: payload })
      setIsNoteModalOpen(false)
      setNoteForm({ content: '', is_pinned: false })
      toast.success('Note added successfully!')
    } catch {
      toast.error('Failed to add note.')
    }
  }

  // --- Skeletons for Loading State ---
  if (isGlobalLoading || !customer) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg mb-4" />
        <div className="h-40 bg-slate-200 rounded-3xl mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-10 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-slate-200 rounded-2xl" />
          <div className="h-[400px] bg-slate-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  // Set Profile form once loaded
  if (!profileForm) {
    setProfileForm(customer)
  }

  // Filtered lists
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.project_name.toLowerCase().includes(projectSearch.toLowerCase()) || p.project_id.toLowerCase().includes(projectSearch.toLowerCase())
    const matchesStatus = projectStatusFilter === 'all' ? true : p.status === projectStatusFilter
    return matchesSearch && matchesStatus
  })

  const filteredNotes = notes.filter((n) => n.content.toLowerCase().includes(noteSearch.toLowerCase()))
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return dayjs(b.date + ' ' + b.time, 'YYYY-MM-DD hh:mm A').unix() - dayjs(a.date + ' ' + a.time, 'YYYY-MM-DD hh:mm A').unix()
  })

  // Dynamic status check for Follow-ups
  const enrichedFollowups = followups.map((f) => {
    const isOverdue = f.status === 'pending' && dayjs(f.followup_date).isBefore(dayjs(), 'day')
    return {
      ...f,
      status: isOverdue ? 'overdue' as const : f.status
    }
  })

  // Recent activities filter (calls, payments, invoices, orders, followups, documents, emails, whatsapp)
  const recentActivitiesList = activities.slice(0, 15)

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">

      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider print:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      {/* --- CUSTOMER HEADER SECTION --- */}
      <Card className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full">
            <div className="relative group cursor-pointer flex-shrink-0" onClick={handlePhotoClick}>
              <Avatar
                name={isEditing ? (formData.name || '') : customer.name}
                src={isEditing ? (formData.photo_url || undefined) : (customer.photo_url || undefined)}
                size="xl"
                className="w-24 h-24 ring-4 ring-slate-100 shadow-lg text-slate-900 font-extrabold"
              />
              {isEditing ? (
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-100 flex flex-col items-center justify-center transition-all duration-200 gap-1 text-center">
                  <span className="text-[10px] text-white font-extrabold uppercase">Change</span>
                  {formData.photo_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFieldChange('photo_url', null)
                        toast.success('Photo removed. Save to apply.')
                      }}
                      className="text-[9px] text-red-300 font-extrabold uppercase hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left space-y-2 flex-grow min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="Enter Full Name"
                      className="form-input text-lg font-bold border-blue-200 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-100 rounded-xl px-2.5 py-1 w-64"
                    />
                    {validationErrors.name && <p className="text-red-500 text-[9px] mt-0.5">{validationErrors.name}</p>}
                  </div>
                ) : (
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{customer.name}</h1>
                )}

                {isEditing ? (
                  <select
                    value={formData.status || ''}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    disabled={!canEditField('status')}
                    className="form-input text-[11px] font-bold border-blue-200 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-2 py-0.5 w-24 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                ) : (
                  <StatusBadge status={customer.status === 'active' ? 'active' : 'inactive'} />
                )}

                {isEditing ? (
                  <select
                    value={formData.customer_type || ''}
                    onChange={(e) => handleFieldChange('customer_type', e.target.value)}
                    disabled={!canEditField('customer_type')}
                    className="form-input text-[11px] font-bold border-blue-200 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-2 py-0.5 w-28 bg-white"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Business">Business</option>
                  </select>
                ) : (
                  <Badge variant="outline" className="uppercase text-[10px] font-bold text-slate-500 bg-slate-50">
                    {customer.customer_type}
                  </Badge>
                )}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-slate-400 font-mono">CUST ID:</span>
                  <input
                    type="text"
                    value={formData.customer_id || ''}
                    disabled={!canEditField('customer_id')}
                    onChange={(e) => handleFieldChange('customer_id', e.target.value)}
                    className="form-input text-xs font-mono font-bold border-blue-200 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-2 py-0.5 w-40 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-mono">CUSTOMER ID: {customer.customer_id}</p>
              )}

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400">Mobile *</label>
                    <input
                      type="text"
                      value={formData.mobile || ''}
                      onChange={(e) => handleFieldChange('mobile', e.target.value)}
                      disabled={!canEditField('mobile')}
                      className="form-input text-xs font-bold border-blue-200 bg-blue-50/10 rounded-lg px-2 py-1 w-full"
                    />
                    {validationErrors.mobile && <p className="text-red-500 text-[9px]">{validationErrors.mobile}</p>}
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400">Email</label>
                    <input
                      type="text"
                      value={formData.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      disabled={!canEditField('email')}
                      className="form-input text-xs font-bold border-blue-200 bg-blue-50/10 rounded-lg px-2 py-1 w-full"
                    />
                    {validationErrors.email && <p className="text-red-500 text-[9px]">{validationErrors.email}</p>}
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400">Alternate Mobile</label>
                    <input
                      type="text"
                      value={formData.alt_mobile || ''}
                      onChange={(e) => handleFieldChange('alt_mobile', e.target.value)}
                      disabled={!canEditField('alt_mobile')}
                      className="form-input text-xs font-bold border-blue-200 bg-blue-50/10 rounded-lg px-2 py-1 w-full"
                    />
                    {validationErrors.alt_mobile && <p className="text-red-500 text-[9px]">{validationErrors.alt_mobile}</p>}
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400">Branch *</label>
                    <select
                      value={formData.branch || ''}
                      onChange={(e) => handleFieldChange('branch', e.target.value)}
                      disabled={!canEditField('branch')}
                      className="form-input text-xs font-bold border-blue-200 bg-blue-50/10 rounded-lg px-2 py-1 w-full bg-white h-8"
                    >
                      {branchOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400">Assigned Employee</label>
                    <select
                      value={formData.employee_assigned || ''}
                      onChange={(e) => handleFieldChange('employee_assigned', e.target.value)}
                      disabled={!canEditField('employee_assigned')}
                      className="form-input text-xs font-bold border-blue-200 bg-blue-50/10 rounded-lg px-2 py-1 w-full bg-white h-8"
                    >
                      {employeeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400">Lead Source</label>
                    <select
                      value={formData.lead_source || ''}
                      onChange={(e) => handleFieldChange('lead_source', e.target.value)}
                      disabled={!canEditField('lead_source')}
                      className="form-input text-xs font-bold border-blue-200 bg-blue-50/10 rounded-lg px-2 py-1 w-full bg-white h-8"
                    >
                      {sourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400">Customer Since</label>
                    <input
                      type="date"
                      value={formData.created_at ? dayjs(formData.created_at).format('YYYY-MM-DD') : ''}
                      disabled={!canEditField('created_at')}
                      onChange={(e) => handleFieldChange('created_at', e.target.value ? dayjs(e.target.value).toISOString() : '')}
                      className="form-input text-xs font-bold border-blue-200 bg-blue-50/10 rounded-lg px-2 py-1 w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-2.5 pt-2 text-xs text-slate-600 font-semibold">
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-blue-500" /> {customer.mobile}</span>
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-indigo-500" /> {customer.email || <span className="text-slate-350 italic font-medium">Enter Email</span>}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-500" /> {customer.city}, {customer.state}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-amber-500" /> Since {dayjs(customer.created_at).format('DD MMM YYYY')}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-sky-500" /> Assigned: {customer.employee_assigned || <span className="text-slate-350 italic font-medium">Unassigned</span>}</span>
                  <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-purple-500" /> Lead Source: {customer.lead_source || <span className="text-slate-350 italic font-medium">Unknown</span>}</span>
                  <span className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-teal-500" /> Branch: {customer.branch}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto print:hidden">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="flex-1 xl:flex-none bg-slate-100 text-slate-400 border-slate-200 font-bold"
                >
                  Editing...
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveInlineProfile}
                  loading={updateProfile.isPending}
                  className="flex-1 xl:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelInlineProfile}
                  className="flex-1 xl:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditInline}
                className="flex-1 xl:flex-none"
              >
                <SquarePen className="h-4 w-4" /> Edit Profile
              </Button>
            )}

            <div className="relative group flex-1 xl:flex-none">
              <Button variant="default" size="sm" className="w-full flex items-center justify-center gap-2">
                Actions <MoreVertical className="h-4 w-4" />
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 w-48 hidden group-hover:block z-50 transition-all">
                <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-2">
                  <DocIcon className="h-4 w-4 text-red-500" /> Export PDF Report
                </button>
                <button onClick={handleExportExcel} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Excel Sheet
                </button>
                <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-2">
                  <Printer className="h-4 w-4 text-slate-500" /> Print Profile
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* --- TOP SUMMARY CARDS --- */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2 font-mono">{formatCurrency(totalOutstanding)}</p>
            <span className="text-[9px] font-bold text-red-500 uppercase">Pending</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Paid</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2 font-mono">{formatCurrency(totalPaid)}</p>
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Received</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Orders</span>
              <Briefcase className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2 font-mono">{activeProjectsCount}</p>
            <span className="text-[9px] font-bold text-blue-500 uppercase">Running</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Payments</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-2 font-mono">{pendingPaymentsCount}</p>
            <span className="text-[9px] font-bold text-amber-500 uppercase">Invoices</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Rating</span>
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <p className="text-lg font-extrabold text-slate-900 font-mono">4.8</p>
              <span className="text-xs font-semibold text-slate-400">/5</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Excellent</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Activity</span>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xs font-extrabold text-slate-700 mt-3 truncate">{lastActivityText}</p>
            <span className="text-[9px] font-bold text-purple-500 uppercase">Timeline</span>
          </div>
        </div>
      </Card>

      {/* --- HORIZONTAL NAVIGATION TABS --- */}
      <div className="overflow-x-auto border-b border-slate-200 bg-white p-2 rounded-2xl shadow-2xs flex gap-1.5 scrollbar-thin print:hidden">
        {[
          { id: 'basic', label: 'Basic Info', icon: UserCheck },
          { id: 'address', label: 'Address', icon: MapPin },
          { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck },
          { id: 'company', label: 'Company Details', icon: Building2 },
          { id: 'financial', label: 'Financial Info', icon: CreditCard },
          { id: 'projects', label: 'Orders & Projects', icon: Briefcase },
          { id: 'quotations', label: 'Quotations', icon: FileText },
          { id: 'invoices', label: 'Invoices', icon: DocIcon },
          { id: 'payments', label: 'Payments', icon: CreditCard },
          { id: 'documents', label: 'Documents', icon: Upload },
          { id: 'communications', label: 'Communication Log', icon: MessageSquare },
          { id: 'notes', label: 'Notes', icon: Pin },
          { id: 'followups', label: 'Follow-ups', icon: Clock },
          { id: 'timeline', label: 'Timeline', icon: Activity },
          { id: 'risk', label: 'Risk & Compliance', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* --- MAIN PAGE CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dynamic Tab Contents Panel */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === 'basic' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle>Basic Information</CardTitle>
                <Badge variant="outline" className="text-slate-500 bg-slate-50">General Record</Badge>
              </CardHeader>
              <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {renderEditableField('Full Name', 'name', 'text', undefined, 'Enter Full Name')}
                {renderEditableField('Customer ID', 'customer_id', 'text', undefined, 'Enter Customer ID')}
                {renderEditableField('Date of Birth', 'dob', 'date', undefined, 'YYYY-MM-DD')}
                {renderEditableField('Gender', 'gender', 'select', genderOptions)}
                {renderEditableField('Mobile Number', 'mobile', 'text', undefined, '10-digit Mobile')}
                {renderEditableField('Alternate Mobile', 'alt_mobile', 'text', undefined, '10-digit Alternate Mobile')}
                {renderEditableField('Email Address', 'email', 'email', undefined, 'Enter Email Address')}
                {renderEditableField('Occupation', 'occupation', 'text', undefined, 'Enter Occupation')}
                {renderEditableField('Company / Employer', 'company', 'text', undefined, 'Enter Company/Employer')}
                {renderEditableField('GST Number', 'kyc_gst', 'text', undefined, 'Enter GST Number')}
                {renderEditableField('PAN Number', 'pan', 'text', undefined, 'Enter PAN Number')}
                {renderEditableField('Aadhaar Number', 'aadhaar', 'text', undefined, 'Enter Aadhaar Number')}
                {renderEditableField('Website', 'website', 'url', undefined, 'example.com')}
                {renderEditableField('Preferred Language', 'pref_language', 'select', languageOptions)}
                {renderEditableField('Customer Category', 'category', 'select', categoryOptions)}
                {renderEditableField('Status', 'status', 'select', statusOptions)}
              </CardBody>
            </Card>
          )}

          {/* TAB 2: ADDRESS */}
          {activeTab === 'address' && (
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Address Details</CardTitle>
              </CardHeader>
              <CardBody className="space-y-6 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {renderEditableField('Communication Address', 'address', 'textarea', undefined, 'Enter Communication Address')}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {renderEditableField('Permanent Address', 'permanent_address', 'textarea', undefined, 'Enter Permanent Address')}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {renderEditableField('Billing Address', 'billing_address', 'textarea', undefined, 'Enter Billing Address')}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {renderEditableField('Shipping Address', 'shipping_address', 'textarea', undefined, 'Enter Shipping Address')}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                  {renderEditableField('City', 'city', 'text', undefined, 'Enter City')}
                  {renderEditableField('District', 'district', 'text', undefined, 'Enter District')}
                  {renderEditableField('State', 'state', 'select', stateOptions)}
                  {renderEditableField('Country', 'country', 'text', undefined, 'Enter Country')}
                  {renderEditableField('Pincode', 'pincode', 'text', undefined, 'Enter Pincode')}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  {renderEditableField('Google Maps Location URL', 'google_maps_url', 'url', undefined, 'https://maps.google.com/?q=...')}
                </div>
              </CardBody>
            </Card>
          )}

          {/* TAB 3: KYC DETAILS */}
          {activeTab === 'kyc' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle>KYC & Identity Verification</CardTitle>
                <StatusBadge status={isEditing ? (formData.kyc_status || 'pending') : customer.kyc_status} />
              </CardHeader>
              <CardBody className="p-6 space-y-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderEditableField('Aadhaar Number', 'aadhaar', 'text', undefined, '12-digit Aadhaar')}
                    {renderEditableField('PAN Number', 'pan', 'text', undefined, '10-character PAN')}
                    {renderEditableField('GST Number', 'kyc_gst', 'text', undefined, 'GSTIN Number')}
                    {renderEditableField('Driving License', 'kyc_driving_license', 'text', undefined, 'DL Number')}
                    {renderEditableField('Passport', 'kyc_passport', 'text', undefined, 'Passport Number')}
                    {renderEditableField('Verification Status', 'kyc_status', 'select', verificationOptions)}
                    {renderEditableField('Verified By', 'kyc_verified_by', 'select', employeeOptions)}
                    {renderEditableField('Verification Date', 'kyc_verified_date', 'date')}
                    {renderEditableField('Expiry Date', 'kyc_expiry_date', 'date')}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Aadhaar Identity</p>
                          <p className="text-base font-mono font-bold text-slate-800">{customer.aadhaar ? maskAadhaar(customer.aadhaar) : 'Not Provided'}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle2 className="h-4 w-4" /> ID Verified</span>
                          <button className="text-brand-600 font-bold hover:underline">View Document</button>
                        </div>
                      </div>

                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">PAN Tax ID</p>
                          <p className="text-base font-mono font-bold text-slate-800">{customer.pan ? maskPAN(customer.pan) : 'Not Provided'}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle2 className="h-4 w-4" /> Tax ID Verified</span>
                          <button className="text-brand-600 font-bold hover:underline">View Document</button>
                        </div>
                      </div>

                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">GST Registration</p>
                          <p className="text-base font-mono font-bold text-slate-800">{customer.kyc_gst || 'Not Provided'}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle2 className="h-4 w-4" /> GST Checked</span>
                          <button className="text-brand-600 font-bold hover:underline">View Document</button>
                        </div>
                      </div>

                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Driving License / Passport</p>
                          <p className="text-sm font-mono font-bold text-slate-800 truncate">
                            DL: {customer.kyc_driving_license || 'N/A'} <br />
                            PP: {customer.kyc_passport || 'N/A'}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle2 className="h-4 w-4" /> Verified Docs</span>
                          <button className="text-brand-600 font-bold hover:underline">View Document</button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
                      <div><p className="text-[10px] uppercase font-bold text-slate-400">Verified By</p><p className="text-xs font-bold text-slate-800 mt-0.5">{customer.kyc_verified_by || 'System'}</p></div>
                      <div><p className="text-[10px] uppercase font-bold text-slate-400">Verification Date</p><p className="text-xs font-bold text-slate-800 mt-0.5">{customer.kyc_verified_date ? formatDate(customer.kyc_verified_date) : 'N/A'}</p></div>
                      <div><p className="text-[10px] uppercase font-bold text-slate-400">Documents Status</p><p className="text-xs text-emerald-600 font-extrabold mt-0.5">Approved</p></div>
                      <div><p className="text-[10px] uppercase font-bold text-slate-400">Expiry Date</p><p className="text-xs font-bold text-slate-800 mt-0.5">{customer.kyc_expiry_date ? formatDate(customer.kyc_expiry_date) : 'N/A'}</p></div>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )}

          {/* TAB 4: COMPANY DETAILS */}
          {activeTab === 'company' && (
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Company Details</CardTitle>
              </CardHeader>
              <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {renderEditableField('Customer Type', 'customer_type', 'select', typeOptions)}
                {renderEditableField('Company Name', 'company_name', 'text', undefined, 'Enter Company Name')}
                {renderEditableField('Industry / Segment', 'industry', 'text', undefined, 'Enter Industry')}
                {renderEditableField('Website', 'website', 'url', undefined, 'example.com')}
                {renderEditableField('GST Registration Number', 'kyc_gst', 'text', undefined, 'GST Number')}
                {renderEditableField('Company Tax ID (PAN)', 'pan', 'text', undefined, 'PAN Number')}
                {renderEditableField('Assigned Branch', 'branch', 'select', branchOptions)}
                {renderEditableField('Incorporation Date / Since', 'created_at', 'date')}
              </CardBody>
            </Card>
          )}

          {/* TAB 5: FINANCIAL INFORMATION */}
          {activeTab === 'financial' && (
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Financial Profile & Information</CardTitle>
              </CardHeader>
              <CardBody className="space-y-6 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {renderEditableField('Monthly Income', 'monthly_income', 'number', undefined, 'Enter Monthly Income')}
                  {renderEditableField('Annual Income', 'annual_income', 'number', undefined, 'Enter Annual Income')}
                  {renderEditableField('Credit Limit', 'credit_limit', 'number', undefined, 'Enter Credit Limit')}

                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl py-2.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Outstanding Balance</p>
                    <p className="text-lg font-extrabold text-red-500 font-mono mt-1">{formatCurrency(totalOutstanding)}</p>
                  </div>

                  {renderEditableField('Advance Received', 'advance_received', 'number', undefined, 'Enter Advance Amount')}

                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl py-2.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Business Value</p>
                    <p className="text-lg font-extrabold text-slate-800 font-mono mt-1">
                      {formatCurrency(projects.reduce((sum, p) => sum + Number(p.amount), 0))}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl py-2.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Orders</p>
                    <p className="text-lg font-extrabold text-slate-800 font-mono mt-1">{projects.length}</p>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl py-2.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg Order Value</p>
                    <p className="text-lg font-extrabold text-slate-800 font-mono mt-1">
                      {projects.length > 0 ? formatCurrency(projects.reduce((sum, p) => sum + Number(p.amount), 0) / projects.length) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Bank Account & Settlement Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderEditableField('Bank Name', 'bank_name', 'text', undefined, 'Enter Bank Name')}
                    {renderEditableField('Account Number', 'account_number', 'text', undefined, 'Enter Account Number')}
                    {renderEditableField('IFSC Code', 'ifsc', 'text', undefined, 'Enter IFSC Code')}
                    {renderEditableField('UPI ID', 'upi_id', 'text', undefined, 'Enter UPI ID')}
                    <div className="col-span-1 md:col-span-2">
                      {renderEditableField('Payment Terms', 'payment_terms', 'select', paymentTermOptions)}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}


          {/* TAB 6: PROJECTS / ORDERS */}
          {activeTab === 'projects' && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
                <CardTitle>Active Orders & Projects</CardTitle>
                <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search Projects..."
                    className="form-input text-xs h-9 py-1 px-3 w-40"
                  />
                  <Select
                    value={projectStatusFilter}
                    onChange={(e) => setProjectStatusFilter(e.target.value)}
                    options={[{ value: 'all', label: 'All Status' }, { value: 'Running', label: 'Running' }, { value: 'Completed', label: 'Completed' }, { value: 'Pending', label: 'Pending' }]}
                    className="w-32 h-9 border border-slate-200 text-xs rounded-xl"
                  />
                  <Button variant="default" size="sm" onClick={() => setIsProjectModalOpen(true)}>
                    <Plus className="h-4 w-4" /> New Project
                  </Button>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                {filteredProjects.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No projects or orders found matching search criteria.</div>
                ) : (
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Project Details</th>
                        <th>Project ID</th>
                        <th>Status</th>
                        <th>Timeline</th>
                        <th>Budget</th>
                        <th>Progress</th>
                        <th>Executive</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((p) => (
                        <tr key={p.id}>
                          <td className="font-bold text-slate-800">{p.project_name}</td>
                          <td className="font-mono text-xs text-brand-600 font-bold">{p.project_id}</td>
                          <td>
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                              p.status === 'Running' && 'bg-blue-50 text-blue-700 border border-blue-200/50',
                              p.status === 'Completed' && 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
                              p.status === 'Pending' && 'bg-amber-50 text-amber-700 border border-amber-200/50',
                            )}>
                              {p.status}
                            </span>
                          </td>
                          <td className="text-xs text-slate-500">
                            {formatDate(p.start_date)} - {formatDate(p.end_date)}
                          </td>
                          <td className="font-mono text-xs font-bold text-slate-800">{formatCurrency(p.amount)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600">{p.progress}%</span>
                            </div>
                          </td>
                          <td className="text-xs text-slate-600 font-medium">{p.assigned_employee}</td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Button variant="ghost" size="icon-sm" onClick={() => toast.info(`Viewing details of ${p.project_name}`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this project?')) {
                                    deleteProject.mutate({ customerId, projectId: p.id })
                                    toast.success('Project deleted.')
                                  }
                                }}
                                className="text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          )}

          {/* TAB 7: QUOTATIONS */}
          {activeTab === 'quotations' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle>Quotations & Estimates</CardTitle>
                <Button variant="default" size="sm" onClick={() => setIsQuotationModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Create Quotation
                </Button>
              </CardHeader>
              <div className="overflow-x-auto">
                {quotations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No active quotations found.</div>
                ) : (
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Quotation No.</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Lead Conversion</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map((q) => (
                        <tr key={q.id}>
                          <td className="font-mono text-xs font-extrabold text-brand-600">{q.quotation_number}</td>
                          <td className="text-xs text-slate-500">{formatDate(q.date)}</td>
                          <td className="font-bold text-slate-800 font-mono">{formatCurrency(q.amount)}</td>
                          <td>
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                              q.status === 'Approved' && 'bg-emerald-50 text-emerald-700 border border-emerald-250',
                              q.status === 'Pending' && 'bg-amber-50 text-amber-700 border border-amber-250',
                              q.status === 'Rejected' && 'bg-red-50 text-red-700 border border-red-250',
                            )}>
                              {q.status}
                            </span>
                          </td>
                          <td>
                            {q.converted ? (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Converted</span>
                            ) : (
                              <span className="text-xs text-slate-400">Pending</span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Button variant="outline" size="sm" className="text-[10px] px-2 py-1 h-7 border-slate-200" onClick={() => toast.success('Quotation PDF generated & downloaded.')}>
                                <Download className="h-3.5 w-3.5" /> PDF
                              </Button>
                              <Button variant="outline" size="sm" className="text-[10px] px-2 py-1 h-7 border-slate-200 text-emerald-600" onClick={() => toast.success('Shared Quotation link via WhatsApp.')}>
                                WhatsApp
                              </Button>
                              <Button variant="outline" size="sm" className="text-[10px] px-2 py-1 h-7 border-slate-200 text-blue-600" onClick={() => toast.success('Sent Quotation PDF via Email.')}>
                                Email
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          )}

          {/* TAB 8: INVOICES */}
          {activeTab === 'invoices' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle>Invoices & Billings</CardTitle>
                <Button variant="default" size="sm" onClick={() => setIsInvoiceModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Create Invoice
                </Button>
              </CardHeader>
              <div className="overflow-x-auto">
                {invoices.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No invoices generated for this customer.</div>
                ) : (
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Invoice No.</th>
                        <th>Invoice Date</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Pending</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="font-mono text-xs font-extrabold text-indigo-600">{inv.invoice_number}</td>
                          <td className="text-xs text-slate-500">{formatDate(inv.invoice_date)}</td>
                          <td className="text-xs text-slate-500">{formatDate(inv.due_date)}</td>
                          <td className="font-bold text-slate-800 font-mono">{formatCurrency(inv.amount)}</td>
                          <td className="font-bold text-emerald-600 font-mono">{formatCurrency(inv.paid)}</td>
                          <td className="font-bold text-red-500 font-mono">{formatCurrency(inv.pending)}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Invoice document downloaded.')}><Download className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Invoice shared successfully')}><Globe className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          )}

          {/* TAB 9: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                  <CardTitle>Payment Receipts & Logs</CardTitle>
                  <Button variant="default" size="sm" onClick={() => setIsPaymentModalOpen(true)}>
                    <Plus className="h-4 w-4" /> Record Payment
                  </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                  {payments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No payment receipts found.</div>
                  ) : (
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th>Payment Date</th>
                          <th>Amount Received</th>
                          <th>Method</th>
                          <th>Reference ID</th>
                          <th>Collected By</th>
                          <th>Receipt</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="text-xs text-slate-500">{formatDate(p.payment_date)}</td>
                            <td className="font-bold text-emerald-600 font-mono">{formatCurrency(p.amount)}</td>
                            <td className="text-xs font-bold text-slate-700 uppercase">{p.payment_method}</td>
                            <td className="text-xs font-mono text-slate-500">{p.reference_number || 'N/A'}</td>
                            <td className="text-xs text-slate-600 font-medium">{p.collected_by}</td>
                            <td>
                              <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 py-0.5 border-slate-200" onClick={() => toast.success('Receipt PDF generated.')}>
                                <Download className="h-3.5 w-3.5" /> Download
                              </Button>
                            </td>
                            <td>
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                                p.status === 'Success' && 'bg-emerald-50 text-emerald-700 border border-emerald-250',
                                p.status === 'Pending' && 'bg-amber-50 text-amber-700 border border-amber-250',
                                p.status === 'Failed' && 'bg-red-50 text-red-700 border border-red-250',
                              )}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              {/* Dynamic Recharts Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Revenue Collection Trend</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                        <YAxis stroke="#94A3B8" fontSize={10} />
                        <RechartsTooltip />
                        <Area type="monotone" dataKey="Revenue" stroke="#2563EB" fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Pending vs Paid Balance</h4>
                  <div className="h-56 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentCollectionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {paymentCollectionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 10: DOCUMENTS */}
          {activeTab === 'documents' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle>Documents Vault</CardTitle>
                <Button variant="default" size="sm" onClick={() => setIsDocModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Upload Document
                </Button>
              </CardHeader>
              <CardBody className="p-6 space-y-6">

                {/* Drag and Drop Zone */}
                <div
                  onClick={() => setIsDocModalOpen(true)}
                  className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center group-hover:scale-105 transition-all">
                    <Upload className="h-6 w-6 text-brand-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-2">Drag & Drop documents here, or click to upload</p>
                  <p className="text-xs text-slate-400">PDF, PNG, JPG, Docx or ZIP files up to 10MB supported</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.length === 0 ? (
                    <div className="col-span-2 text-center text-slate-400 py-8">No uploaded documents found.</div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="border border-slate-150 rounded-2xl p-4 flex items-center justify-between bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                            <DocIcon className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{doc.document_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{doc.document_type} · {doc.file_size} · Version {doc.version}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Opening document preview...')}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Document downloaded successfully.')}><Download className="h-3.5 w-3.5" /></Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this document?')) {
                                deleteDocument.mutate({ customerId, documentId: doc.id })
                                toast.success('Document deleted.')
                              }
                            }}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* TAB 11: COMMUNICATION LOG */}
          {activeTab === 'communications' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle>Communication Logs</CardTitle>
                <Button variant="default" size="sm" onClick={() => setIsCommModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Communication Log
                </Button>
              </CardHeader>
              <CardBody className="p-6">
                {communications.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">No communication logs recorded.</div>
                ) : (
                  <div className="space-y-4">
                    {communications.map((comm) => (
                      <div key={comm.id} className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold',
                            comm.type === 'Call' && 'bg-blue-500',
                            comm.type === 'WhatsApp' && 'bg-emerald-500',
                            comm.type === 'SMS' && 'bg-indigo-500',
                            comm.type === 'Email' && 'bg-sky-500',
                            comm.type === 'Meeting' && 'bg-purple-500',
                            comm.type === 'Note' && 'bg-amber-500',
                          )}>
                            {comm.type[0]}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 capitalize">{comm.type}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{formatDate(comm.date)} at {comm.time}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{comm.description}</p>
                            <div className="mt-2 text-[10px] text-slate-400 font-bold">Logged by: {comm.employee}</div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                            comm.status === 'Completed' || comm.status === 'Sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-amber-50 text-amber-700 border border-amber-250'
                          )}>
                            {comm.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* TAB 12: NOTES */}
          {activeTab === 'notes' && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
                <CardTitle>Customer Notes</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Search notes..."
                    className="form-input text-xs h-9 py-1 px-3 w-40"
                  />
                  <Button variant="default" size="sm" onClick={() => setIsNoteModalOpen(true)}>
                    <Plus className="h-4 w-4" /> Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                {sortedNotes.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">No notes found.</div>
                ) : (
                  sortedNotes.map((note) => (
                    <div key={note.id} className="border border-slate-150 rounded-2xl p-4 bg-white shadow-2xs hover:shadow-xs transition-shadow relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{note.employee_name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{formatDate(note.date)} · {note.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {note.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this note?')) {
                                deleteNote.mutate({ customerId, noteId: note.id })
                                toast.success('Note deleted.')
                              }
                            }}
                            className="text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          )}

          {/* TAB 13: FOLLOW-UP HISTORY */}
          {activeTab === 'followups' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle>Follow-up Reminders</CardTitle>
                <Button variant="default" size="sm" onClick={() => setIsFollowupModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Schedule Follow-up
                </Button>
              </CardHeader>
              <CardBody className="p-6">
                {enrichedFollowups.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">No follow-ups scheduled.</div>
                ) : (
                  <div className="space-y-4">
                    {enrichedFollowups.map((f) => (
                      <div
                        key={f.id}
                        className={cn(
                          'border rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center transition-all',
                          f.status === 'overdue' && 'border-red-200 bg-red-50/20 shadow-sm shadow-red-50/10',
                          f.status === 'completed' && 'border-slate-150 bg-slate-50/30',
                          f.status === 'pending' && 'border-brand-200 bg-brand-50/10'
                        )}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">Date: {formatDate(f.followup_date)}</span>
                            {f.reminder_time && <span className="text-[10px] text-slate-400 font-semibold">at {f.reminder_time}</span>}
                          </div>
                          <p className="text-xs font-bold text-slate-700 mt-2">Response: <span className="font-normal text-slate-600">{f.customer_response || 'None yet'}</span></p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">Next Action: <span className="font-normal text-slate-600">{f.next_action || 'None'}</span></p>
                          <p className="text-[10px] text-slate-400 mt-2 font-bold">Executive: {f.assigned_staff}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider',
                            f.status === 'completed' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                            f.status === 'overdue' && 'bg-red-100 text-red-800 border border-red-200 animate-pulse',
                            f.status === 'pending' && 'bg-amber-50 text-amber-700 border border-brand-200'
                          )}>
                            {f.status}
                          </span>

                          {f.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={async () => {
                                await saveFollowup.mutateAsync({ customerId, followup: { ...f, status: 'completed' } })
                                toast.success('Follow-up marked as completed!')
                              }}
                            >
                              Mark Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* TAB 14: ACTIVITY TIMELINE */}
          {activeTab === 'timeline' && (
            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Activity Timeline</h3>
              <div className="relative border-l border-slate-200 ml-4 space-y-6">
                {activities.length === 0 ? (
                  <p className="text-slate-400 text-xs ml-4">No logged history yet.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="relative pl-6">
                      <div className={cn(
                        'absolute -left-2.5 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md',
                        act.icon_color === 'emerald' || act.icon_color === 'green' ? 'bg-emerald-500' : '',
                        act.icon_color === 'blue' ? 'bg-blue-500' : '',
                        act.icon_color === 'amber' ? 'bg-amber-500' : '',
                        act.icon_color === 'purple' ? 'bg-purple-500' : '',
                        act.icon_color === 'indigo' ? 'bg-indigo-500' : '',
                        act.icon_color === 'sky' ? 'bg-sky-500' : '',
                        act.icon_color === 'rose' ? 'bg-rose-500' : '',
                      )} />
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-xs font-extrabold text-slate-800">{act.activity_type}</h4>
                          <span className="text-[10px] text-slate-400 font-bold">{dayjs(act.created_at).format('DD MMM YYYY h:mm A')}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* TAB 15: RISK & COMPLIANCE */}
          {activeTab === 'risk' && (
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Risk & Compliance Verification</CardTitle>
              </CardHeader>
              <CardBody className="space-y-6 p-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderEditableField('KYC Assessment Status', 'compliance_kyc_status', 'select', verificationOptions)}
                    {renderEditableField('Credit Risk Level', 'compliance_credit_risk', 'select', riskOptions)}
                    {renderEditableField('Fraud Database Check', 'compliance_fraud_check', 'select', fraudOptions)}
                    {renderEditableField('Compliance Audit Status', 'compliance_status', 'select', complianceStatusOptions)}
                    {renderEditableField('Legal Disputes & Issues', 'compliance_legal_issues', 'textarea', undefined, 'Describe any legal issues (leave blank if none)')}
                    {renderEditableField('Blacklisted', 'compliance_blacklisted', 'checkbox')}
                    {renderEditableField('Documents Verified', 'compliance_doc_verified', 'checkbox')}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">KYC Assessment Status</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{customer.compliance_kyc_status || <span className="italic font-medium text-slate-350">Not Set</span>}</p>
                        </div>
                        <StatusBadge status={customer.kyc_status} />
                      </div>

                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Blacklist Check</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{customer.compliance_blacklisted ? 'Flagged / Blacklisted' : 'Clear / Active'}</p>
                        </div>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          customer.compliance_blacklisted ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        )}>
                          {customer.compliance_blacklisted ? 'Flagged' : 'Clear'}
                        </span>
                      </div>

                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Document Audit</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{customer.compliance_doc_verified ? 'All verified' : 'Audits pending'}</p>
                        </div>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          customer.compliance_doc_verified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-250'
                        )}>
                          {customer.compliance_doc_verified ? 'Approved' : 'Pending'}
                        </span>
                      </div>

                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Legal Disputes & Issues</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{customer.compliance_legal_issues || 'None reported'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Clear
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Risk Metric Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
                        <div><p className="text-[10px] uppercase font-bold text-slate-400">Credit Risk Level</p><p className="text-xs font-extrabold text-blue-600 mt-0.5">{customer.compliance_credit_risk || <span className="text-slate-350 italic font-medium">Not Set</span>}</p></div>
                        <div><p className="text-[10px] uppercase font-bold text-slate-400">Fraud Database Check</p><p className="text-xs font-extrabold text-emerald-600 mt-0.5">{customer.compliance_fraud_check || <span className="text-slate-350 italic font-medium">Not Set</span>}</p></div>
                        <div><p className="text-[10px] uppercase font-bold text-slate-400">KYC Status</p><p className="text-xs font-bold text-slate-800 mt-0.5">{customer.kyc_status}</p></div>
                        <div><p className="text-[10px] uppercase font-bold text-slate-400">Compliance Audit Status</p><p className="text-xs font-extrabold text-emerald-600 mt-0.5">{customer.compliance_status || <span className="text-slate-350 italic font-medium">Not Set</span>}</p></div>
                      </div>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )}


          {/* Widgets dashboard panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Project Status Breakdown</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outstandingProjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {outstandingProjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} />
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 md:col-span-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Customer Engagement Activity</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activities.slice(0, 7).map((act, i) => ({ name: `Act ${i + 1}`, Count: i + 1 }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="Count" stroke="#2563EB" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

        </div>

        {/* --- RIGHT PANEL: RECENT ACTIVITIES PANEL --- */}
        <div className="space-y-6">

          {/* Quick Dashboard Widgets */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-3">Dashboard Indicators</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Invoices Generated</span>
                <span className="font-bold text-slate-800">{invoices.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Invoices Pending</span>
                <span className="font-bold text-slate-800">{invoices.filter(i => Number(i.pending) > 0).length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Total Collection</span>
                <span className="font-bold text-emerald-600 font-mono">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Pending Collection</span>
                <span className="font-bold text-red-500 font-mono">{formatCurrency(totalOutstanding)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Total Logged Comms</span>
                <span className="font-bold text-slate-800">{communications.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Customer Lifetime Value</span>
                <span className="font-bold text-blue-600 font-mono">{formatCurrency(totalPaid + totalOutstanding)}</span>
              </div>
            </div>
          </Card>

          {/* Recent Activities list */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Recent Activities</h3>

            <div className="relative border-l border-slate-150 ml-2.5 space-y-4">
              {recentActivitiesList.length === 0 ? (
                <p className="text-xs text-slate-400 ml-4">No recent activity logs.</p>
              ) : (
                recentActivitiesList.map((act) => (
                  <div key={act.id} className="relative pl-5">
                    <div className={cn(
                      'absolute -left-1.5 top-1 w-3 h-3 rounded-full border border-white',
                      act.icon_color === 'emerald' || act.icon_color === 'green' ? 'bg-emerald-500' : '',
                      act.icon_color === 'blue' ? 'bg-blue-500' : '',
                      act.icon_color === 'amber' ? 'bg-amber-500' : '',
                      act.icon_color === 'purple' ? 'bg-purple-500' : '',
                      act.icon_color === 'indigo' ? 'bg-indigo-500' : '',
                      act.icon_color === 'sky' ? 'bg-sky-500' : '',
                      act.icon_color === 'rose' ? 'bg-rose-500' : '',
                    )} />
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">{act.activity_type}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">{dayjs(act.created_at).format('DD MMM')}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{act.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* --- STICKY EDIT MODE BOTTOM BAR --- */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-blue-200 shadow-xl px-6 py-4 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-700">You are in Edit Mode</span>
            <span className="text-xs text-slate-400 font-medium">Changes are not saved yet</span>
            {Object.keys(validationErrors).length > 0 && (
              <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {Object.keys(validationErrors).length} validation error(s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelInlineProfile}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> Discard Changes
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveInlineProfile}
              loading={updateProfile.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <Check className="h-4 w-4" /> Save Profile
            </Button>
          </div>
        </div>
      )}

      {/* --- MODAL FORMS --- */}

      {/* 2. Project/Order Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Add Project or Order</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsProjectModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Input label="Project Name" value={projectForm.project_name} onChange={(e) => setProjectForm({ ...projectForm, project_name: e.target.value })} />
              <Input label="Project ID" value={projectForm.project_id} onChange={(e) => setProjectForm({ ...projectForm, project_id: e.target.value })} />
              <Input label="Start Date" type="date" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })} />
              <Input label="End Date" type="date" value={projectForm.end_date} onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })} />
              <Input label="Budget Amount (Rs)" type="number" value={projectForm.amount} onChange={(e) => setProjectForm({ ...projectForm, amount: parseFloat(e.target.value) || '' })} />
              <Input label="Progress (%)" type="number" value={projectForm.progress} onChange={(e) => setProjectForm({ ...projectForm, progress: parseInt(e.target.value) || 0 })} />
              <Input label="Assigned Employee" value={projectForm.assigned_employee} onChange={(e) => setProjectForm({ ...projectForm, assigned_employee: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddProject}>Add Project</Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Quotation Modal */}
      {isQuotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Generate Quotation</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsQuotationModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Input label="Quotation Number" value={quotationForm.quotation_number} onChange={(e) => setQuotationForm({ ...quotationForm, quotation_number: e.target.value })} />
              <Input label="Date" type="date" value={quotationForm.date} onChange={(e) => setQuotationForm({ ...quotationForm, date: e.target.value })} />
              <Input label="Amount (Rs)" type="number" value={quotationForm.amount} onChange={(e) => setQuotationForm({ ...quotationForm, amount: parseFloat(e.target.value) || '' })} />
              <Select
                label="Status"
                value={quotationForm.status}
                onChange={(e) => setQuotationForm({ ...quotationForm, status: e.target.value })}
                options={[{ value: 'Pending', label: 'Pending' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }]}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsQuotationModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddQuotation}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Create Invoice</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsInvoiceModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Input label="Invoice Number" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} />
              <Input label="Invoice Date" type="date" value={invoiceForm.invoice_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} />
              <Input label="Due Date" type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
              <Input label="Total Amount (Rs)" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: parseFloat(e.target.value) || '' })} />
              <Input label="Amount Paid (Rs)" type="number" value={invoiceForm.paid} onChange={(e) => setInvoiceForm({ ...invoiceForm, paid: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddInvoice}>Create Invoice</Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Record Payment</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsPaymentModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Input label="Payment Date" type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
              <Input label="Amount Paid (Rs)" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || '' })} />
              <Select
                label="Payment Method"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                options={[{ value: 'UPI', label: 'UPI' }, { value: 'Cash', label: 'Cash' }, { value: 'Bank Transfer', label: 'Bank Transfer' }, { value: 'Cheque', label: 'Cheque' }]}
              />
              <Input label="Reference ID / Check No" value={paymentForm.reference_number} onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} />
              <Input label="Collected By" value={paymentForm.collected_by} onChange={(e) => setPaymentForm({ ...paymentForm, collected_by: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddPayment}>Record Receipt</Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Document Upload Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Upload Document</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsDocModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Input label="Document Name" value={docForm.document_name} onChange={(e) => setDocForm({ ...docForm, document_name: e.target.value })} />
              <Select
                label="Document Type"
                value={docForm.document_type}
                onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                options={[
                  { value: 'Agreement', label: 'Agreement' },
                  { value: 'PAN', label: 'PAN Card' },
                  { value: 'Aadhaar', label: 'Aadhaar Card' },
                  { value: 'GST', label: 'GST Copy' },
                  { value: 'Quotation PDF', label: 'Quotation estimate' },
                  { value: 'Invoice PDF', label: 'Invoice PDF' },
                  { value: 'Photos', label: 'Photos' },
                  { value: 'Videos', label: 'Videos' },
                  { value: 'Other Documents', label: 'Other Documents' }
                ]}
              />
              <Input label="File Size Label" value={docForm.file_size} onChange={(e) => setDocForm({ ...docForm, file_size: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsDocModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddDocument}>Upload</Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Communication Modal */}
      {isCommModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Add Communication Log</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsCommModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Select
                label="Type"
                value={commForm.type}
                onChange={(e) => setCommForm({ ...commForm, type: e.target.value })}
                options={[
                  { value: 'Call', label: 'Phone Call' },
                  { value: 'WhatsApp', label: 'WhatsApp Message' },
                  { value: 'SMS', label: 'SMS text' },
                  { value: 'Email', label: 'Email' },
                  { value: 'Meeting', label: 'Meeting' },
                  { value: 'Note', label: 'Notes' }
                ]}
              />
              <Input label="Date" type="date" value={commForm.date} onChange={(e) => setCommForm({ ...commForm, date: e.target.value })} />
              <Input label="Time" type="time" value={commForm.time} onChange={(e) => setCommForm({ ...commForm, time: e.target.value })} />
              <Input label="Employee logging" value={commForm.employee} onChange={(e) => setCommForm({ ...commForm, employee: e.target.value })} />
              <Textarea label="Description of discussion" value={commForm.description} onChange={(e) => setCommForm({ ...commForm, description: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsCommModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddCommunication}>Save Log</Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Follow-up Modal */}
      {isFollowupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Schedule Follow-up</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsFollowupModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Input label="Follow-up Date" type="date" value={followupForm.followup_date} onChange={(e) => setFollowupForm({ ...followupForm, followup_date: e.target.value })} />
              <Input label="Reminder Date" type="date" value={followupForm.reminder_date} onChange={(e) => setFollowupForm({ ...followupForm, reminder_date: e.target.value })} />
              <Input label="Reminder Time" type="time" value={followupForm.reminder_time} onChange={(e) => setFollowupForm({ ...followupForm, reminder_time: e.target.value })} />
              <Input label="Customer Response note" value={followupForm.customer_response} onChange={(e) => setFollowupForm({ ...followupForm, customer_response: e.target.value })} />
              <Input label="Next Action Required" value={followupForm.next_action} onChange={(e) => setFollowupForm({ ...followupForm, next_action: e.target.value })} />
              <Input label="Assigned Staff" value={followupForm.assigned_staff} onChange={(e) => setFollowupForm({ ...followupForm, assigned_staff: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsFollowupModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddFollowup}>Schedule</Button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Add Customer Note</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsNoteModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <Textarea label="Notes Content" value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pin-note"
                  checked={noteForm.is_pinned}
                  onChange={(e) => setNoteForm({ ...noteForm, is_pinned: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="pin-note" className="text-xs font-semibold text-slate-600">Pin note to top of profile</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsNoteModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleAddNote}>Save Note</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
