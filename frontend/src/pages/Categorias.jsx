// src/pages/Categorias.jsx
import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import TutorialGuide from '../components/TutorialGuide.jsx';
import { Loading, ErrorBox, Empty } from '../components/States';
import { useTutorial } from '../contexts/TutorialContext.jsx';

const COLORES = [
  '#1f2937', '#15803d', '#b91c1c', '#c2410c', '#a88a3a',
  '#0891b2', '#9333ea', '#db2777', '#0f766e', '#7c2d12',
];

export default function Categorias() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(false);
  const tutorial = useTutorial();

  const load = () => {
    setLoading(true);
    api.getCategorias()
      .then(setCats)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría? Las transacciones asociadas quedarán sin categoría.')) return;
    await api.deleteCategoria(id);
    load();
  };

  const handleSaved = () => {
    setModal(false);
    load();
    if (tutorial?.active && tutorial?.step === 1) {
      setTimeout(() => tutorial.completeStep(1), 800);
    }
  };

  const ingresos = cats.filter(c => c.tipo === 'ingreso');
  const egresos = cats.filter(c => c.tipo === 'egreso');

  return (
    <>
      <PageHeader
        eyebrow="Sección 05"
        title="Categorías"
        subtitle="Etiquetas que clasifican tus ingresos y egresos para análisis y presupuestos."
        actions={
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus size={16} strokeWidth={1.5} />
            Nueva categoría
          </button>
        }
      />

      {/* ── Guía interactiva (solo visible en paso 1 del tutorial) ───────── */}
      <TutorialGuide
        stepIndex={1}
        title="Explora y crea una categoría"
        description="Ya tienes 16 categorías colombianas cargadas automáticamente. Revísalas — cubren los gastos más comunes. Si necesitas una personalizada, créala ahora."
        tips={[
          'Ya tienes: <b>Alimentación, Transporte, Arriendo, Salud, Entretenimiento</b> y más',
          '<b>Tipo Egreso</b> = gastos que salen de tu bolsillo · <b>Tipo Ingreso</b> = plata que entra',
          'El <b>color</b> aparecerá en gráficas y reportes — escoge uno que identifiques fácilmente',
          '¿Todo bien? Crea una categoría extra o simplemente avanza al siguiente paso',
        ]}
        action={
          <button onClick={() => setModal(true)} className="btn-primary gap-2">
            <Plus size={15} strokeWidth={2} /> Crear categoría personalizada
          </button>
        }
      />

      <div className="page-body space-y-8 md:space-y-10">
        {loading && <Loading />}
        {err && <ErrorBox message={err} />}

        {!loading && (
          <>
            <Section
              titulo="Ingresos"
              icono={<ArrowDownLeft size={16} strokeWidth={1.5} />}
              color="sage"
              items={ingresos}
              onDelete={handleDelete}
            />
            <Section
              titulo="Egresos"
              icono={<ArrowUpRight size={16} strokeWidth={1.5} />}
              color="rust"
              items={egresos}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>

      <CategoriaModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={handleSaved}
      />
    </>
  );
}

function Section({ titulo, icono, color, items, onDelete }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className={`p-1.5 rounded-sm bg-${color}/10 text-${color}`}>{icono}</span>
        <h2 className="font-display text-2xl tracking-tightest">{titulo}</h2>
        <div className="h-px flex-1 bg-ink/10" />
        <span className="num text-sm text-ink/50">{String(items.length).padStart(2,'0')}</span>
      </div>
      {items.length === 0 ? (
        <Empty title={`Sin categorías de ${titulo.toLowerCase()}`} hint="Agrega una para comenzar." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map(c => (
            <div
              key={c.id}
              className="card-elevated p-4 flex items-center gap-3 group hover:border-ink/30 transition-colors"
            >
              <span className="w-2 h-10 rounded-sm" style={{ background: c.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.nombre}</div>
                <div className="eyebrow mt-0.5">{c.tipo}</div>
              </div>
              <button
                onClick={() => onDelete(c.id)}
                className="text-ink/30 hover:text-rust opacity-0 group-hover:opacity-100 transition-opacity p-1"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CategoriaModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'egreso', color: COLORES[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setForm({ nombre: '', tipo: 'egreso', color: COLORES[0] }); setError(null); }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await api.createCategoria(form);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Nueva categoría" title="Crear etiqueta">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label">Nombre</label>
          <input
            className="input" required autoFocus
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Suscripciones"
          />
        </div>

        <div>
          <label className="label">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, tipo: 'ingreso' })}
              className={`flex items-center justify-center gap-2 py-3 border rounded-sm
                ${form.tipo === 'ingreso' ? 'border-sage bg-sage/10 text-sage' : 'border-ink/15 text-ink/60'}`}
            >
              <ArrowDownLeft size={15} strokeWidth={1.5} />
              <span className="text-sm font-medium">Ingreso</span>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, tipo: 'egreso' })}
              className={`flex items-center justify-center gap-2 py-3 border rounded-sm
                ${form.tipo === 'egreso' ? 'border-rust bg-rust/10 text-rust' : 'border-ink/15 text-ink/60'}`}
            >
              <ArrowUpRight size={15} strokeWidth={1.5} />
              <span className="text-sm font-medium">Egreso</span>
            </button>
          </div>
        </div>

        <div>
          <label className="label">Color identificador</label>
          <div className="flex flex-wrap gap-2">
            {COLORES.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`w-9 h-9 rounded-sm transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-ink' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
