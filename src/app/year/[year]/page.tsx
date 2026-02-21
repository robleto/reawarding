import { redirect } from "next/navigation";

type YearPageProps = {
  params: {
    year: string;
  };
};

export default function YearPage({ params }: YearPageProps) {
  const rawYear = params.year;
  const year = Number(rawYear);

  if (!Number.isInteger(year) || year < 1888 || year > 2100) {
    redirect("/awards");
  }

  redirect(`/awards?year=${year}`);
}
