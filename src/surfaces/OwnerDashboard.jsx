import React, { useMemo, useState } from 'react';
import api from '../lib/api.js';
import endpoints from '../lib/endpoints.js';
import { discover, titleFor } from '../lib/discover.js';
import { useAsync } from '../lib/useAsync.js';
import Block from '../blocks/Block.jsx';
import RowEditor from '../blocks/RowEditor.jsx';
import { Spinner, ErrorBox, Empty, Modal } from '../ui/index.jsx';

/**
 * The owner's dashboard.
 *
 * The same discover() and the same block renderers as the public page, with
 * an Edit button in each heading. That is the entire difference between the
 * two surfaces, and it is why what the owner edits looks like what a customer
 * sees instead of being a second implementation that drifts.
 *
 * The section list is the owner's data. The *available* section list is the
 * live schema. Neither is in this repo, so a table added to the database
 * shows up here as something to fill in without a screen being written.
 */
export default function OwnerDashboard() {
  const me = useAsync(() => api.get(endpoints.session.me()), []);
  const schema = useAsync(() => api.get(endpoints.owner.schema()), []);
  const data = useAsync(() => api.get(endpoints.owner.sections()), []);

  const [editing, setEditing] = useState(null); // { table, row }
  const [adding, setAdding] = useState(null);   // table name
  const [saveError, setSaveError] = useState(null);

  const { blocks } = useMemo(() => discover(data.data), [data.data]);

  const present = useMemo(() => new Set(blocks.map((b) => b.key)), [blocks]);
  const available = useMemo(
    () => (schema.data?.tables || []).filter((t) => !present.has(t)).sort(),
    [schema.data, present]
  );

  const columnsFor = (table) => schema.data?.columns?.[table] || [];

  const save = async (table, row, patch) => {
    setSaveError(null);
    if (row?.id) await api.patch(endpoints.owner.update(table, row.id), patch);
    else await api.post(endpoints.owner.create(table), patch);
    setEditing(null);
    setAdding(null);
    await data.reload();
  };

  const remove = async (table, row) => {
    await api.del(endpoints.owner.remove(table, row.id));
    setEditing(null);
    await data.reload();
  };

  if (me.loading || data.loading) {
    return <div className="wrap stack" style={{ paddingTop: 24 }}><Spinner rows={4} /></div>;
  }

  if (me.error) {
    return <div className="wrap" style={{ paddingTop: 24 }}><ErrorBox error={me.error} onRetry={me.reload} /></div>;
  }

  if (me.data && me.data.hasAccess === false) {
    return (
      <div className="wrap" style={{ paddingTop: 24 }}>
        <Empty
          title="This account does not own a business yet."
          hint="Finish signing up, or accept an invite, and this page fills itself in."
        />
      </div>
    );
  }

  return (
    <div className="wrap stack" style={{ paddingTop: 24 }}>
      <div className="row wrap-row">
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{me.data?.name || me.data?.slug || 'Your business'}</h1>
        <span className="spacer" />
        {data.data?.via ? <span className="dim">{blocks.length} sections · via {data.data.via}</span> : null}
      </div>

      <ErrorBox error={data.error} onRetry={data.reload} />
      <ErrorBox error={saveError} />

      <div className="split">
        <div className="stack" style={{ gap: 34 }}>
          {blocks.length === 0 ? (
            <Empty title="Nothing filled in yet." hint="Pick a section on the right to start." />
          ) : (
            blocks.map((block) => (
              <div key={block.key} className="stack" style={{ gap: 8 }}>
                <Block
                  block={block}
                  actions={
                    <button className="btn sm ghost" onClick={() => setAdding(block.key)}>Add</button>
                  }
                />
                <div className="row wrap-row">
                  {block.rows.slice(0, 24).map((row, i) => (
                    <button
                      className="btn sm"
                      key={row.id ?? i}
                      onClick={() => setEditing({ table: block.key, row })}
                    >
                      Edit {String(row.name ?? row.title ?? row.item_name ?? row.question ?? `#${i + 1}`).slice(0, 24)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="rail stack" style={{ gap: 18 }}>
          <div>
            <div className="dim" style={{ marginBottom: 6 }}>Your sections</div>
            <nav className="toc">
              {blocks.map((b) => <a key={b.key} href={`#s-${b.key}`}>{b.title}</a>)}
            </nav>
          </div>

          <div>
            <div className="dim" style={{ marginBottom: 6 }}>
              Add a section {schema.data ? `(${available.length} available)` : ''}
            </div>
            <ErrorBox error={schema.error} onRetry={schema.reload} />
            <div style={{ maxHeight: 300, overflow: 'auto' }} className="toc">
              {available.map((t) => (
                <button className="btn sm ghost" key={t} style={{ justifyContent: 'flex-start' }}
                        onClick={() => setAdding(t)}>
                  + {titleFor(t)}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {editing ? (
        <Modal title={`Edit ${titleFor(editing.table)}`} onClose={() => setEditing(null)}>
          <RowEditor
            table={editing.table}
            row={editing.row}
            schemaColumns={columnsFor(editing.table)}
            onSave={(patch) => save(editing.table, editing.row, patch)}
            onDelete={editing.row?.id ? () => remove(editing.table, editing.row) : null}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {adding ? (
        <Modal title={`New ${titleFor(adding)}`} onClose={() => setAdding(null)}>
          <RowEditor
            table={adding}
            row={{}}
            schemaColumns={columnsFor(adding)}
            onSave={(patch) => save(adding, null, patch)}
            onCancel={() => setAdding(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
