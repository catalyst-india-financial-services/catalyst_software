-- PostgreSQL Schema for Finance Management ERP System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    photo_url TEXT,
    mobile VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    occupation VARCHAR(100),
    company VARCHAR(100),
    monthly_income NUMERIC(12,2),
    aadhaar VARCHAR(20),
    pan VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    device_id VARCHAR(100),
    version INT DEFAULT 1,
    sync_status VARCHAR(20) DEFAULT 'synced'
);

-- 2. Guarantors Table
CREATE TABLE public.guarantors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    relation VARCHAR(50) NOT NULL,
    aadhaar VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Loans Table
CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    loan_type VARCHAR(50) NOT NULL,
    loan_amount NUMERIC(14,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    interest_type VARCHAR(20) NOT NULL CHECK (interest_type IN ('flat', 'reducing')),
    duration_months INT NOT NULL,
    processing_fee NUMERIC(10,2) DEFAULT 0,
    loan_date DATE NOT NULL,
    emi_amount NUMERIC(12,2) NOT NULL,
    emi_count INT NOT NULL,
    remaining_emi INT NOT NULL,
    remaining_balance NUMERIC(14,2) NOT NULL,
    total_interest NUMERIC(14,2) NOT NULL,
    disbursed_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'overdue', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    device_id VARCHAR(100),
    version INT DEFAULT 1,
    sync_status VARCHAR(20) DEFAULT 'synced'
);

-- 4. EMI Schedule Table
CREATE TABLE public.emi_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
    emi_number INT NOT NULL,
    due_date DATE NOT NULL,
    emi_amount NUMERIC(12,2) NOT NULL,
    principal NUMERIC(12,2) NOT NULL,
    interest NUMERIC(12,2) NOT NULL,
    outstanding_balance NUMERIC(14,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
    paid_amount NUMERIC(12,2),
    paid_date DATE,
    penalty NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EMI Payments Table
CREATE TABLE public.emi_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES public.loans(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    emi_schedule_id UUID REFERENCES public.emi_schedule(id),
    emi_number INT NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'bank', 'cheque')),
    amount_paid NUMERIC(12,2) NOT NULL,
    principal_paid NUMERIC(12,2) NOT NULL,
    interest_paid NUMERIC(12,2) NOT NULL,
    penalty NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    advance_emi NUMERIC(12,2) DEFAULT 0,
    partial BOOLEAN DEFAULT FALSE,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    collected_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    device_id VARCHAR(100),
    version INT DEFAULT 1,
    sync_status VARCHAR(20) DEFAULT 'synced'
);

-- 6. Income Table
CREATE TABLE public.income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL CHECK (category IN ('interest', 'processing_fee', 'penalty', 'other')),
    amount NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    reference VARCHAR(100),
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Expenses Table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL CHECK (category IN ('rent', 'salary', 'fuel', 'electricity', 'internet', 'maintenance', 'other')),
    amount NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    receipt_url TEXT,
    approved_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Users & Roles Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    avatar_url TEXT,
    mobile VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for Lightning-Fast Search
CREATE INDEX idx_customers_search ON public.customers USING gin (to_tsvector('english', name || ' ' || mobile || ' ' || customer_id || ' ' || COALESCE(aadhaar,'') || ' ' || COALESCE(pan,'')));
CREATE INDEX idx_loans_search ON public.loans (loan_number, customer_id, status);
CREATE INDEX idx_emi_payments_receipt ON public.emi_payments (receipt_number, payment_date);

-- Enable RLS Policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read/write on customers" ON public.customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read/write on loans" ON public.loans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read/write on emi_payments" ON public.emi_payments FOR ALL USING (auth.role() = 'authenticated');
