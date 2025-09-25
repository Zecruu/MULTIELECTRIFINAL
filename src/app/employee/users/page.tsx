"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { Me } from "@/lib/auth";

type User = { id: string; name: string; email: string; role: "admin"|"employee"; status: "Active"|"Inactive"; lastLogin?: string };

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<User | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  async function load() {
    const meRes = await fetch("/api/employee/me").then(r=>r.json());
    setMe(meRes.me as Me);
    const j = await fetch("/api/users").then(r=>r.json());
    setRows(j.users||[]);
  }
  useEffect(()=>{ load(); },[]);

  function Form({ user, onSaved }: { user?: Partial<User>; onSaved: ()=>void }) {
    const [v, setV] = useState<Partial<User>>(user||{ role:"employee", status:"Active" });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string| null>(null);
    function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
      const { name, value } = e.target; setV(p=>({ ...p, [name]: value }));
    }
    async function onSubmit(e: React.FormEvent) {
      e.preventDefault(); setSaving(true); setErr(null);
      try {
        const method = v.id ? "PATCH" : "POST";
        const url = "/api/users";
        const body = v.id ? { id: v.id, name: v.name, email: v.email, role: v.role, status: v.status } : { name: v.name, email: v.email, role: v.role, status: v.status };
        const res = await fetch(url, { method, headers:{"content-type":"application/json"}, body: JSON.stringify(body)});
        if (!res.ok) throw new Error("save failed");
        onSaved();
        setOpen(false);
      } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
      finally { setSaving(false); }
    }
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input name="name" value={v.name||""} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input name="email" value={v.email||""} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select name="role" value={v.role||"employee"} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select name="status" value={v.status||"Active"} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={()=>setOpen(false)} className="rounded-md px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700">Cancel</button>
          <button disabled={saving} className="rounded-md px-3 py-2 text-sm font-semibold bg-[--gold] text-black hover:brightness-95 disabled:opacity-60">{saving?"Saving...":"Save"}</button>
        </div>
      </form>
    );
  }

  async function onDelete(id: string) {
    if (!confirm("Delete user?")) return;
    const res = await fetch(`/api/users?id=${id}`, { method:"DELETE" });
    if (res.ok) load();
  }

  const canManage = !!me?.permissions?.canManageUsers;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Users (Admin)</h1>
        {canManage && (
          <button onClick={()=>{ setEdit(null); setOpen(true); }} className="rounded-md bg-[--gold] text-black font-semibold py-2 px-3 hover:brightness-95">New User</button>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border border-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr className="text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last Login</th>
              {canManage && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.status}</td>
                <td className="px-3 py-2">{u.lastLogin?.slice(0,10) || "-"}</td>
                {canManage && (
                  <td className="px-3 py-2 space-x-2">
                    <button onClick={()=>{ setEdit(u); setOpen(true); }} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Edit</button>
                    <button onClick={()=>onDelete(u.id)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title={edit?"Edit User":"New User"}>
        <Form user={edit||undefined} onSaved={load} />
      </Modal>
    </div>
  );
}
