import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils'
import {
  Search, ChevronLeft, ChevronRight, Check, X, AlertTriangle,
  Clock, ArrowUpRight, ArrowDownRight, CheckCircle2, CircleDot
} from 'lucide-react'

export { PageHeader } from './PageHeader'
export { Tooltip } from './Tooltip'
export { CommandPalette } from './CommandPalette'

// ─── Badge ─────────────────────────────────────────────────────────────────────
const badgeVariants = {
  default: 'bg-brand-50 text-brand-700 border-brand-200/60',
  secondary: 'bg-slate-100 text-slate-700 border-slate-200',
  destructive: 'bg-red-50 text-red-700 border-red-200/60',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
  outline: 'border border-slate-200 text-slate-700 bg-transparent',
}

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-150',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}

// ─── Button ─────────────────────────────────────────────────────────────────────
const buttonVariants = {
  default: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-500/20 active:scale-[0.98]',
  secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 active:scale-[0.98]',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 active:scale-[0.98]',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs active:scale-[0.98]',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]',
  link: 'text-brand-600 underline-offset-4 hover:underline',
}
const buttonSizes = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-8 px-3 text-xs font-medium',
  lg: 'h-11 px-6 text-base font-semibold',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-7 w-7 p-0',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ─── Input ──────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'form-input',
              leftIcon && 'pl-9.5',
              rightIcon && 'pr-9.5',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400">{rightIcon}</div>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── Select ─────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'form-input appearance-none bg-white cursor-pointer pr-8',
            error && 'border-red-400',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ─── Textarea ───────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn('form-input resize-none', error && 'border-red-400', className)}
          rows={3}
          {...props}
        />
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ─── Card (20px radius per spec) ────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden',
        hover && 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4.5 border-b border-slate-100 flex items-center justify-between', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-bold text-slate-900 tracking-tight', className)} {...props} />
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl', className)} {...props} />
}

// ─── Avatar ─────────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const avatarSizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-16 h-16 text-xl' }

const avatarColors = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
]

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  const colorIdx = name ? name.charCodeAt(0) % avatarColors.length : 0
  const color = avatarColors[colorIdx]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover shadow-2xs', avatarSizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold flex-shrink-0 shadow-2xs border border-white/40',
        avatarSizes[size],
        color,
        className
      )}
    >
      {initials}
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string | number
  width?: string | number
  rounded?: string
}

export function Skeleton({ className, height, width, rounded = 'rounded-xl', style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', rounded, className)}
      style={{ height, width, ...style }}
      {...props}
    />
  )
}

// ─── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
  return (
    <svg
      className={cn('animate-spin text-brand-600', sizes[size], className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Modal / Dialog (Backdrop blur + Framer Motion) ────────────────────────────
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  footer?: React.ReactNode
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 border border-slate-200',
              modalSizes[size]
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
            {footer && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Tabs ───────────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 bg-slate-100/80 rounded-xl p-1 border border-slate-200/50', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
            activeTab === tab.id
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Table (base) ───────────────────────────────────────────────────────────────
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-200">
      <table className={cn('data-table', className)} {...props} />
    </div>
  )
}

// ─── Dropdown Menu ───────────────────────────────────────────────────────────────
interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'danger'
  separator?: boolean
}

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
}

export function DropdownMenu({ trigger, items, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute top-full mt-1 z-50 min-w-[170px] bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 overflow-hidden',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.separator && <div className="my-1 border-t border-slate-100" />}
                <button
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors text-left',
                    item.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-brand-600'
                  )}
                  onClick={() => { item.onClick?.(); setIsOpen(false) }}
                >
                  {item.icon}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, size = 'md' }: ToggleProps) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        className={cn(
          'relative rounded-full transition-colors duration-200',
          size === 'md' ? 'w-10 h-6' : 'w-8 h-5',
          checked ? 'bg-brand-600' : 'bg-slate-200'
        )}
        onClick={() => onChange(!checked)}
      >
        <div
          className={cn(
            'absolute top-0.5 rounded-full bg-white shadow-sm transition-transform duration-200',
            size === 'md' ? 'w-5 h-5' : 'w-4 h-4',
            checked
              ? size === 'md' ? 'translate-x-4.5' : 'translate-x-3.5'
              : 'translate-x-0.5'
          )}
        />
      </div>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
    </label>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
        {icon ?? <Search className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Status Badge (Premium dot + text) ───────────────────────────────────────────
interface StatusBadgeProps {
  status: string
  label?: string
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active' },
  approved: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Approved' },
  inactive: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Inactive' },
  blocked: { bg: 'bg-red-50 border-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Blocked' },
  closed: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Closed' },
  overdue: { bg: 'bg-red-50 border-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Overdue' },
  pending: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
  paid: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
  partial: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Partial' },
  verified: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Verified' },
  rejected: { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Rejected' },
  synced: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Synced' },
  failed: { bg: 'bg-red-50 border-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Failed' },
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalized = status ? status.toLowerCase() : 'closed'
  const config = statusConfig[normalized] ?? { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', label: status }
  const displayLabel = label ?? config.label

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border', config.bg, config.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {displayLabel}
    </span>
  )
}

// ─── Stats Card (KPI with 20px radius & hover lift) ──────────────────────────────
interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; label?: string }
  bgClass?: string
  iconBg?: string
  subtext?: string
}

export function StatsCard({ title, value, icon, trend, bgClass = 'kpi-blue', iconBg = 'bg-brand-600', subtext }: StatsCardProps) {
  return (
    <div className={cn('rounded-2xl p-5 border border-white/60 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1', bgClass)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl text-white shadow-2xs', iconBg)}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full',
            trend.value >= 0 ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200' : 'bg-red-100/80 text-red-700 border border-red-200'
          )}>
            {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="amount-display text-2xl font-bold text-slate-900 tracking-tight mb-1">{value}</div>
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      {subtext && <div className="text-[11px] text-slate-400 mt-0.5">{subtext}</div>}
    </div>
  )
}

// ─── Search Input ────────────────────────────────────────────────────────────────
interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
}

export function SearchInput({ className, onSearch, onChange, ...props }: SearchInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    onSearch?.(e.target.value)
  }
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        className={cn('form-input pl-9 pr-4', className)}
        placeholder="Search..."
        onChange={handleChange}
        {...props}
      />
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, total, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1
  const start = Math.min((page - 1) * pageSize + 1, total)
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-800">{start}</span> to{' '}
        <span className="font-bold text-slate-800">{end}</span> of{' '}
        <span className="font-bold text-slate-800">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = i + 1
          if (totalPages > 5 && page > 3) pageNum = page - 2 + i
          if (pageNum > totalPages) return null
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                'min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all',
                page === pageNum
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              {pageNum}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
