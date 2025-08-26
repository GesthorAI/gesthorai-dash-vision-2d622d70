-- Enable real-time for searches table
ALTER TABLE public.searches REPLICA IDENTITY FULL;

-- Add searches table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.searches;