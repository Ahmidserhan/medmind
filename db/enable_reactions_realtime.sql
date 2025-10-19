-- Enable realtime for message reactions table
ALTER PUBLICATION supabase_realtime ADD TABLE collab_message_reactions;

-- Verify it's enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'collab_message_reactions';
