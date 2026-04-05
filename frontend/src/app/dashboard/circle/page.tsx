"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getContacts, addContact, deleteContact } from "@/lib/api";
import { UserPlus, Trash2, Phone, Heart } from "lucide-react";

export default function CirclePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("gg_user_id");
    if (!id) { router.push("/"); return; }
    const uid = Number(id);
    setUserId(uid);
    getContacts(uid).then(setContacts);
  }, []);

  const add = async () => {
    if (!userId || !form.name || !form.phone) return;
    setLoading(true);
    try {
      await addContact(userId, form);
      const updated = await getContacts(userId);
      setContacts(updated);
      setForm({ name: "", phone: "", relation: "" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (contactId: number) => {
    if (!userId) return;
    await deleteContact(userId, contactId);
    setContacts((c) => c.filter((x) => x.id !== contactId));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-2">Trusted Circle</h1>
      <p className="text-white/40 text-sm mb-8">Доверенные контакты получат SOS-уведомление при критическом риске</p>

      {/* Contacts list */}
      <div className="space-y-3 mb-8">
        {contacts.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-white/20 text-sm">
            Добавьте первый контакт
          </div>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm">
                {c.name[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{c.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-white/40 flex items-center gap-1"><Phone size={10} />{c.phone}</span>
                  {c.relation && <span className="text-xs text-white/30 flex items-center gap-1"><Heart size={10} />{c.relation}</span>}
                </div>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="text-white/20 hover:text-rose-400 transition p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add form */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <UserPlus size={15} className="text-indigo-400" /> Добавить контакт
        </h2>
        <div className="space-y-3">
          {[
            { key: "name", label: "Имя", placeholder: "Мама" },
            { key: "phone", label: "Телефон", placeholder: "+7 777 123 45 67" },
            { key: "relation", label: "Кем приходится", placeholder: "Мама, партнёр, друг..." },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-white/40 mb-1 block">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition placeholder-white/20"
              />
            </div>
          ))}
          <button
            onClick={add}
            disabled={loading || !form.name || !form.phone}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? "Добавляю..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}
