import { APP_LIMITS } from "@/lib/constants";
import type { RegisteredUsageSummary } from "@/lib/types/app";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type UsageSummaryCardProps = {
  usage: RegisteredUsageSummary;
};

export function UsageSummaryCard({ usage }: UsageSummaryCardProps) {
  const limit = usage.bytes_limit ?? APP_LIMITS.registered.dailyQuotaBytes;
  const value = limit === 0 ? 0 : Math.min(Math.round((usage.bytes_used / limit) * 100), 100);

  return (
    <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-ambient backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Tagesverbrauch</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Heute schon {formatBytes(usage.bytes_used)} von {formatBytes(limit)} verbraucht
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Zurueckgesetzt seit {formatDateTime(usage.window_started_at)}. Uploads heute: {usage.uploads_used}.
          </p>
        </div>
        <div className="min-w-56 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right text-sm text-muted-foreground">
          <div className="text-lg font-semibold text-white">{value}%</div>
          <div>Noch {formatBytes(Math.max(limit - usage.bytes_used, 0))} frei</div>
        </div>
      </div>
      <div className="mt-5">
        <Progress value={value} />
      </div>
    </div>
  );
}