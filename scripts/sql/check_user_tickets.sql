-- Check all tickets for debugging
SELECT 
    id,
    user_id,
    event_id,
    ticket_type,
    price,
    payment_status,
    stripe_session_id,
    purchase_date,
    purchased_at,
    status,
    created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 20;

-- Check specifically for pending tickets
SELECT 
    id,
    user_id,
    event_id,
    ticket_type,
    price,
    payment_status,
    stripe_session_id,
    status
FROM tickets
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
