-- Check if notification was created for the contact inquiry
SELECT 
  n.id,
  n.title,
  n.message,
  n.type,
  n.sender_name,
  n.metadata,
  n.created_at,
  n.user_id
FROM public.notifications n
WHERE n.user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
  AND n.type = 'contact_inquiry'
ORDER BY n.created_at DESC
LIMIT 5;

-- Also check contact_inquiries table
SELECT 
  ci.id,
  ci.from_name,
  ci.from_email,
  ci.email_id,
  ci.type,
  ci.created_at
FROM public.contact_inquiries ci
WHERE ci.organizer_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
ORDER BY ci.created_at DESC
LIMIT 5;
