"use client";

import { useParams } from "next/navigation";
import ListDetailView from "@/components/list/ListDetailView";

export const dynamic = "force-dynamic";

export default function ListDetailPage() {
  const params = useParams<{ listId: string }>();
  const listId = params?.listId ?? "";

  return <ListDetailView listId={listId} variant="route" />;
}
