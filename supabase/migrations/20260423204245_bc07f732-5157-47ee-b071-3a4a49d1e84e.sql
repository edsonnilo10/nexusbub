DELETE FROM public.paid_students
WHERE student_name IN ('1.PAGO', '2.PAGO', '0.PAGO')
   OR student_name ~ '^\d{2}/\d{2}/\d{4}$'
   OR course_name ~ '^\d{2}/\d{2}/\d{4}$';