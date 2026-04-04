export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean | null
          start_date: string
          year_label: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean | null
          start_date: string
          year_label: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          start_date?: string
          year_label?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          alternate_phone: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          industry_domain: string | null
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          alternate_phone?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry_domain?: string | null
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          alternate_phone?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry_domain?: string | null
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      drive_eligible_departments: {
        Row: {
          created_at: string
          department_id: string
          drive_id: string
          id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          drive_id: string
          id?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          drive_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_eligible_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_eligible_departments_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "placement_drives"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_drives: {
        Row: {
          academic_year_id: string
          company_id: string
          created_at: string
          created_by: string | null
          ctc_amount: number | null
          drive_type: Database["public"]["Enums"]["drive_type"]
          id: string
          remarks: string | null
          role_offered: string | null
          stipend_amount: number | null
          updated_at: string
          visit_date: string
          visit_mode: Database["public"]["Enums"]["visit_mode"]
          visit_time: string | null
          min_cgpa: number | null
          max_backlogs: number | null
          min_10th_mark: number | null
          min_12th_mark: number | null
          job_description: string | null
          work_location: string | null
          bond_details: string | null
          application_deadline: string | null
          company_website: string | null
          company_linkedin: string | null
          other_links: string | null
          max_history_arrears: number | null
          status: string | null
          eligible_batches: string | null
        }
        Insert: {
          academic_year_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          ctc_amount?: number | null
          drive_type?: Database["public"]["Enums"]["drive_type"]
          id?: string
          remarks?: string | null
          role_offered?: string | null
          stipend_amount?: number | null
          updated_at?: string
          visit_date: string
          visit_mode?: Database["public"]["Enums"]["visit_mode"]
          visit_time?: string | null
          min_cgpa?: number | null
          max_backlogs?: number | null
          min_10th_mark?: number | null
          min_12th_mark?: number | null
          job_description?: string | null
          work_location?: string | null
          bond_details?: string | null
          application_deadline?: string | null
          company_website?: string | null
          company_linkedin?: string | null
          other_links?: string | null
          max_history_arrears?: number | null
          status?: string | null
          eligible_batches?: string | null
        }
        Update: {
          academic_year_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          ctc_amount?: number | null
          drive_type?: Database["public"]["Enums"]["drive_type"]
          id?: string
          remarks?: string | null
          role_offered?: string | null
          stipend_amount?: number | null
          updated_at?: string
          visit_date?: string
          visit_mode?: Database["public"]["Enums"]["visit_mode"]
          visit_time?: string | null
          min_cgpa?: number | null
          max_backlogs?: number | null
          min_10th_mark?: number | null
          min_12th_mark?: number | null
          job_description?: string | null
          work_location?: string | null
          bond_details?: string | null
          application_deadline?: string | null
          company_website?: string | null
          company_linkedin?: string | null
          other_links?: string | null
          max_history_arrears?: number | null
          status?: string | null
          eligible_batches?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placement_drives_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_drives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_drives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          last_login: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id: string
          last_login?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_statistics: {
        Row: {
          created_at: string
          department_id: string
          drive_id: string
          id: string
          ppo_count: number
          students_appeared: number
          students_selected: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          drive_id: string
          id?: string
          ppo_count?: number
          students_appeared?: number
          students_selected?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          drive_id?: string
          id?: string
          ppo_count?: number
          students_appeared?: number
          students_selected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_statistics_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_statistics_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "placement_drives"
            referencedColumns: ["id"]
          },
        ]
      }
      students_master: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          approval_status: string | null
          department_id: string | null
          email_address: string | null
          first_name: string | null
          last_name: string | null
          gender: string | null
          date_of_birth: string | null
          blood_group: string | null
          mobile_number: string | null
          marital_status: string | null
          aadhar_number: string | null
          community: string | null
          geographic_classification: string | null
          caste: string | null
          religion: string | null
          mother_tongue: string | null
          nationality: string | null
          state: string | null
          district: string | null
          alternate_email: string | null
          whatsapp_number: string | null
          pan_number: string | null
          passport_available: string | null
          passport_number: string | null
          hostel_name: string | null
          profile_status: string | null
          twelfth_reg_no: string | null
          school_name_12th: string | null
          school_address_12th: string | null
          board_12th: string | null
          is_parent_farmer: string | null
          medium_of_instruction: string | null
          is_physically_challenged: string | null
          current_cgpa: string | null
          current_standing_arrear: string | null
          history_of_arrear: string | null
          is_first_graduate: string | null
          is_single_parent: string | null
          is_ex_serviceman_child: string | null
          sports_representation: string | null
          qualifying_exam_details: string | null
          extra_curricular: string | null
          studied_tamil_10th: string | null
          is_andaman_nicobar: string | null
          ncc_a_certificate: string | null
          completion_month_year: string | null
          transport: string | null
          wants_hostel: string | null
          father_guardian_name: string | null
          father_mobile_number: string | null
          mother_name: string | null
          mother_mobile_number: string | null
          occupation_father_guardian: string | null
          communication_door_street: string | null
          communication_area_village: string | null
          communication_pincode: string | null
          regulations: string | null
          batches: string | null
          degree_branches: string | null
          reg_no: string | null
          roll_number: string | null
          student_status: string | null
          mode_of_education: string | null
          mode_of_admission: string | null
          section: string | null
          quota: string | null
          medium: string | null
          current_semester: string | null
          is_hosteller: string | null
          is_transport: string | null
          mark_10th: string | null
          percentage_10th: string | null
          school_name_10th: string | null
          board_10th: string | null
          mark_12th: string | null
          percentage_12th: string | null
          diploma_studied: string | null
          diploma_institute_name: string | null
          diploma_stream: string | null
          work_experience: string | null
          current_year: string | null
          sem_1_cgpa: string | null
          sem_2_cgpa: string | null
          sem_3_cgpa: string | null
          sem_4_cgpa: string | null
          sem_5_cgpa: string | null
          sem_6_cgpa: string | null
          sem_7_cgpa: string | null
          sem_8_cgpa: string | null
          overall_cgpa: string | null
          current_backlogs: string | null
          history_of_arrears_count: string | null
          resume_url: string | null
          photo_url: string | null
          skills: string | null
          programming_languages: string | null
          internship_experience: string | null
          projects: string | null
          certifications: string | null
          preferred_job_role: string | null
          preferred_location: string | null
          github_url: string | null
          linkedin_url: string | null
          hackerrank_url: string | null
          leetcode_url: string | null
          interested_in_placement: string | null
          placement_opt_out_reason: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          approval_status?: string | null
          department_id?: string | null
          email_address?: string | null
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          date_of_birth?: string | null
          blood_group?: string | null
          mobile_number?: string | null
          marital_status?: string | null
          aadhar_number?: string | null
          community?: string | null
          geographic_classification?: string | null
          caste?: string | null
          religion?: string | null
          mother_tongue?: string | null
          nationality?: string | null
          state?: string | null
          district?: string | null
          alternate_email?: string | null
          whatsapp_number?: string | null
          pan_number?: string | null
          passport_available?: string | null
          passport_number?: string | null
          hostel_name?: string | null
          profile_status?: string | null
          twelfth_reg_no?: string | null
          school_name_12th?: string | null
          school_address_12th?: string | null
          board_12th?: string | null
          is_parent_farmer?: string | null
          medium_of_instruction?: string | null
          is_physically_challenged?: string | null
          current_cgpa?: string | null
          current_standing_arrear?: string | null
          history_of_arrear?: string | null
          is_first_graduate?: string | null
          is_single_parent?: string | null
          is_ex_serviceman_child?: string | null
          sports_representation?: string | null
          qualifying_exam_details?: string | null
          extra_curricular?: string | null
          studied_tamil_10th?: string | null
          is_andaman_nicobar?: string | null
          ncc_a_certificate?: string | null
          completion_month_year?: string | null
          transport?: string | null
          wants_hostel?: string | null
          father_guardian_name?: string | null
          father_mobile_number?: string | null
          mother_name?: string | null
          mother_mobile_number?: string | null
          occupation_father_guardian?: string | null
          communication_door_street?: string | null
          communication_area_village?: string | null
          communication_pincode?: string | null
          regulations?: string | null
          batches?: string | null
          degree_branches?: string | null
          reg_no?: string | null
          roll_number?: string | null
          student_status?: string | null
          mode_of_education?: string | null
          mode_of_admission?: string | null
          section?: string | null
          quota?: string | null
          medium?: string | null
          current_semester?: string | null
          is_hosteller?: string | null
          is_transport?: string | null
          mark_10th?: string | null
          percentage_10th?: string | null
          school_name_10th?: string | null
          board_10th?: string | null
          mark_12th?: string | null
          percentage_12th?: string | null
          diploma_studied?: string | null
          diploma_institute_name?: string | null
          diploma_stream?: string | null
          work_experience?: string | null
          current_year?: string | null
          sem_1_cgpa?: string | null
          sem_2_cgpa?: string | null
          sem_3_cgpa?: string | null
          sem_4_cgpa?: string | null
          sem_5_cgpa?: string | null
          sem_6_cgpa?: string | null
          sem_7_cgpa?: string | null
          sem_8_cgpa?: string | null
          overall_cgpa?: string | null
          current_backlogs?: string | null
          history_of_arrears_count?: string | null
          resume_url?: string | null
          photo_url?: string | null
          skills?: string | null
          programming_languages?: string | null
          internship_experience?: string | null
          projects?: string | null
          certifications?: string | null
          preferred_job_role?: string | null
          preferred_location?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          hackerrank_url?: string | null
          leetcode_url?: string | null
          interested_in_placement?: string | null
          placement_opt_out_reason?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          approval_status?: string | null
          department_id?: string | null
          email_address?: string | null
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          date_of_birth?: string | null
          blood_group?: string | null
          mobile_number?: string | null
          marital_status?: string | null
          aadhar_number?: string | null
          community?: string | null
          geographic_classification?: string | null
          caste?: string | null
          religion?: string | null
          mother_tongue?: string | null
          nationality?: string | null
          state?: string | null
          district?: string | null
          alternate_email?: string | null
          whatsapp_number?: string | null
          pan_number?: string | null
          passport_available?: string | null
          passport_number?: string | null
          hostel_name?: string | null
          profile_status?: string | null
          twelfth_reg_no?: string | null
          school_name_12th?: string | null
          school_address_12th?: string | null
          board_12th?: string | null
          is_parent_farmer?: string | null
          medium_of_instruction?: string | null
          is_physically_challenged?: string | null
          current_cgpa?: string | null
          current_standing_arrear?: string | null
          history_of_arrear?: string | null
          is_first_graduate?: string | null
          is_single_parent?: string | null
          is_ex_serviceman_child?: string | null
          sports_representation?: string | null
          qualifying_exam_details?: string | null
          extra_curricular?: string | null
          studied_tamil_10th?: string | null
          is_andaman_nicobar?: string | null
          ncc_a_certificate?: string | null
          completion_month_year?: string | null
          transport?: string | null
          wants_hostel?: string | null
          father_guardian_name?: string | null
          father_mobile_number?: string | null
          mother_name?: string | null
          mother_mobile_number?: string | null
          occupation_father_guardian?: string | null
          communication_door_street?: string | null
          communication_area_village?: string | null
          communication_pincode?: string | null
          regulations?: string | null
          batches?: string | null
          degree_branches?: string | null
          reg_no?: string | null
          roll_number?: string | null
          student_status?: string | null
          mode_of_education?: string | null
          mode_of_admission?: string | null
          section?: string | null
          quota?: string | null
          medium?: string | null
          current_semester?: string | null
          is_hosteller?: string | null
          is_transport?: string | null
          mark_10th?: string | null
          percentage_10th?: string | null
          school_name_10th?: string | null
          board_10th?: string | null
          mark_12th?: string | null
          percentage_12th?: string | null
          diploma_studied?: string | null
          diploma_institute_name?: string | null
          diploma_stream?: string | null
          work_experience?: string | null
          current_year?: string | null
          sem_1_cgpa?: string | null
          sem_2_cgpa?: string | null
          sem_3_cgpa?: string | null
          sem_4_cgpa?: string | null
          sem_5_cgpa?: string | null
          sem_6_cgpa?: string | null
          sem_7_cgpa?: string | null
          sem_8_cgpa?: string | null
          overall_cgpa?: string | null
          current_backlogs?: string | null
          history_of_arrears_count?: string | null
          resume_url?: string | null
          photo_url?: string | null
          skills?: string | null
          programming_languages?: string | null
          internship_experience?: string | null
          projects?: string | null
          certifications?: string | null
          preferred_job_role?: string | null
          preferred_location?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          hackerrank_url?: string | null
          leetcode_url?: string | null
          interested_in_placement?: string | null
          placement_opt_out_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_master_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_master_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_department: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_department_coordinator: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_management: { Args: { _user_id: string }; Returns: boolean }
      is_placement_officer: { Args: { _user_id: string }; Returns: boolean }
      safe_apply_for_drive: {
        Args: {
          p_drive_id: string
          p_student_id: string
          p_resume_url: string | null
        }
        Returns: { success: boolean; message: string }
      }
      get_application_pool: {
        Args: {
          p_drive_id: string | null
          p_search: string | null
        }
        Returns: any[]
      }
    }
    Enums: {
      app_role: "placement_officer" | "department_coordinator" | "management" | "student"
      audit_action: "CREATE" | "UPDATE" | "DELETE"
      drive_type: "placement" | "internship" | "both"
      visit_mode: "on_campus" | "off_campus" | "virtual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["placement_officer", "department_coordinator", "management", "student"],
      audit_action: ["CREATE", "UPDATE", "DELETE"],
      drive_type: ["placement", "internship", "both"],
      visit_mode: ["on_campus", "off_campus", "virtual"],
    },
  },
} as const
