// pages/api/register.ts
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
  if (!body.name || !body.email || !body.phone || !body.opt_in_terms) {
    return res.status(400).json({ error: 'Faltan datos obligatorios o no aceptaste términos.' });
  }

  try {
    // 1) Inserción en Supabase
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
      console.error('Error insertando:', insertError);
      throw new Error('Error insertando en base de datos');
    }
    const recordId = insertData.id;

    // 2) Generar QR como buffer PNG
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ??
                     process.env.NEXT_PUBLIC_VERCEL_URL ??
                     'http://localhost:3000')
                    .replace(/\/$/, '');
    const qrText = `${baseUrl}/registro/${recordId}`;
    const pngBuffer = await QRCode.toBuffer(qrText);

    // 3) Subir al bucket público 'qrcodes'
    const filePath = `qrcodes/${recordId}.png`;
    const { error: uploadError } = await supabase
      .storage
      .from('qrcodes')
      .upload(filePath, pngBuffer, {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploadError) {
      console.error('Error subiendo a Storage:', uploadError);
      // seguimos aun si falla
    }

    // 4) Obtener publicUrl correctamente
    //    Según Supabase JS v2, getPublicUrl devuelve { data: { publicUrl: string } }
    const publicUrlResult = supabase
      .storage
      .from('qrcodes')
      .getPublicUrl(filePath);

    // TypeScript asegura que publicUrlResult.data.publicUrl existe
    const publicUrl = publicUrlResult.data.publicUrl;

    // 5) Guardar URL del QR en la tabla
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ qr_code_url: publicUrl })
      .eq('id', recordId);
    if (updateError) {
      console.error('Error actualizando qr_code_url:', updateError);
    }

    // 6) Enviar email con Resend
    await resend.emails.send({
      from: `no-reply@${process.env.RESEND_SENDER_DOMAIN!}`,
      to: [body.email],
      subject: 'Confirmación de tu registro al evento',
      html: `
        <h2>¡Hola ${body.name}!</h2>
        <p>Gracias por registrarte como <strong>${body.role}</strong>.</p>
        <ul>
          <li><strong>Nombre:</strong> ${body.name}</li>
          <li><strong>Email:</strong> ${body.email}</li>
          <li><strong>Teléfono:</strong> ${body.phone}</li>
        </ul>
        <p>Tu código QR de acceso:</p>
        <img src="${publicUrl}" alt="Código QR" style="max-width:200px;" />
      `,
    });

    return res.status(200).json({ success: true, id: recordId });
  } catch (err: any) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
