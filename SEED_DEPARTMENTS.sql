-- First, clear existing departments to avoid conflicts during re-init
TRUNCATE TABLE public.departments CASCADE;

-- Insert all standard departments for ESEC
INSERT INTO public.departments (name, code) VALUES
('Computer Science and Engineering', 'CSE'),
('Information Technology', 'IT'),
('Artificial Intelligence and Data Science', 'AIDS'),
('Computer Science and Design', 'CSD'),
('Electronics and Communication Engineering', 'ECE'),
('Electrical and Electronics Engineering', 'EEE'),
('Electronics and Instrumentation Engineering', 'EIE'),
('Mechanical Engineering', 'MECH'),
('Civil Engineering', 'CIVIL'),
('Chemical Engineering', 'CHEM'),
('Bio-Medical Engineering', 'BME'),
('Agricultural Engineering', 'AGRI'),
('Robotics and Automation', 'RA'),
('Management Studies', 'MBA'),
('Computer Applications', 'MCA');

-- Ensure RLS allows reading these departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on departments" ON public.departments;
CREATE POLICY "Allow public read access on departments" 
ON public.departments FOR SELECT 
TO public 
USING (true);
