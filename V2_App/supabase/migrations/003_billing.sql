-- Migration: Create settings and invoices tables for V2 billing system
-- Run this migration in Supabase SQL Editor

-- Settings table for configurable values (like next invoice number)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default invoice numbering settings
INSERT INTO settings (key, value) VALUES 
  ('next_invoice_number', '{"prefix": "FACT", "year": 2026, "sequence": 1}')
ON CONFLICT (key) DO NOTHING;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  booking_ids UUID[] DEFAULT '{}',
  
  -- Client info
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  client_siret TEXT,
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_type TEXT,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Metadata
  period_start DATE,
  period_end DATE,
  due_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Invoice lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  booking_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

-- Settings: Only admin can modify
CREATE POLICY "Admin can manage settings" ON settings
  FOR ALL USING (true); -- Simplified for now, add proper admin check

-- Invoices: Users see their own, admin sees all
CREATE POLICY "Users view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin full access invoices" ON invoices
  FOR ALL USING (true); -- Simplified, add role check in production

-- Invoice lines: Same as invoices
CREATE POLICY "View invoice lines" ON invoice_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_lines.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin manage invoice lines" ON invoice_lines
  FOR ALL USING (true);
