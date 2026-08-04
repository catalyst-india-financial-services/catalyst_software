-- PostgreSQL Schema Migration: 00003_customer_profile_details.sql
-- Purpose: Add banking/CRM specific fields to customers and create sub-module tables for profile tabs.

-- 1. Extend Customers Table with CRM/Banking Fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS alt_mobile VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pref_language VARCHAR(50) DEFAULT 'English';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT 'Main Branch';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS employee_assigned VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS annual_income NUMERIC(15,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS advance_received NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS ifsc VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS compliance_kyc_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS compliance_doc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS compliance_blacklisted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS compliance_legal_issues TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS compliance_credit_risk VARCHAR(50) DEFAULT 'low';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS compliance_fraud_check VARCHAR(50) DEFAULT 'passed';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'compliant';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_gst VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_driving_license VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_passport VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_verified_by VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_verified_date DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_expiry_date DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'Individual';

-- 2. Customer Projects / Orders Table
CREATE TABLE IF NOT EXISTS public.customer_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_id VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Running',
    amount NUMERIC(15,2) NOT NULL,
    progress INT DEFAULT 0,
    assigned_employee VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Quotations Table
CREATE TABLE IF NOT EXISTS public.customer_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    converted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Invoices Table
CREATE TABLE IF NOT EXISTS public.customer_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    paid NUMERIC(15,2) DEFAULT 0,
    pending NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Customer Payments Table (For general tracking)
CREATE TABLE IF NOT EXISTS public.customer_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    collected_by VARCHAR(255) NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) DEFAULT 'Success',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customer Documents Table
CREATE TABLE IF NOT EXISTS public.customer_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_size VARCHAR(50),
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Customer Communications Log Table
CREATE TABLE IF NOT EXISTS public.customer_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Call', 'WhatsApp', 'SMS', 'Email', 'Meeting', 'Note')),
    date DATE NOT NULL,
    time TIME NOT NULL,
    employee VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    attachment_url TEXT,
    status VARCHAR(50) DEFAULT 'Sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Customer Follow-up History Table
CREATE TABLE IF NOT EXISTS public.customer_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    followup_date DATE NOT NULL,
    reminder_date DATE,
    reminder_time TIME,
    customer_response TEXT,
    next_action TEXT,
    assigned_staff VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Customer Notes Table
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Customer Activities Timeline Table
CREATE TABLE IF NOT EXISTS public.customer_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security on new tables to match other tables in single-tenant ERP
ALTER TABLE public.customer_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_followups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activities DISABLE ROW LEVEL SECURITY;
