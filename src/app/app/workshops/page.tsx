import { NewWorkshop, WorkshopCard } from "@/components/WorkshopEditor";
import { requireOwner } from "@/lib/auth";
import { listWorkshops, workshopUsers } from "@/lib/repo";

export const metadata = { title: "Workshops" };

export default async function Workshops() {
  const s = await requireOwner();
  const [workshops, users] = await Promise.all([listWorkshops(s), workshopUsers(s)]);
  return (
    <div>
      <h1 className="text-3xl font-semibold">Workshops</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted">
        Name your workshops the way your team does. &ldquo;Handles&rdquo; tells the router which kinds of work go there.
        Each workshop login only ever sees that workshop&apos;s orders.
      </p>
      <div className="space-y-4">
        {workshops.map((w) => (
          <WorkshopCard key={w.id} w={w} users={users.filter((u) => u.workshop_id === w.id)} />
        ))}
        <NewWorkshop />
      </div>
    </div>
  );
}
