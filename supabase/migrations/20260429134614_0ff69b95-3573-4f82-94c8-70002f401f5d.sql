DO $upsert$
DECLARE
  v_group_id uuid;
  v_target_group_id uuid;
  v_today date := CURRENT_DATE;
  v_status class_status;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('e7a80794-e850-4d7e-9912-724f5b9c920c'::uuid, DATE '2026-07-03', DATE '2026-07-05'),
      ('e7a80794-e850-4d7e-9912-724f5b9c920c'::uuid, DATE '2026-10-02', DATE '2026-10-04'),
      ('83358c92-2402-47c4-8c73-f8913f58a98f'::uuid, DATE '2026-10-29', DATE '2026-10-31'),
      ('c52a90e6-e959-4908-869d-6daf7275502c'::uuid, DATE '2026-06-12', DATE '2026-06-13'),
      ('c52a90e6-e959-4908-869d-6daf7275502c'::uuid, DATE '2026-10-30', DATE '2026-10-31'),
      ('7533824b-63fd-4859-a1d0-50dc1c652c1a'::uuid, DATE '2026-06-13', DATE '2026-06-14'),
      ('7533824b-63fd-4859-a1d0-50dc1c652c1a'::uuid, DATE '2026-10-31', DATE '2026-11-01'),
      ('125ec26d-3f49-44f4-a74c-6253b5a50e57'::uuid, DATE '2026-06-04', DATE '2026-06-06'),
      ('4163a453-44bd-4699-959c-bb662b11d4a0'::uuid, DATE '2026-08-13', DATE '2026-08-15'),
      ('4238ae59-9da8-409a-98eb-89cdf82b84d5'::uuid, DATE '2026-05-27', DATE '2026-05-31'),
      ('4238ae59-9da8-409a-98eb-89cdf82b84d5'::uuid, DATE '2026-11-25', DATE '2026-11-29'),
      ('05edb897-befd-4f50-b740-d3fba646b9fc'::uuid, DATE '2026-05-30', DATE '2026-05-31'),
      ('05edb897-befd-4f50-b740-d3fba646b9fc'::uuid, DATE '2026-11-28', DATE '2026-11-29'),
      ('b675e06f-2a08-4a02-9f10-17e8d126921a'::uuid, DATE '2026-06-18', DATE '2026-06-20'),
      ('b675e06f-2a08-4a02-9f10-17e8d126921a'::uuid, DATE '2026-10-23', DATE '2026-10-25'),
      ('671e8c3e-fb87-478e-b91a-c0e0744d0b38'::uuid, DATE '2026-05-15', DATE '2026-05-16'),
      ('671e8c3e-fb87-478e-b91a-c0e0744d0b38'::uuid, DATE '2026-07-03', DATE '2026-07-04'),
      ('671e8c3e-fb87-478e-b91a-c0e0744d0b38'::uuid, DATE '2026-11-05', DATE '2026-11-06'),
      ('dd6cbfc2-e514-44bf-b4a5-88791fee5905'::uuid, DATE '2026-07-31', DATE '2026-08-02'),
      ('02cd005e-e842-4d35-bd49-b4e664daccee'::uuid, DATE '2026-05-29', DATE '2026-05-30'),
      ('02cd005e-e842-4d35-bd49-b4e664daccee'::uuid, DATE '2026-08-20', DATE '2026-08-21'),
      ('02cd005e-e842-4d35-bd49-b4e664daccee'::uuid, DATE '2026-11-19', DATE '2026-11-20'),
      ('91bf7fb2-3fe4-4bea-a298-fb0e885ffa5e'::uuid, DATE '2026-08-22', DATE '2026-08-23'),
      ('91bf7fb2-3fe4-4bea-a298-fb0e885ffa5e'::uuid, DATE '2026-11-21', DATE '2026-11-22'),
      ('28040751-a4a6-4e10-96f8-b16ff7c0252f'::uuid, DATE '2026-07-17', DATE '2026-07-22'),
      ('28040751-a4a6-4e10-96f8-b16ff7c0252f'::uuid, DATE '2026-09-18', DATE '2026-09-23'),
      ('28040751-a4a6-4e10-96f8-b16ff7c0252f'::uuid, DATE '2026-12-04', DATE '2026-12-09'),
      ('4d13307f-a50a-4fcd-994f-53e81b17ab59'::uuid, DATE '2026-07-23', DATE '2026-07-25'),
      ('4d13307f-a50a-4fcd-994f-53e81b17ab59'::uuid, DATE '2026-09-24', DATE '2026-09-26'),
      ('4d13307f-a50a-4fcd-994f-53e81b17ab59'::uuid, DATE '2026-12-10', DATE '2026-12-12'),
      ('d912ee35-cddc-4f17-a93a-1f40c15a1f16'::uuid, DATE '2026-08-27', DATE '2026-08-29'),
      ('d912ee35-cddc-4f17-a93a-1f40c15a1f16'::uuid, DATE '2026-10-29', DATE '2026-10-31'),
      ('9ae89523-77ce-483f-b09e-2f1b83de20aa'::uuid, DATE '2026-07-09', DATE '2026-07-11'),
      ('9ae89523-77ce-483f-b09e-2f1b83de20aa'::uuid, DATE '2026-11-06', DATE '2026-11-08'),
      ('11111111-1111-1111-1111-111111111111'::uuid, DATE '2026-09-09', DATE '2026-09-12'),
      ('e5c11719-fbba-4daa-b485-ef58b4fa6c61'::uuid, DATE '2026-09-04', DATE '2026-09-06'),
      ('2b6a7a74-b740-44cb-a205-9dc26555f6ae'::uuid, DATE '2026-06-26', DATE '2026-06-28'),
      ('b72c8df9-36d9-490e-ae1e-f548bf0b961a'::uuid, DATE '2026-07-31', DATE '2026-08-01'),
      ('a32a5173-b199-4276-8835-87551b29cca7'::uuid, DATE '2026-08-21', DATE '2026-08-23'),
      ('26a5bdfc-2b73-46c7-b386-33b2f372e115'::uuid, DATE '2026-08-06', DATE '2026-08-07'),
      ('26a5bdfc-2b73-46c7-b386-33b2f372e115'::uuid, DATE '2026-10-13', DATE '2026-10-14'),
      ('d5d54418-1437-4183-90e9-c0efc7f534be'::uuid, DATE '2026-08-12', DATE '2026-08-15'),
      ('d5d54418-1437-4183-90e9-c0efc7f534be'::uuid, DATE '2026-12-10', DATE '2026-12-13'),
      ('2bdf2e9d-8358-4e36-8cc9-98597bef0498'::uuid, DATE '2026-10-16', DATE '2026-10-18'),
      ('42cf1341-11ad-4496-8e87-02ae66b5b7a4'::uuid, DATE '2026-10-16', DATE '2026-10-18'),
      ('5a3b54f6-00a0-4082-b6b2-f6cced931612'::uuid, DATE '2026-07-30', DATE '2026-07-30'),
      ('5a3b54f6-00a0-4082-b6b2-f6cced931612'::uuid, DATE '2026-12-17', DATE '2026-12-17'),
      ('760da77f-03da-4365-8d69-6d918405a93d'::uuid, DATE '2026-06-05', DATE '2026-06-07'),
      ('76f99b1b-46fb-45e9-b705-c9e3fd246421'::uuid, DATE '2026-07-17', DATE '2026-07-19'),
      ('a681981c-d6db-40c8-9d00-ad19fcfceed9'::uuid, DATE '2026-08-28', DATE '2026-08-30')
    ) AS t(course_id, start_date, end_date)
  LOOP
    -- compute status
    IF v_today BETWEEN r.start_date AND r.end_date THEN
      v_status := 'atual'::class_status;
    ELSIF r.end_date < v_today THEN
      v_status := 'encerrada'::class_status;
    ELSE
      v_status := 'proxima'::class_status;
    END IF;

    v_group_id := NULL;
    v_target_group_id := NULL;

    -- A) Existing link for this course in same year-month
    SELECT cg.id INTO v_group_id
    FROM public.class_groups cg
    JOIN public.class_group_courses cgc ON cgc.group_id = cg.id
    WHERE cg.unit = 'sao_paulo'
      AND cgc.course_id = r.course_id
      AND to_char(cg.start_date, 'YYYY-MM') = to_char(r.start_date, 'YYYY-MM')
    LIMIT 1;

    -- B) Group that already has the EXACT target window (shared window)
    SELECT id INTO v_target_group_id
    FROM public.class_groups
    WHERE unit = 'sao_paulo'
      AND start_date = r.start_date
      AND end_date   = r.end_date
    LIMIT 1;

    IF v_group_id IS NOT NULL AND v_target_group_id IS NOT NULL AND v_group_id <> v_target_group_id THEN
      -- Course is currently linked to a group with different dates, but a group with the target window exists.
      -- Move the course link to the target group (merge), then delete the old group if it has no more links.
      UPDATE public.class_group_courses
      SET group_id = v_target_group_id
      WHERE group_id = v_group_id AND course_id = r.course_id;

      -- ensure target group status reflects today
      UPDATE public.class_groups
      SET status = v_status, updated_at = now()
      WHERE id = v_target_group_id;

      -- cleanup orphan group
      DELETE FROM public.class_groups
      WHERE id = v_group_id
        AND NOT EXISTS (SELECT 1 FROM public.class_group_courses WHERE group_id = v_group_id);

    ELSIF v_group_id IS NOT NULL THEN
      -- Just update dates on existing group (safe: no exact-match conflict)
      UPDATE public.class_groups
      SET start_date = r.start_date,
          end_date   = r.end_date,
          status     = v_status,
          updated_at = now()
      WHERE id = v_group_id;

    ELSIF v_target_group_id IS NOT NULL THEN
      -- No prior link, but a shared window already exists -> link the course to it
      UPDATE public.class_groups
      SET status = v_status, updated_at = now()
      WHERE id = v_target_group_id;

      INSERT INTO public.class_group_courses (group_id, course_id, display_mode)
      SELECT v_target_group_id, r.course_id, 'individual'::class_display_mode
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_group_courses
        WHERE group_id = v_target_group_id AND course_id = r.course_id
      );

    ELSE
      -- Create brand-new group + link
      INSERT INTO public.class_groups (unit, start_date, end_date, status)
      VALUES ('sao_paulo', r.start_date, r.end_date, v_status)
      RETURNING id INTO v_group_id;

      INSERT INTO public.class_group_courses (group_id, course_id, display_mode)
      VALUES (v_group_id, r.course_id, 'individual'::class_display_mode);
    END IF;
  END LOOP;
END
$upsert$;