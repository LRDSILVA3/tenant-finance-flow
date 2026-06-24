
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UpgradeBadgeProps {
  feature?: string;
  className?: string;
}

export const UpgradeBadge = React.forwardRef<HTMLDivElement, UpgradeBadgeProps>(
  ({ feature, className }, ref) => {
    const { isSubscriptionActive } = useFeatureAccess();

    if (isSubscriptionActive) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              ref={ref}
              variant="secondary"
              className={`ml-2 cursor-help gap-1 bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 ${className}`}
            >
              <Lock className="h-3 w-3" />
              Upgrade
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Este recurso requer uma assinatura ativa.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
UpgradeBadge.displayName = "UpgradeBadge";
