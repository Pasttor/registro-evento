import { useState, FormEvent } from 'react';

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: 'Asistente' | 'Ponente';
  opt_in_terms: boolean;
  opt_in_newsletter: boolean;
}

export default function HomePage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    role: 'Asistente',
    opt_in_terms: false,
    opt_in_newsletter: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    // casteo temporal a HTMLInputElement
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
  
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage({ type: 'success', text: '¡Registro exitoso! Revisa tu correo.' });
      setForm({
        name: '',
        email: '',
        phone: '',
        role: 'Asistente',
        opt_in_terms: false,
        opt_in_newsletter: false,
      });
    } else {
      setMessage({ type: 'error', text: data.error || 'Ocurrió un error, inténtalo de nuevo.' });
    }

    setLoading(false);
  };

  return (
    <div className="container py-5">
      <h1 className="mb-4">Registro al Evento</h1>
      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Nombre completo</label>
          <input
            type="text"
            className="form-control"
            id="name"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="email" className="form-label">Correo electrónico</label>
          <input
            type="email"
            className="form-control"
            id="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="phone" className="form-label">Número de teléfono</label>
          <input
            type="tel"
            className="form-control"
            id="phone"
            name="phone"
            required
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="role" className="form-label">Rol</label>
          <select
            className="form-select"
            id="role"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option>Asistente</option>
            <option>Ponente</option>
          </select>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="opt_in_terms"
            name="opt_in_terms"
            checked={form.opt_in_terms}
            onChange={handleChange}
            required
          />
          <label className="form-check-label" htmlFor="opt_in_terms">
            Acepto los términos y condiciones
          </label>
        </div>

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="opt_in_newsletter"
            name="opt_in_newsletter"
            checked={form.opt_in_newsletter}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="opt_in_newsletter">
            Deseo recibir el newsletter
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Registrando...' : 'Enviar registro'}
        </button>
      </form>
    </div>
  );
}
