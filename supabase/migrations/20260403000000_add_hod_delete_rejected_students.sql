-- Allow department coordinators to delete rejected student master records
-- only within their own department.

DROP POLICY IF EXISTS "Dept coordinators can delete rejected students" ON public.students_master;

CREATE POLICY "Dept coordinators can delete rejected students"
ON public.students_master
FOR DELETE
TO authenticated
USING (
  public.is_department_coordinator(auth.uid())
  AND approval_status = 'rejected'
  AND department_id = public.get_user_department(auth.uid())
);
