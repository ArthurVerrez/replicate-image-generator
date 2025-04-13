import { ImagePlayground } from "@/components/ImagePlayground";
import { getRandomSuggestions } from "@/lib/suggestions";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div>
      <div className="flex justify-end p-4">
        <LogoutButton />
      </div>
      <ImagePlayground suggestions={getRandomSuggestions()} />
    </div>
  );
}
