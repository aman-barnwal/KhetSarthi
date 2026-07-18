import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { PageHeader, EmptyState, SkeletonCard, btnSecondary } from "../components/Shared";
import { Bell, CheckCircle } from "@phosphor-icons/react";

const TYPE_COLOR = { demand_match: "#D69F39", supply_match: "#2D6A4F", enquiry: "#457B9D", enquiry_update: "#457B9D", weather: "#C85A32" };

export default function Notifications() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  const load = () => api.get("/notifications").then(({ data }) => setItems(data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.patch("/notifications/read-all"); load(); };
  const open = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n.id}`);
    if (n.link) navigate(n.link); else load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("notifications")}
        action={<button onClick={markAll} className={btnSecondary} data-testid="notifications-markall-btn"><CheckCircle size={16} />{t("mark_all_read")}</button>} />
      {items === null ? <SkeletonCard lines={4} /> : items.length === 0 ? (
        <EmptyState icon={Bell} title={t("no_data")} subtitle={t("no_notifications")} />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button onClick={() => open(n)} data-testid={`notification-${n.id}`}
                className={`w-full text-left bg-white rounded-xl border p-4 flex gap-3 transition-colors hover:bg-[#F9F6F0] ${n.read ? "border-[#0F3821]/5 opacity-70" : "border-[#0F3821]/15"}`}>
                <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: n.read ? "#c9c2b2" : TYPE_COLOR[n.type] || "#0F3821" }} />
                <div>
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-[#4A5D51]">{n.body}</p>
                  <p className="text-xs text-[#7C8D81] mt-1">{n.created_at?.slice(0, 16).replace("T", " ")}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
