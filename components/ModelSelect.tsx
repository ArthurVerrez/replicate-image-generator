import { Card, CardContent } from "@/components/ui/card";
import { ProviderKey } from "@/lib/provider-config";
import { cn } from "@/lib/utils";
import { ProviderTiming } from "@/lib/image-types";
import { ImageDisplay } from "./ImageDisplay";

interface ModelSelectProps {
  label: string;
  models: string[];
  value: string;
  providerKey: ProviderKey;
  onChange: (value: string, providerKey: ProviderKey) => void;
  iconPath: string;
  color: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  image: string | null | undefined;
  timing?: ProviderTiming;
  failed?: boolean;
  modelId: string;
}

export function ModelSelect({
  enabled = true,
  image,
  timing,
  failed,
  modelId,
  providerKey,
}: ModelSelectProps) {
  return (
    <Card
      className={cn(`w-full transition-opacity`, enabled ? "" : "opacity-50")}
    >
      <CardContent className="pt-6 h-full">
        <ImageDisplay
          modelId={modelId}
          provider={providerKey}
          image={image}
          timing={timing}
          failed={failed}
        />
      </CardContent>
    </Card>
  );
}
