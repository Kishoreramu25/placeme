import { z } from "zod";

// Auth validations
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be less than 72 characters"),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be less than 72 characters"),
  role: z.enum(["placement_officer", "department_coordinator", "management", "student"], {
    required_error: "Please select a role",
  }),
  departmentId: z.string().uuid().optional().nullable(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

// Company validations
export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(200, "Company name must be less than 200 characters"),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional(),
  location: z.string().trim().max(100, "Location must be less than 100 characters").optional(),
  industry_domain: z.string().trim().max(100, "Industry must be less than 100 characters").optional(),
  contact_person: z.string().trim().max(100, "Contact person must be less than 100 characters").optional(),
  contact_email: z.string().trim().email("Please enter a valid email").max(255).optional().or(z.literal("")),
  contact_phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  alternate_phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

// Drive validations
export const driveSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  academic_year: z.string().optional(),
  drive_type: z.enum(["placement", "internship", "both"]),
  role_offered: z.string().trim().max(200, "Role must be less than 200 characters").optional(),
  visit_date: z.string().min(1, "Visit date is required"),
  visit_time: z.string().nullish(),
  visit_mode: z.enum(["on_campus", "off_campus", "virtual"]),
  stipend_amount: z.number().min(0).optional().nullable(),
  ctc_amount: z.number().min(0).optional().nullable(),
  remarks: z.string().trim().max(1000, "Remarks must be less than 1000 characters").optional(),
  eligible_departments: z.array(z.string().uuid()).min(1, "Select at least one department"),
  job_description: z.string().nullish(),
  bond_details: z.string().nullish(),
  work_location: z.string().nullish(),
  min_cgpa: z.number().min(0).max(10).optional().default(0),
  max_backlogs: z.number().int().min(0).optional().default(0),
  max_history_arrears: z.number().int().min(0).optional().default(0),
  eligible_batches: z.string().nullish(),
  min_10th_mark: z.number().min(0).max(100).optional().default(0),
  min_12th_mark: z.number().min(0).max(100).optional().default(0),
  application_deadline: z.string().nullish(),
});

export type DriveFormData = z.infer<typeof driveSchema>;

// Statistics validations
export const statisticsSchema = z.object({
  drive_id: z.string().uuid(),
  department_id: z.string().uuid(),
  students_appeared: z.number().int().min(0, "Cannot be negative"),
  students_selected: z.number().int().min(0, "Cannot be negative"),
  ppo_count: z.number().int().min(0, "Cannot be negative"),
});

export type StatisticsFormData = z.infer<typeof statisticsSchema>;

// Student Master validations
export const studentMasterSchema = z.object({
  email_address: z.string().email("Invalid email").min(1, "Email is required"),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  gender: z.string().nullish(),
  date_of_birth: z.string().nullish(),
  blood_group: z.string().nullish(),
  mobile_number: z.string().nullish(),
  marital_status: z.string().nullish(),
  aadhar_number: z.string().nullish(),
  community: z.string().nullish(),
  geographic_classification: z.string().nullish(),
  caste: z.string().nullish(),
  religion: z.string().nullish(),
  mother_tongue: z.string().nullish(),
  nationality: z.string().nullish(),
  state: z.string().nullish(),
  // Academic - Schooling
  tenth_mark: z.string().nullish(),
  tenth_board: z.string().nullish(),
  twelfth_mark: z.string().nullish(),
  twelfth_school_board: z.string().nullish(),
  twelfth_school_name: z.string().nullish(),
  twelfth_school_address: z.string().nullish(),
  twelfth_register_number: z.string().nullish(),
  medium_of_instruction: z.string().nullish(),

  // Academic - College
  current_cgpa: z.string().nullish(),
  current_backlogs: z.string().nullish(),
  history_of_arrears_count: z.string().nullish(),
  current_standing_arrear: z.string().nullish(),
  history_of_arrear: z.string().nullish(),
  
  // Placement Details
  resume_url: z.string().nullish(),
  skills: z.string().nullish(),
  internship_experience: z.string().nullish(),
  projects: z.string().nullish(),
  certifications: z.string().nullish(),
  preferred_job_role: z.string().nullish(),
  preferred_location: z.string().nullish(),

  // Personal & Other
  is_parent_farmer: z.string().nullish(),
  is_physically_challenged: z.string().nullish(),
  is_ex_serviceman_child: z.string().nullish(),
  sports_representation: z.string().nullish(),
  qualifying_exam_details: z.string().nullish(),
  extra_curricular: z.string().nullish(),
  studied_tamil_10th: z.string().nullish(),
  is_andaman_nicobar: z.string().nullish(),
  ncc_a_certificate: z.string().nullish(),
  transport: z.string().nullish(),
  wants_hostel: z.string().nullish(),
  father_guardian_name: z.string().nullish(),
  father_mobile_number: z.string().nullish(),
  mother_name: z.string().nullish(),
  mother_mobile_number: z.string().nullish(),
  occupation_father_guardian: z.string().nullish(),
  communication_door_street: z.string().nullish(),
  communication_area_village: z.string().nullish(),
  communication_pincode: z.string().nullish(),
  regulations: z.string().nullish(),
  batches: z.string().nullish(),
  degree_branches: z.string().nullish(),
  reg_no: z.string().nullish(),
  roll_number: z.string().nullish(),
  student_status: z.string().nullish(),
  mode_of_education: z.string().nullish(),
  mode_of_admission: z.string().nullish(),
  section: z.string().nullish(),
  quota: z.string().nullish(),
  medium: z.string().nullish(),
  current_semester: z.string().nullish(),
  is_hosteller: z.string().nullish(),
  is_transport: z.string().nullish(),
});

export type StudentMasterFormData = z.infer<typeof studentMasterSchema>;