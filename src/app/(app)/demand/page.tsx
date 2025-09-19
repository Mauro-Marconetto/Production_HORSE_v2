import { demands, pieces, clients } from "@/lib/data";
import DemandClientPage from "./demand-client";

export default function DemandPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <DemandClientPage
        initialDemands={demands}
        pieces={pieces}
        clients={clients}
      />
    </main>
  );
}
