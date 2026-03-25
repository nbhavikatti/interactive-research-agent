"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { TabWorkspace } from "@/components/TabWorkspace";

type Phase = "analyzing" | "transitioning" | "ready";

export default function PaperWorkspacePage() {
  const params = useParams<{ id: string }>();
  const paperId = params.id;
  const [phase, setPhase] = useState<Phase>("analyzing");

  const handleAnalysisComplete = useCallback(() => {
    setPhase("transitioning");
    // Allow fade-out to finish before swapping to workspace
    setTimeout(() => setPhase("ready"), 500);
  }, []);

  if (phase !== "ready") {
    return (
      <div
        className={`transition-opacity duration-500 ${
          phase === "transitioning" ? "opacity-0" : "opacity-100"
        }`}
      >
        <AnalysisProgress onComplete={handleAnalysisComplete} />
      </div>
    );
  }

  return (
    <div className="h-screen animate-fade-in-workspace">
      <TabWorkspace paperId={paperId} />
    </div>
  );
}
