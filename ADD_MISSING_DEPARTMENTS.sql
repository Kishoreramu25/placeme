-- Add missing departments for Erode Sengunthar Engineering College
INSERT INTO public.departments (name, code) VALUES
  ('Agricultural Engineering', 'AGRI'),
  ('Bio Medical Engineering', 'BME'),
  ('Biotechnology', 'BT'),
  ('Chemical Engineering', 'CHEM'),
  ('Computer Science and Engineering (Cyber Security)', 'CSE-CS'),
  ('Computer Science and Engineering (Internet of Things)', 'CSE-IOT'),
  ('Computer Science and Design', 'CSD'),
  ('Electronics and Instrumentation Engineering', 'EIE'),
  ('Robotics and Automation Engineering', 'RA'),
  ('Pharmaceutical Technology', 'PHARM'),
  ('Master of Business Administration', 'MBA'),
  ('Master of Computer Applications', 'MCA'),
  ('Science and Humanities', 'S&H')
ON CONFLICT (code) DO NOTHING;

-- Ensure AIML and AIDS departments exist
INSERT INTO public.departments (name, code) VALUES
  ('Artificial Intelligence and Machine Learning', 'AIML'),
  ('Artificial Intelligence and Data Science', 'AIDS'),
  ('Artificial Intelligence and Data Science', 'DS')
ON CONFLICT (code) DO NOTHING;
