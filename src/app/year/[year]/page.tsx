import { redirect } from "next/navigation";

type YearPageProps = {
  params: Promise<{
    year: string;
  }>;
};

export default async function YearPage({ params }: YearPageProps) {
  const { year: rawYear } = await params;
  const year = Number(rawYear);

  if (!Number.isInteger(year) || year < 1888 || year > 2100) {
    redirect("/awards");
  }

  redirect(`/awards?year=${year}`);
}
