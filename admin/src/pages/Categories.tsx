import { useEffect, useState, type FormEvent } from 'react';
import { api, type Category, type DisposalMethod } from '../api';
import { Field, Modal } from '../components/Modal';

const METHODS: DisposalMethod[] = ['recycle', 'compost', 'general', 'special'];

const METHOD_HINT: Record<DisposalMethod, string> = {
  recycle: 'Sent to a Sibu drop-off point',
  compost: 'Home composting — no public compost bins in Sibu',
  general: 'Council general waste collection',
  special: 'E-waste, batteries, oil — needs a dedicated drop-off',
};

interface Draft {
  name: string;
  disposalMethod: DisposalMethod;
  description: string;
  sortOrder: string;
}

const emptyDraft: Draft = {
  name: '',
  disposalMethod: 'recycle',
  description: '',
  sortOrder: '',
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { categories: rows } = await api<{ categories: Category[] }>('/api/admin/categories');
      setCategories(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load categories');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openNew() {
    setDraft(emptyDraft);
    setFormError(null);
    setEditing('new');
  }

  function openEdit(category: Category) {
    setDraft({
      name: category.name,
      disposalMethod: category.disposalMethod,
      description: category.description ?? '',
      sortOrder: String(category.sortOrder),
    });
    setFormError(null);
    setEditing(category);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const payload = {
      name: draft.name.trim(),
      disposalMethod: draft.disposalMethod,
      description: draft.description.trim() || null,
      ...(draft.sortOrder.trim() ? { sortOrder: Number(draft.sortOrder) } : {}),
    };

    setBusy(true);
    try {
      if (editing === 'new') {
        await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
      } else if (editing) {
        await api(`/api/admin/categories/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save category');
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete "${category.name}"? Existing pantry items keep their saved method.`)) return;
    try {
      await api(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete category');
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Item categories</h1>
          <p className="muted">The disposal advice the app shows for each kind of waste.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          Add category
        </button>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Disposal method</th>
                <th className="right">Order</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <strong>{category.name}</strong>
                    {category.description && <small className="block muted">{category.description}</small>}
                  </td>
                  <td>
                    <span className={`badge badge-${category.disposalMethod}`}>
                      {category.disposalMethod}
                    </span>
                  </td>
                  <td className="right muted">{category.sortOrder}</td>
                  <td className="right">
                    <button className="btn btn-quiet" onClick={() => openEdit(category)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => void remove(category)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    No categories yet. Add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Add item category' : 'Edit item category'}
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
                placeholder="Plastic bottles (PET)"
              />
            </Field>

            <Field label="Disposal method" hint={METHOD_HINT[draft.disposalMethod]}>
              <select
                value={draft.disposalMethod}
                onChange={(event) =>
                  setDraft({ ...draft, disposalMethod: event.target.value as DisposalMethod })
                }
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Advice shown in the app">
              <textarea
                rows={3}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="Rinse, remove cap, flatten."
              />
            </Field>

            <Field label="Sort order" hint="Leave blank to place it last.">
              <input
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
                placeholder="40"
              />
            </Field>

            <footer className="modal-foot">
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save category'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
