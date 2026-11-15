import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, type Centre } from '../api';
import { Field, Modal } from '../components/Modal';

interface Draft {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  acceptedMaterials: string;
  notes: string;
  isVerified: boolean;
}

const emptyDraft: Draft = {
  name: '',
  address: '',
  latitude: '2.2878',
  longitude: '111.8305',
  openingHours: '',
  acceptedMaterials: '',
  notes: '',
  isVerified: false,
};

function toDraft(centre: Centre): Draft {
  return {
    name: centre.name,
    address: centre.address,
    latitude: String(centre.latitude),
    longitude: String(centre.longitude),
    openingHours: centre.openingHours ?? '',
    acceptedMaterials: centre.acceptedMaterials.join(', '),
    notes: centre.notes ?? '',
    isVerified: centre.isVerified,
  };
}

export default function Centres() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Centre | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { centres: rows } = await api<{ centres: Centre[] }>('/api/admin/centres');
      setCentres(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load centres');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return centres;
    return centres.filter(
      (centre) =>
        centre.name.toLowerCase().includes(needle) ||
        centre.address.toLowerCase().includes(needle) ||
        centre.acceptedMaterials.some((material) => material.toLowerCase().includes(needle)),
    );
  }, [centres, query]);

  function openNew() {
    setDraft(emptyDraft);
    setFormError(null);
    setEditing('new');
  }

  function openEdit(centre: Centre) {
    setDraft(toDraft(centre));
    setFormError(null);
    setEditing(centre);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setFormError('Latitude must be between -90 and 90.');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setFormError('Longitude must be between -180 and 180.');
      return;
    }

    const payload = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      latitude,
      longitude,
      openingHours: draft.openingHours.trim() || null,
      acceptedMaterials: draft.acceptedMaterials
        .split(',')
        .map((material) => material.trim())
        .filter(Boolean),
      notes: draft.notes.trim() || null,
      isVerified: draft.isVerified,
    };

    setBusy(true);
    try {
      if (editing === 'new') {
        await api('/api/admin/centres', { method: 'POST', body: JSON.stringify(payload) });
      } else if (editing) {
        await api(`/api/admin/centres/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save centre');
    } finally {
      setBusy(false);
    }
  }

  async function remove(centre: Centre) {
    if (!window.confirm(`Remove "${centre.name}"? The mobile app will stop showing it after its next sync.`)) {
      return;
    }
    try {
      await api(`/api/admin/centres/${centre.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete centre');
    }
  }

  async function toggleVerified(centre: Centre) {
    try {
      await api(`/api/admin/centres/${centre.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isVerified: !centre.isVerified }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update centre');
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Recycling centres</h1>
          <p className="muted">Verified Sibu drop-off points shown on the app map.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          Add centre
        </button>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search name, address or material…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search centres"
          />
          <span className="muted count">
            {visible.length} of {centres.length}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Centre</th>
                <th>Accepts</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((centre) => (
                <tr key={centre.id}>
                  <td>
                    <strong>{centre.name}</strong>
                    <small className="block">{centre.address}</small>
                    {centre.openingHours && <small className="block muted">{centre.openingHours}</small>}
                  </td>
                  <td>
                    <div className="chips">
                      {centre.acceptedMaterials.slice(0, 4).map((material) => (
                        <span className="chip" key={material}>
                          {material}
                        </span>
                      ))}
                      {centre.acceptedMaterials.length > 4 && (
                        <span className="chip">+{centre.acceptedMaterials.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className={`badge badge-toggle ${centre.isVerified ? 'badge-verified' : 'badge-pending'}`}
                      onClick={() => void toggleVerified(centre)}
                      title="Toggle verified"
                    >
                      {centre.isVerified ? 'Verified' : 'Needs review'}
                    </button>
                  </td>
                  <td className="right">
                    <button className="btn btn-quiet" onClick={() => openEdit(centre)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => void remove(centre)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    No centres match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Add recycling centre' : 'Edit recycling centre'}
          onClose={() => setEditing(null)}
        >
          <form className="modal-body" onSubmit={submit}>
            {formError && <div className="alert">{formError}</div>}

            <Field label="Name">
              <input
                required
                minLength={2}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Tzu-Chi Recycling Centre"
              />
            </Field>

            <Field label="Address">
              <input
                required
                minLength={5}
                value={draft.address}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                placeholder="Jalan Kampung Nyabor, 96000 Sibu"
              />
            </Field>

            <div className="field-row">
              <Field label="Latitude">
                <input
                  required
                  inputMode="decimal"
                  value={draft.latitude}
                  onChange={(event) => setDraft({ ...draft, latitude: event.target.value })}
                />
              </Field>
              <Field label="Longitude">
                <input
                  required
                  inputMode="decimal"
                  value={draft.longitude}
                  onChange={(event) => setDraft({ ...draft, longitude: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Opening hours" hint="Leave blank if unknown.">
              <input
                value={draft.openingHours}
                onChange={(event) => setDraft({ ...draft, openingHours: event.target.value })}
                placeholder="Mon-Sat 08:00-17:00"
              />
            </Field>

            <Field label="Accepted materials" hint="Comma separated.">
              <input
                value={draft.acceptedMaterials}
                onChange={(event) => setDraft({ ...draft, acceptedMaterials: event.target.value })}
                placeholder="Paper, Plastic bottles, Aluminium cans"
              />
            </Field>

            <Field label="Notes">
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Sort items before drop-off."
              />
            </Field>

            <label className="check">
              <input
                type="checkbox"
                checked={draft.isVerified}
                onChange={(event) => setDraft({ ...draft, isVerified: event.target.checked })}
              />
              <span>Verified by the council — safe to route users here</span>
            </label>

            <footer className="modal-foot">
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save centre'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
