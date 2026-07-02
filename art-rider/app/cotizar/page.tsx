import { getEventTypes, getVenueTypes, getActivityTypes } from "@/services/advisoryService";
import WizardClient from "./WizardClient";

export const metadata = {
  title: "Cotizar Evento | ArtRider",
  description: "Dinos qué evento tienes en mente y nosotros nos encargamos de los equipos técnicos.",
};

export default async function CotizarPage() {
  // Fetch catalogs for the wizard in parallel
  const [eventTypes, venueTypes, activityTypes] = await Promise.all([
    getEventTypes(),
    getVenueTypes(),
    getActivityTypes(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-24 pb-12">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <WizardClient 
          eventTypes={eventTypes} 
          venueTypes={venueTypes} 
          activityTypes={activityTypes} 
        />
      </div>
    </div>
  );
}
