-- Update admin phone number to real value
UPDATE public.template_variables
SET variable_value = '+372 56190981'
WHERE variable_name = 'admin_phone';

-- Verify the update
SELECT variable_name, variable_value 
FROM public.template_variables 
WHERE variable_name IN ('admin_name', 'admin_email', 'admin_phone')
ORDER BY variable_name;
