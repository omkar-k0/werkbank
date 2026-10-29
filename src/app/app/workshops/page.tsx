import { NewWorkshop, WorkshopCard } from "@/components/WorkshopEditor";
import { requireOwner } from "@/lib/auth";
import { getT, titleOf } from "@/lib/i18n/server";
import { getShop, listWorkshops, workshopUsers } from "@/lib/repo";

export const generateMetadata = () => titleOf("workshops.title");

export default async function Workshops() {
  const s = await requireOwner();
  const { t } = await getT();
  const [workshops, users, shop] = await Promise.all([listWorkshops(s), workshopUsers(s), getShop(s)]);
  return (
    <div>
      <h1 className="text-3xl font-semibold">{t("workshops.title")}</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted">
        {t("workshops.lead")}
      </p>
      <div className="space-y-4">
        {workshops.map((w) => (
          <WorkshopCard key={w.id} w={w} shopName={shop.name} users={users.filter((u) => u.workshop_id === w.id)} />
        ))}
        <NewWorkshop />
      </div>
    </div>
  );
}
