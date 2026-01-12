-- Fix incorrect timezones for cities
-- Most Eastern European cities were incorrectly set to Europe/Tallinn

-- Ankara, Turkey (UTC+3)
UPDATE city_configs 
SET timezone = 'Europe/Istanbul' 
WHERE city_name = 'Ankara' AND country = 'Turkey';

-- Belgrade, Serbia (UTC+1)
UPDATE city_configs 
SET timezone = 'Europe/Belgrade' 
WHERE city_name = 'Београд' AND country = 'Serbia';

-- Minsk, Belarus (UTC+3)
UPDATE city_configs 
SET timezone = 'Europe/Minsk' 
WHERE city_name = 'Мінск' AND country = 'Belarus';

-- Moscow, Russia (UTC+3)
UPDATE city_configs 
SET timezone = 'Europe/Moscow' 
WHERE city_name = 'Москва' AND country = 'Russia';

-- Skopje, North Macedonia (UTC+1)
UPDATE city_configs 
SET timezone = 'Europe/Skopje' 
WHERE city_name = 'Скопје' AND country = 'North Macedonia';

-- Warsaw, Poland (UTC+1)
UPDATE city_configs 
SET timezone = 'Europe/Warsaw' 
WHERE city_name = 'Warszawa' AND country = 'Poland';

-- Nicosia, Cyprus (UTC+2, but Asia timezone)
UPDATE city_configs 
SET timezone = 'Asia/Nicosia' 
WHERE city_name = 'Λευκωσία' AND country = 'Cyprus';

-- Athens, Greece (UTC+2, correct but verify)
UPDATE city_configs 
SET timezone = 'Europe/Athens' 
WHERE city_name = 'Αθήνα' AND country = 'Greece';

-- Sofia, Bulgaria (UTC+2)
UPDATE city_configs 
SET timezone = 'Europe/Sofia' 
WHERE city_name = 'София' AND country = 'Bulgaria';

-- Kyiv, Ukraine (UTC+2, correct)
UPDATE city_configs 
SET timezone = 'Europe/Kyiv' 
WHERE city_name = 'Київ' AND country = 'Ukraine';

-- Vilnius, Lithuania (UTC+2)
UPDATE city_configs 
SET timezone = 'Europe/Vilnius' 
WHERE city_name = 'Vilnius' AND country = 'Lithuania';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Fixed timezones for 10 cities with incorrect Europe/Tallinn timezone';
END $$;
