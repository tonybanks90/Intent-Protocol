import { useEffect, useState } from "react";
import { RELAYER_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity } from "lucide-react";

export function RelayerStatus() {
    const [status, setStatus] = useState<"ok" | "error" | "loading">("loading");
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch(`${RELAYER_URL}/health`);
                if (res.ok) {
                    setStatus("ok");
                } else {
                    setStatus("error");
                    setErrorMessage(`HTTP ${res.status}`);
                }
            } catch (e) {
                setStatus("error");
                setErrorMessage("Connection refused");
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    if (status === "loading") return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <Badge variant={status === "ok" ? "outline" : "destructive"} className="gap-2">
                        <Activity className="h-3 w-3" />
                        {status === "ok" ? "Relayer Active" : "Relayer Offline"}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{status === "ok" ? `Connected to ${RELAYER_URL}` : `Failed to connect to ${RELAYER_URL}. ${errorMessage}`}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
