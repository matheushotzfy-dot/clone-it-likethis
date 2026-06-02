
-- 1. Protect user_roles from privilege escalation: only admins can INSERT/UPDATE/DELETE
CREATE POLICY "Admins insert user_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update user_roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete user_roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all user_roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Realtime channel authorization: restrict topic subscriptions to user's own tx:<uid> channel
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users subscribe to their own tx channel"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() = ('tx:' || auth.uid()::text)
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. Avatars bucket: allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. KYC documents bucket: allow admins to delete for lifecycle management
CREATE POLICY "Admins can delete kyc documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.has_role(auth.uid(), 'admin')
);
