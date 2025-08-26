import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Source } from "@shared/schema";
import { ChevronDown, ChevronUp, BookOpen, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SourceCitationProps {
  sources: Source[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const toggleSource = (index: number) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSources(newExpanded);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (similarity >= 0.8) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
  };

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-3"
    >
      <Card className="p-4" data-testid="sources-container">
        <div className="flex items-center mb-3">
          <BookOpen className="w-4 h-4 text-primary mr-2" />
          <h4 className="text-sm font-medium">
            Sources ({sources.length})
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2 p-0 h-4 w-4">
                  <Info className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Similarity scores show how closely each source matches your question. 
                  Higher scores (closer to 1.0) indicate more relevant content.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-3">
          {sources.map((source, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
            >
              <Card
                className="border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => toggleSource(index)}
                data-testid={`source-${index}`}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-primary" data-testid={`source-title-${index}`}>
                          {source.title}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        {source.page && (
                          <>
                            <span className="text-xs text-muted-foreground" data-testid={`source-page-${index}`}>
                              Page {source.page}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                          </>
                        )}
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded ${getSimilarityColor(source.similarity)}`}
                          data-testid={`source-similarity-${index}`}
                        >
                          {source.similarity.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`source-snippet-${index}`}>
                        {source.snippet}
                      </p>
                    </div>
                    
                  </div>

                  
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
