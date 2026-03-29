import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export function IsraelPostButton({ onClick }) {
  return (
    <Button
      onClick={onClick}
      className="group relative overflow-hidden bg-blue-600 hover:bg-blue-600 text-white min-h-[44px]"
      size="lg"
    >
      <span className="mr-8 transition-opacity duration-500 group-hover:opacity-0">
        📮 Israel Post
      </span>
      <i className="absolute right-1 top-1 bottom-1 rounded-sm z-10 grid w-1/4 place-items-center transition-all duration-500 bg-white/15 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95">
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </i>
    </Button>
  );
}
