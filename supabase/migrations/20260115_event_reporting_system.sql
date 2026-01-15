-- Event Reporting System Migration
-- Enables users to report events with false information, wrong location, etc.
-- Organizers see reports and can respond. Admins can moderate/delete events.

-- Step 1: Create event_reports table
CREATE TABLE IF NOT EXISTS public.event_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reporter_email TEXT,
    report_type TEXT NOT NULL CHECK (report_type IN ('wrong_location', 'wrong_info', 'duplicate', 'spam', 'inappropriate', 'other')),
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_reports_event_id ON public.event_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reports_reporter_id ON public.event_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_event_reports_status ON public.event_reports(status);
CREATE INDEX IF NOT EXISTS idx_event_reports_created_at ON public.event_reports(created_at DESC);

-- Step 3: Add report_count column to events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'report_count') THEN
        ALTER TABLE public.events ADD COLUMN report_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 4: Enable RLS on event_reports
ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies for event_reports

-- Anyone can view their own reports
CREATE POLICY "Users can view their own reports" ON public.event_reports
    FOR SELECT USING (
        (auth.uid()::text = reporter_id::text) OR
        (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')) OR
        (auth.uid() IN (SELECT organizer_id FROM public.events WHERE id = event_id))
    );

-- Anyone can create a report (anonymous reports allowed)
CREATE POLICY "Anyone can create reports" ON public.event_reports
    FOR INSERT WITH CHECK (TRUE);

-- Organizers and admins can update report status
CREATE POLICY "Organizers and admins can update reports" ON public.event_reports
    FOR UPDATE USING (
        (auth.uid() IN (SELECT organizer_id FROM public.events WHERE id = event_id)) OR
        (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
    )
    WITH CHECK (
        (auth.uid() IN (SELECT organizer_id FROM public.events WHERE id = event_id)) OR
        (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
    );

-- Admins can delete reports
CREATE POLICY "Admins can delete reports" ON public.event_reports
    FOR DELETE USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
    );

-- Step 6: Create a function to count reports for an event
CREATE OR REPLACE FUNCTION public.count_event_reports(event_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.event_reports WHERE public.event_reports.event_id = event_id AND status = 'open');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a function to get reports for an event (for organizer/admin)
CREATE OR REPLACE FUNCTION public.get_event_reports(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    reporter_email TEXT,
    report_type TEXT,
    reason TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        event_reports.id,
        event_reports.event_id,
        COALESCE(event_reports.reporter_email, 'Anonymous'),
        event_reports.report_type,
        event_reports.reason,
        event_reports.description,
        event_reports.status,
        event_reports.created_at,
        event_reports.resolution_notes
    FROM public.event_reports
    WHERE event_reports.event_id = p_event_id
    ORDER BY event_reports.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create a function to update report status
CREATE OR REPLACE FUNCTION public.update_report_status(
    report_id UUID,
    new_status TEXT,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.event_reports
    SET 
        status = new_status,
        resolution_notes = COALESCE(notes, resolution_notes),
        resolved_by = auth.uid(),
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = report_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger to update events report_count
CREATE OR REPLACE FUNCTION public.update_event_report_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.events
    SET report_count = (SELECT COUNT(*) FROM public.event_reports WHERE event_id = NEW.event_id AND status = 'open')
    WHERE id = NEW.event_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_event_report_count ON public.event_reports;
CREATE TRIGGER trigger_update_event_report_count
AFTER INSERT OR UPDATE OR DELETE ON public.event_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_event_report_count();

-- Step 10: Add admin_action_log entry type for event deletion by admin due to reports
-- This is documented in the resolution_notes of the report
