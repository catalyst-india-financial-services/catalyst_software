import * as React from 'react'
import { cn } from '@/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, badge, className }: PageHeaderProps) {
  return (
    <div className={cn('page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3 flex-shrink-0">{action}</div>}
    </div>
  )
}
