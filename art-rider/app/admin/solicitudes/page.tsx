import { getAdvisoryRequests } from "@/services/adminService";
import SolicitudesClient from "./SolicitudesClient";

export default async function SolicitudesPage() {
  const requests = await getAdvisoryRequests();
  return <SolicitudesClient requests={requests} />;
}
