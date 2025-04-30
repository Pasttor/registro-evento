// pages/registro/[id].tsx
import { GetServerSideProps } from 'next';
import { supabase } from '@/utils/supabaseClient';    



interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  qr_code_url: string | null;
  created_at: string;
}

interface Props {
  registration: Registration | null;
  error?: string;
}

export default function RegistroPage({ registration, error }: Props) {
  if (error) {
    return (
      <div className="container py-5">
        <h1 className="text-danger">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="container py-5">
        <h1 className="text-warning">Registro no encontrado</h1>
        <p>El código QR no corresponde a ningún registro válido.</p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">Detalle de Registro</h1>
      <div className="card">
        <div className="card-body">
          <p><strong>Nombre:</strong> {registration.name}</p>
          <p><strong>Email:</strong> {registration.email}</p>
          <p><strong>Teléfono:</strong> {registration.phone}</p>
          <p><strong>Rol:</strong> {registration.role}</p>
          <p><strong>Registrado:</strong> {new Date(registration.created_at).toLocaleString()}</p>
          {registration.qr_code_url && (
            <>
              <p className="mt-3"><strong>Tu QR:</strong></p>
              <img src={registration.qr_code_url} alt="Código QR" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { id } = ctx.params!;

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id as string)
      .single();

    if (error || !data) {
      return { props: { registration: null } };
    }

    return { props: { registration: data } };
  } catch (err: any) {
    return { props: { registration: null, error: err.message } };
  }
};

