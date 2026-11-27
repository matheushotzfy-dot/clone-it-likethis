-- Verificação de identidade do cadastro (documento + selfie) não exige comprovante
-- de residência; o comprovante continua sendo pedido nos documentos de saque.
alter table public.kyc_submissions alter column residence_url drop not null;
