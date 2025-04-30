import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { Resend } from 'resend';  

interface RegisterBody {
  name: string;
  email: string;
  phone: string;
  role: 'Asistente' | 'Ponente';
  opt_in_terms: boolean;
  opt_in_newsletter: boolean;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const body = req.body as RegisterBody;
  // Validación básica
  if (!body.name || !body.email || !body.phone || !body.opt_in_terms) {
    return res.status(400).json({ error: 'Faltan datos obligatorios o no aceptaste términos.' });
  }

  try {
    // 1) Insertar registro en Supabase
    const { data: insertData, error: insertError } = await supabase
      .from('registrations')
      .insert([{
        name: body.name,
        email: body.email,
        phone: body.phone,
        role: body.role,
        opt_in_terms: body.opt_in_terms,
        opt_in_newsletter: body.opt_in_newsletter,
      }])
      .select('id')
      .single();

    if (insertError || !insertData) {
      console.error('Insert error:', insertError);
      throw new Error('Error insertando en base de datos');
    }

    const recordId = insertData.id as string;

    // 2) Generar QR (Data URL)
    const qrUrl = await QRCode.toDataURL(
      `${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/registro/${recordId}`
    );

    // 3) Actualizar registro con la URL del QR
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ qr_code_url: qrUrl })
      .eq('id', recordId);

    if (updateError) {
      console.error('Update error:', updateError);
      // seguimos, aunque no crítico
    }

    // 4) Enviar email de confirmación
    await resend.emails.send({
      from: 'no-reply@' + new URL(process.env.NEXT_PUBLIC_VERCEL_URL!).host,
      to: [body.email],
      subject: 'Confirmación de tu registro al evento',
      html: `
        <h2>¡Hola ${body.name}!</h2>
        <p>Gracias por registrarte al evento como <strong>${body.role}</strong>.</p>
        <ul>
          <li><strong>Nombre:</strong> ${body.name}</li>
          <li><strong>Email:</strong> ${body.email}</li>
          <li><strong>Teléfono:</strong> ${body.phone}</li>
        </ul>
        <p>Tu código QR de acceso:</p>
        <img src="${qrUrl}" alt="Código QR" />
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Register handler error:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}
