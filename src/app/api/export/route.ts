import { withSession } from "@/lib/api";
import { exportCsv } from "@/lib/repo";

export const GET = withSession(async (s) => {
  const csv = await exportCsv(s);
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
