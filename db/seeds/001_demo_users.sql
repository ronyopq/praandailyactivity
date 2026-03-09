-- SMART WORK TRACKER demo seed
-- Password for both users: Demo@12345

INSERT OR IGNORE INTO users (name, email, password_hash, designation, department, timezone)
VALUES
  ('Demo Manager', 'manager@example.com', '$2a$12$TjJyk.KKw0qVem9dxPXTN.3wn/QuFqnYo5H5g1HfnyXM2IzjDmAjG', 'Manager', 'Operations', 'Asia/Dhaka'),
  ('Demo User', 'user@example.com', '$2a$12$TjJyk.KKw0qVem9dxPXTN.3wn/QuFqnYo5H5g1HfnyXM2IzjDmAjG', 'Executive', 'Operations', 'Asia/Dhaka');

UPDATE users
SET
  name = CASE email WHEN 'manager@example.com' THEN 'Demo Manager' ELSE 'Demo User' END,
  password_hash = '$2a$12$TjJyk.KKw0qVem9dxPXTN.3wn/QuFqnYo5H5g1HfnyXM2IzjDmAjG',
  designation = CASE email WHEN 'manager@example.com' THEN 'Manager' ELSE 'Executive' END,
  department = 'Operations',
  timezone = 'Asia/Dhaka'
WHERE email IN ('manager@example.com', 'user@example.com');

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE email = 'manager@example.com')
WHERE email = 'user@example.com';

INSERT OR IGNORE INTO work_plans (user_id, date, activity, expected_output, priority, status, category)
SELECT id, date('now'), 'Client onboarding', 'Onboarding checklist completed', 'high', 'in_progress', 'Operations'
FROM users
WHERE email = 'user@example.com';
