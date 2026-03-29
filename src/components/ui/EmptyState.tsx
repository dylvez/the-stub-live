import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface EmptyStateProps {
  image?: string;
  title: string;
  description?: string;
  action?: { label: string; to?: string; onClick?: () => void };
}

export function EmptyState({ image, title, description, action }: EmptyStateProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
      {image && <img src={image} alt="" className="w-32 h-32 opacity-80" />}
      <div>
        <p className="font-display font-semibold text-stub-text">{title}</p>
        {description && <p className="text-sm text-stub-muted mt-1">{description}</p>}
      </div>
      {action && (
        <Button
          variant="secondary"
          onClick={action.onClick ?? (action.to ? () => navigate(action.to!) : undefined)}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
