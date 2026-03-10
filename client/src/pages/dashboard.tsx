import { Layout } from "@/components/layout";
import { MapView } from "@/components/map-view";

export default function Dashboard() {
  return (
    <Layout>
      <div className="w-full h-full relative">
        <MapView />
      </div>
    </Layout>
  );
}
