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
    console.log("Current user:", meRes.me);
    console.log("Can manage users:", meRes.me?.permissions?.canManageUsers);
    setMe(meRes.me as Me);
    const j = await fetch("/api/admin/users").then(r=>r.json());
    setRows(j.users||[]);
  }
  useEffect(()=>{ load(); },[]);

  function Form({ user, onSaved }: { user?: Partial<User>; onSaved: ()=>void }) {
    const [v, setV] = useState<Partial<User>>(user||{ role:"employee", status:"Active" });
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string| null>(null);
    const isNew = !v.id;

    function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
      const { name, value } = e.target; setV(p=>({ ...p, [name]: value }));
    }

    async function onSubmit(e: React.FormEvent) {
      e.preventDefault(); setSaving(true); setErr(null);

      // Validation
      if (!v.name || !v.email || !v.role) {
        setErr("Please fill all required fields");
        setSaving(false);
        return;
      }

      if (isNew) {
        if (!password) {
          setErr("Password is required for new users");
          setSaving(false);
          return;
        }
        if (password !== passwordConfirm) {
          setErr("Passwords do not match");
          setSaving(false);
          return;
        }
        if (password.length < 6) {
          setErr("Password must be at least 6 characters");
          setSaving(false);
          return;
        }
      }

      try {
        const method = v.id ? "PATCH" : "POST";
        const url = "/api/admin/users";
        const body = v.id
          ? { id: v.id, name: v.name, email: v.email, role: v.role, status: v.status }
          : { name: v.name, email: v.email, role: v.role, password };
        const res = await fetch(url, { method, headers:{"content-type":"application/json"}, body: JSON.stringify(body)});
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Save failed");
        }
        onSaved();
        setOpen(false);
      } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
      finally { setSaving(false); }
    }
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Name <span className="text-red-400">*</span></label>
            <input
              name="name"
              value={v.name||""}
              onChange={onChange}
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email <span className="text-red-400">*</span></label>
            <input
              name="email"
              type="email"
              value={v.email||""}
              onChange={onChange}
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>
          {isNew && (
            <>
              <div>
                <label className="block text-sm mb-1">Password <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm Password <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm mb-1">Role <span className="text-red-400">*</span></label>
            <select
              name="role"
              value={v.role||"employee"}
              onChange={onChange}
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
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
    const res = await fetch(`/api/admin/users?id=${id}`, { method:"DELETE" });
    if (res.ok) load();
  }

  const canManage = !!me?.permissions?.canManageUsers || me?.role === "admin";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Users (Admin)</h1>
        {canManage && (
          <button
            onClick={()=>{ setEdit(null); setOpen(true); }}
            className="rounded-md bg-[--gold] text-black font-semibold py-2 px-4 hover:brightness-95 transition"
          >
            + Add Employee
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border border-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr className="text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              {canManage && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    u.role === "admin" ? "bg-[--gold] text-black" : "bg-neutral-700 text-white"
                  }`}>
                    {u.role === "admin" ? "Admin" : "Employee"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-900 text-green-200">
                    {u.status}
                  </span>
                </td>
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
      <Modal open={open} onClose={()=>setOpen(false)} title={edit ? "Edit Employee" : "Add New Employee"}>
        <Form user={edit||undefined} onSaved={()=>{ load(); setOpen(false); }} />
      </Modal>
    </div>
  );
}
